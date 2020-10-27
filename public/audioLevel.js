OTSpeech = (options) => {
  const config = Object.assign({
    numberOfActiveSpeakers: 2, // Maximum Number of Active Speaker (which video should be shown)
    autoSubscription: true, // Automatically subscribe/unsubscribe to video with delay
    autoSubscriptionCallbackDelay: 1000, // Delay before calling callback (to allow time for subscription to stablize)
    unsubscribeDelay: 1000, // Delay before unsubscribing

    voiceLevelThreshold: 0.25, // Threshold for Voice Detection
    consecutiveVoiceMs: 500, // Minimum amount of consecutive voice (ms) before the speaker is considered in a speech
    consecutiveSilenceMs: 2000, // Minimum amount of consecutive silence (ms) before speaker is considered out of speech

    audioLevelPreviousWeight: 0.7, // previous value weightage for moving average computation
    audioLevelCurrentWeight: 0.3, // current value weightage for moving average computation
    audioLevelUpdateInterval: 100, // interval between updates of audio level in ms (lower = more real-time, higher = less cpu intensive)
  }, options);

  const channels = {};
  const rawAudioLevels = {};

  let currentSpeakerOrder = [];
  let positions = [];
  let mostActiveSpeakerId = null;

  let onActiveSpeakerChangeListener = null;
  let onMostActiveSpeakerChangeListener = null;

  // Set Interval to process audio level
  setInterval(() => {
    const channelIds = Object.keys(rawAudioLevels);
    for (let i = 0; i < channelIds.length; i += 1) {
      const channelId = channelIds[i];
      const rawAudioLevel = rawAudioLevels[channelId];

      // Update Audio Level
      processAudioLevel(channelId, rawAudioLevel);
    }
  }, config.audioLevelUpdateInterval);

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

        let aIndex = 1000; // Arbitrary large value, so that it is at the back
        for (let i = 0; i < currentSpeakerOrder.length; i += 1) {
          if (currentSpeakerOrder[i].id === a) {
            aIndex = i;
          }
        }

        let bIndex = 1001; // Arbitrary large value, so that it is at the back (larger than A default)
        for (let i = 0; i < currentSpeakerOrder.length; i += 1) {
          if (currentSpeakerOrder[i].id === b) {
            bIndex = i;
          }
        }

        return aIndex - bIndex; // Use previous order as sorted order
      }
    })
    .map(channelId => ({
      ...channels[channelId],
      id: channelId,
      audioLevel: channels[channelId].movingAverageAudioLevel,
    }));

  const getPositions = (newSpeakerOrder) => {
    const size = Math.min(config.numberOfActiveSpeakers, newSpeakerOrder.length);
    const newIds = newSpeakerOrder.map(speaker => speaker.id).slice(0, size);

    const availableSpeakers = Object.assign([], newIds);  // Clone array from new Ids
    let newPositions = availableSpeakers.map(() => null); // Create array of same size with all values as null

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
          break;
        }

        // Fill new position with top remaining speaker
        const speakerId = remainingSpeakers.shift();
        newPositions[i] = speakerId;
      }
    }

    newPositions = newPositions.filter(newPosition => newPosition != null);
    return newPositions;
  }

  const checkActiveSpeakerChange = (forceCallback = false) => {
    const newSpeakerOrder = getOrderedChannels(); // Get sorted speakers based on speech and moving average audio level
    const newPositions = getPositions(newSpeakerOrder); // Get updated speaker positions in the grid

    const newSize = Math.min(config.numberOfActiveSpeakers, newSpeakerOrder.length); // Get max length for slice (against max number of active speaker)
    const oldSize = Math.min(config.numberOfActiveSpeakers, currentSpeakerOrder.length); // Get max length for slice (against max number of active speaker)

    const newIds = newSpeakerOrder.map(speaker => speaker.id).slice(0, newSize).sort(); // Slice and sort to size
    const oldIds = currentSpeakerOrder.map(speaker => speaker.id).slice(0, oldSize).sort(); // Slice and sort to size

    const newIdsString = JSON.stringify(newIds); // For easy comparison
    const oldIdsString = JSON.stringify(oldIds); // For easy comparison

    // Check Most Active Speaker Change
    let newMostActiveSpeakerId = null;
    let newMostActiveSpeakerAudioLevel = 0;
    for (let i = 0; i < newSpeakerOrder.length; i += 1) {
      const speaker = newSpeakerOrder[i];
      const audioLevel = speaker.audioLevel;
      
      if (audioLevel > newMostActiveSpeakerAudioLevel) {
        newMostActiveSpeakerId = speaker.id;
        newMostActiveSpeakerAudioLevel = audioLevel;
      }
    }
    if (newMostActiveSpeakerId !== mostActiveSpeakerId) {
      mostActiveSpeakerId = newMostActiveSpeakerId;

      if (onMostActiveSpeakerChangeListener != null) {
        onMostActiveSpeakerChangeListener(mostActiveSpeakerId);
      }
    }

    // Update position and speaker order
    positions = newPositions;
    currentSpeakerOrder = newSpeakerOrder;

    // Run only if there are changes in active speaker list
    if (forceCallback || newIdsString !== oldIdsString) {
      // Subscribe/Unsubscribe to videos
      if (config.autoSubscription) {
        updateSubscriptionToVideos();
      }

      // Callback
      if (onActiveSpeakerChangeListener != null) {
        const delay = config.autoSubscription ? config.autoSubscriptionCallbackDelay : 0; // Add delay if there is auto subscription
        setTimeout(() => onActiveSpeakerChangeListener(newSpeakerOrder, newPositions, config.numberOfActiveSpeakers), delay);
      }
    }
  };

  const getMostActiveSpeakerId = () => mostActiveSpeakerId;

  const updateSubscriptionToVideos = () => {
    for (let i = 0; i < currentSpeakerOrder.length; i += 1) {
      const speaker = currentSpeakerOrder[i];
      const shouldSubscribeToVideo = i < config.numberOfActiveSpeakers;
      subscribeToVideo(speaker.id, shouldSubscribeToVideo);
    }
  }

  const getMovingAverage =  (previousMovingAverage, currentAudioLevel) => {
    if (previousMovingAverage == null || previousMovingAverage <= currentAudioLevel) {
      return currentAudioLevel;
    } else {
      return (config.audioLevelPreviousWeight * previousMovingAverage) + (config.audioLevelCurrentWeight * currentAudioLevel);
    }
  };

  const addAudioLevel = (channelId, audioLevel) => {
    rawAudioLevels[channelId] = audioLevel;
  };

  const processAudioLevel = (channelId, audioLevel) => {
    if (channelId == null) {
      return;
    }

    if(channels[channelId] == null) {
      delete rawAudioLevels[channelId];
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
      if (channels[channelId].inSpeech) {
        // Do nothing, already in speech
      } else if (channels[channelId].speechStartTest === 0) {
        // Has not started test for start
        channels[channelId].speechStartTest = currentTime;
      } else if (channels[channelId].speechStartTest + config.consecutiveVoiceMs < currentTime) {
        // Speech started or within speech
        channels[channelId].inSpeech = true;
        channels[channelId].speechStartTest = 0;
        // console.log('Speech Start');

        // Set Speech start time
        if (channels[channelId].speechStart === 0) {
          channels[channelId].speechStart = currentTime;
        }
      }

      // Reset First Silence
      channels[channelId].speechEndTest = 0;
    } else {
      // Silence Detected
      if (!(channels[channelId].inSpeech)) {
        // Do nothing, already not
      } else if (channels[channelId].speechEndTest === 0) {
        // Has not started test for end
        channels[channelId].speechEndTest = currentTime;
      } else if (channels[channelId].speechEndTest + config.consecutiveSilenceMs < currentTime) {
        // Speech ended
        channels[channelId].inSpeech = false;
        channels[channelId].speechEndTest = 0;
        // console.log('Speech End');

        // Reset Speech start time
        channels[channelId].speechStart = 0;
      }
      
      // Reset First Voice
      channels[channelId].speechStartTest = 0;
    }


    // Check Active Speaker Change
    checkActiveSpeakerChange(false);
  };

  const addSubscriber = (subscriber) => {
    console.log(`Adding Subscriber ${subscriber.stream.id}`);
    channels[subscriber.stream.id] = {
      id: subscriber.stream.id,
      type: 'subscriber',
      subscriber,
      movingAverageAudioLevel: 0,
      speechStartTest: 0,
      speechEndTest: 0,
      inSpeech: false,
      pinned: false,
      unsubscribeHandle: null,
    }

    // Add Audio Level Event Listener
    subscriber.on('audioLevelUpdated', (e) => {
      // Add Audio Level
      addAudioLevel(subscriber.stream.id, e.audioLevel);
    });
  };

  const removeSubscriber = (subscriber) => {
    console.log(`Removing Subscriber ${subscriber.stream.id}`);
    delete channels[subscriber.stream.id];
    delete rawAudioLevels[subscriber.stream.id];
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

  const setSpeakerPin = (channelId, pinned) => {
    if (channels[channelId] != null) {
      channels[channelId].pinned = pinned;
    }
  };

  const setOnActiveSpeakerChangeListener = (listener) => {
    onActiveSpeakerChangeListener = listener;
  };

  const setOnMostActiveSpeakerChangeListener = (listener) => {
    onMostActiveSpeakerChangeListener = listener;
  }

  const setNumberOfActiveSpeakers = (value) => {
    console.log(`Setting Number of Active Speakers to ${value}`);
    config.numberOfActiveSpeakers = parseInt(value, 10);
    checkActiveSpeakerChange(true);
  };

  const getNumberOfActiveSpeakers = () => config.numberOfActiveSpeakers;

  const setVoiceLevelThreshold = (value) => {
    console.log(`Setting Voice Level Threshold to ${value}`);
    config.voiceLevelThreshold = parseFloat(value);
    checkActiveSpeakerChange(true);
  };

  const subscribeToVideo = (channelId, shouldSubscribeToVideo) => {
    if (channels[channelId].unsubscribeHandle != null) {
      clearTimeout(channels[channelId].unsubscribeHandle);
      channels[channelId].unsubscribeHandle = null;
    }

    if (shouldSubscribeToVideo) {
      channels[channelId].subscriber.subscribeToVideo(true);
    } else {
      const handle = setTimeout(() => channels[channelId].subscriber.subscribeToVideo(false), config.unsubscribeDelay);
      channels[channelId].unsubscribeHandle = handle;
    }

  };

  return {
    // Listeners
    setOnActiveSpeakerChangeListener,
    setOnMostActiveSpeakerChangeListener,

    // Config
    setNumberOfActiveSpeakers,
    getNumberOfActiveSpeakers,
    setVoiceLevelThreshold,

    // Subscribers
    addSubscriber,
    removeSubscriber,
    removeSubscriberByStreamId,
    getSubscriberByStreamId,

    // Action
    updateSubscriptionToVideos,
    subscribeToVideo,
    addAudioLevel,
    setSpeakerPin,

    // Results
    getOrderedChannels,
    getPositions,
    getMostActiveSpeakerId,
  };
};