OTSpeech = (options) => {
  const config = Object.assign({
    numberOfActiveSpeakers: 2, // Maximum Number of Active Speaker (which video should be shown)

    voiceLevelThreshold: 0.5, // Threshold for Voice Detection
    consecutiveVoiceMs: 1000, // Minimum amount of consecutive voice (ms) before the speaker is considered in a speech
    consecutiveSilenceMs: 2000, // Minimum amount of consecutive silence (ms) before speaker is considered out of speech

    audioLevelPreviousWeight: 0.7, // previous value weightage for moving average computation
    audioLevelCurrentWeight: 0.3, // current value weightage for moving average computation
  }, options);

  const channels = {};
  let currentSpeakerOrder = [];
  let positions = [];
  let onActiveSpeakerChangeListener = null;

  const isVoice = (maLevel) => {
    let logLevel = (Math.log(maLevel) / Math.LN10) / 1.5 + 1;
    logLevel = Math.min(Math.max(logLevel, 0), 1);
    return logLevel > config.voiceLevelThreshold;
  };

  const getOrderedChannels = () => Object.keys(channels)
    .sort((a, b) => {
      if (channels[a].pinned && !(channels[b].pinned)) {
        // Pinned speaker A is in front
        return -1;
      } else if (!(channels[a].pinned) && channels[b].pinned) {
        // Pinned speaker B is in front
        return 1;
      } else if (channels[a].inSpeech && channels[b].inSpeech) {
        if (channels[a].speechStart !== channels[b].speechStart) {
          // Whichever starts first in front
          return channels[a].speechStart - channels[b].speechStart;
        } else {
          // Both starts at the same time, compare moving average audio level
          return channels[b].movingAverageAudioLevel - channels[a].movingAverageAudioLevel; // Order from largest to smallest
        }
      } else if (channels[a].inSpeech && !(channels[b].inSpeech)) {
        // B behind A
        return -1;
      } else if (!(channels[a].inSpeech) && channels[b].inSpeech) {
        // A behind B
        return 1;
      } else {
        // Both also not in speech, compare moving average audio level
        return channels[b].movingAverageAudioLevel - channels[a].movingAverageAudioLevel; // Order from largest to smallest
      }
    })
    .map(channelId => ({
      ...channels[channelId],
      id: channelId,
      isSelf: channels[channelId].type === 'publisher',
    }));

  const getPositions = (newSpeakerOrder) => {
    const size = Math.min(config.numberOfActiveSpeakers, newSpeakerOrder.length);
    const newIds = newSpeakerOrder.map(speaker => speaker.id).slice(0, size);

    const availableSpeakers = Object.assign([], newIds);  // Clone array from new Ids
    const newPositions = availableSpeakers.map(() => null); // Create array of same size with all values as null

    // Find stayed-on speakers to fill in new positions
    for (let i = 0; i < positions.length; i += 1) {
      const oldSpeakerId = positions[i];
      for (let j = 0; j < availableSpeakers.length; j += 1) {
        // Check if speaker exists
        if (availableSpeakers[j] === oldSpeakerId) {
          newPositions[i] = availableSpeakers[j];  // Update new position
          availableSpeakers[j] = null;  // Mark speaker as unavailable
          break;
        }
      }
    }

    // Fill remaing speakers
    const remainingSpeakers = availableSpeakers.filter(speaker => speaker != null);
    for (let i = 0; i < newPositions.length; i += 1) {
      if (newPositions[i] == null) {
        // Find available
        if (remainingSpeakers.length < 1) {
          console.error(`No remaining speakers to fill position at position [${i}]`);
          break;
        }

        // Fill new position with top remaining speaker
        const speakerId = remainingSpeakers.shift();
        newPositions[i] = speakerId;
      }
    }

    return newPositions;
  }

  const checkActiveSpeakerChange = () => {
    const newSpeakerOrder = getOrderedChannels(); // Get sorted speakers based on speech and moving average audio level
    const newPositions = getPositions(newSpeakerOrder); // Get updated speaker positions in the grid

    const newSize = Math.min(config.numberOfActiveSpeakers, newSpeakerOrder.length); // Get max length for slice (against max number of active speaker)
    const oldSize = Math.min(config.numberOfActiveSpeakers, currentSpeakerOrder.length); // Get max length for slice (against max number of active speaker)

    const newIds = newSpeakerOrder.map(speaker => speaker.id).slice(0, newSize).sort(); // Slice and sort to size
    const oldIds = currentSpeakerOrder.map(speaker => speaker.id).slice(0, oldSize).sort(); // Slice and sort to size

    const newIdsString = JSON.stringify(newIds); // For easy comparison
    const oldIdsString = JSON.stringify(oldIds); // For easy comparison

    // Run only if there are changes in active speaker list
    if (newIdsString !== oldIdsString) {
      // Callback
      if (onActiveSpeakerChangeListener != null) {
        onActiveSpeakerChangeListener(newSpeakerOrder, newPositions);
      }
    }

    // Update position and speaker order
    positions = newPositions;
    currentSpeakerOrder = newSpeakerOrder;
  };

  const getMovingAverage =  (previousMovingAverage, currentAudioLevel) => {
    if (previousMovingAverage == null || previousMovingAverage <= currentAudioLevel) {
      return currentAudioLevel;
    } else {
      return (config.audioLevelPreviousWeight * previousMovingAverage) + (config.audioLevelCurrentWeight * currentAudioLevel);
    }
  };

  const isSelfActiveSpeaker = () => {
    for (let i = 0; i < currentSpeakerOrder.length; i += 1) {
      const speaker = currentSpeakerOrder[i];
      if (speaker.isSelf) {
        return true;
      }
    }

    return false;
  };

  const addAudioLevel = (channelId, audioLevel) => {
    if (channelId == null) {
      return;
    }

    if(channels[channelId] == null) {
      console.log(`Channel ${channelId} does not exist`);
      return;
    }

    // Calculate Moving Average
    channels[channelId].movingAverageAudioLevel = getMovingAverage(channels[channelId].movingAverageAudioLevel, audioLevel);

    // Check for speech start
    const currentTime = new Date().getTime();
    const voiceDetected = isVoice(channels[channelId].movingAverageAudioLevel);

    if (voiceDetected) {
      // Voice Detected
      if (channels[channelId].speechStartTest === 0) {
        // Has not started test for start
        channels[channelId].speechStartTest = currentTime;
      } else if (channels[channelId].speechStartTest + config.consecutiveVoiceMs < currentTime) {
        // Speech started or within speech
        channels[channelId].inSpeech = true;
        channels[channelId].speechStartTest = 0;

        // Set Speech start time
        if (channels[channelId].speechStart === 0) {
          channels[channelId].speechStart = currentTime;
        }
      }

      // Reset First Silence
      channels[channelId].speechEndTest = 0;
    } else {
      // Silence Detected
      if (channels[channelId].speechEndTest === 0) {
        // Has not started test for end
        channels[channelId].speechEndTest = currentTime;
      } else if (channels[channelId].speechEndTest + config.consecutiveSilenceMs < currentTime) {
        // Speech ended
        channels[channelId].inSpeech = false;
        channels[channelId].speechEndTest = 0;

        // Reset Speech start time
        channels[channelId].speechStart = 0;
      }
      
      // Reset First Voice
      channels[channelId].speechStartTest = 0;
    }


    // Check Active Speaker Change
    checkActiveSpeakerChange();
  };

  const addPublisher = (publisher) => {
    console.log(`Adding Publisher ${publisher.id}`);
    channels[publisher.id] = {
      type: 'publisher',
      publisher,
      movingAverageAudioLevel: 0,
      speechStartTest: 0,
      speechEndTest: 0,
      inSpeech: false,
    }
  };

  const removePublisher = (publisher) => {
    console.log(`Removing Publisher ${publisher.id}`);
    delete channels[publisher.id];
  };

  const removePublisherByStreamId = (streamId) => {
    const publisher = getPublisherByStreamId(streamId);
    if (publisher != null) {
      removeSubscriber(publisher);
    }
  };

  const getPublisherByStreamId = (streamId) => {
    const channelIds = Object.keys(channels);
    for (let i = 0; i < channelIds.length; i += 1) {
      const channelId = channelIds[i];
      const channel = channels[channelId];

      if (channel.type === 'publisher') {
        const publisher = channel.publisher;
        const publisherStreamId = publisher.streamId;
        if (publisherStreamId === streamId) {
          return publisher;
        }
      }
    }

    return null;
  }

  const addSubscriber = (subscriber) => {
    console.log(`Adding Subscriber ${subscriber.id}`);
    channels[subscriber.id] = {
      type: 'subscriber',
      subscriber,
      movingAverageAudioLevel: 0,
      speechStartTest: 0,
      speechEndTest: 0,
      inSpeech: false,
      pinned: false,
    }
  };

  const removeSubscriber = (subscriber) => {
    console.log(`Removing Subscriber ${subscriber.id}`);
    delete channels[subscriber.id];
  };

  const removeSubscriberByStreamId = (streamId) => {
    const subscriber = getSubscriberByStreamId(streamId);
    if (subscriber != null) {
      removeSubscriber(subscriber);
    }
  };

  const getSubscriberByStreamId = (streamId) => {
    const channelIds = Object.keys(channels);
    for (let i = 0; i < channelIds.length; i += 1) {
      const channelId = channelIds[i];
      const channel = channels[channelId];

      if (channel.type === 'subscriber') {
        const subscriber = channel.subscriber;
        const subscriberStreamId = subscriber.stream.id;
        if (subscriberStreamId === streamId) {
          return subscriber;
        }
      }
    }

    return null;
  }

  const getChannels = () => channels;

  const setSpeakerPin = (channelId, pinned) => {
    if (channels[channelId] != null) {
      channels[channelId].pinned = pinned;
    }
  };

  const setOnActiveSpeakerChangeListener = (listener) => {
    onActiveSpeakerChangeListener = listener;
  };

  const setNumberOfActiveSpeakers = (value) => {
    console.log(`Setting Number of Active Speakers to ${value}`);
    config.numberOfActiveSpeakers = parseInt(value, 10);
  };

  const getNumberOfActiveSpeakers = () => config.numberOfActiveSpeakers;

  const setVoiceLevelThreshold = (value) => {
    console.log(`Setting Voice Level Threshold to ${value}`);
    config.voiceLevelThreshold = parseFloat(value);
  };

  return {
    addAudioLevel,
    getChannels,
    getOrderedChannels,
    setOnActiveSpeakerChangeListener,
    isSelfActiveSpeaker,
    setSpeakerPin,
    setNumberOfActiveSpeakers,
    getNumberOfActiveSpeakers,
    setVoiceLevelThreshold,

    addPublisher,
    removePublisher,
    removePublisherByStreamId,
    getPublisherByStreamId,

    addSubscriber,
    removeSubscriber,
    removeSubscriberByStreamId,
    getSubscriberByStreamId,
  };
};