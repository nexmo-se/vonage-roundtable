OTSpeech = (options) => {
  const config = Object.assign({
    movingAverageCount: 100,
    consecutiveVoiceMs: 100,
    consecutiveSilenceMs: 300,
    numberOfActiveSpeakers: 2,
  }, options);

  const channels = {};
  let currentSpeakerOrder = [];
  let onActiveSpeakerChangeListener = null;

  const isVoice = (maLevel) => {
    let logLevel = (Math.log(maLevel) / Math.LN10) / 1.5 + 1;
    logLevel = Math.min(Math.max(logLevel, 0), 1);
    return logLevel > 0.5;
  };

  const getOrderedChannels = () => Object.keys(channels)
    .sort((a, b) => {
      if (a.inSpeech && b.inSpeech) {
        if (a.speechStart !== b.speechStart) {
          // Whichever starts first in front
          return a.speechStart - b.speechStart;
        } else {
          // Both starts at the same time, compare moving average audio level
          return channels[b].movingAverageAudioLevel - channels[a].movingAverageAudioLevel; // Order from largest to smallest
        }
      } else if (a.inSpeech && !(b.inSpeech)) {
        // B behind A
        return -1;
      } else if (!(a.inSpeech) && b.inSpeech) {
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

  const checkActiveSpeakerChange = () => {
    const newSpeakerOrder = getOrderedChannels();

    const newIds = JSON.stringify(newSpeakerOrder.map(speaker => speaker.id)
      .slice(0, Math.min(config.numberOfActiveSpeakers, newSpeakerOrder.length))
    );
    const oldIds = JSON.stringify(currentSpeakerOrder.map(speaker => speaker.id)
      .slice(0, Math.min(config.numberOfActiveSpeakers, currentSpeakerOrder.length))
    );

    if (newIds !== oldIds) {
      if (onActiveSpeakerChangeListener != null) {
        onActiveSpeakerChangeListener(newSpeakerOrder);
      }
    }

    currentSpeakerOrder = newSpeakerOrder;
  };

  const getMovingAverage =  (previousMovingAverage, currentAudioLevel) => {
    if (previousMovingAverage == null || previousMovingAverage <= currentAudioLevel) {
      return currentAudioLevel;
    } else {
      return 0.7 * previousMovingAverage + 0.3 * currentAudioLevel;
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
      } else if (channels[channelId].speechStartTest < currentTime + config.consecutiveVoiceMs) {
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
      } else if (channels[channelId.speechEndTest] < currentTime + config.consecutiveSilenceMs) {
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

  const setOnActiveSpeakerChangeListener = (listener) => {
    onActiveSpeakerChangeListener = listener;
  };

  return {
    addAudioLevel,
    getChannels,
    getOrderedChannels,
    setOnActiveSpeakerChangeListener,
    isSelfActiveSpeaker,

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