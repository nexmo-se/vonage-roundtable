OTSpeech = (options) => {
  const config = Object.assign({
    movingAverageCount: 100,
  }, options);

  const channels = {};

  const isVoice = (maLevel) => {
    let logLevel = (Math.log(maLevel) / Math.LN10) / 1.5 + 1;
    logLevel = Math.min(Math.max(logLevel, 0), 1);
    return logLevel > 0.5;
  };

  const updateSpeech = (audioLevel, channel) => {

  };

  const getOrderedChannels = () => {
    return Object.keys(channels)
      .sort((a, b) => b.movingAverageAudioLevel - a.movingAverageAudioLevel); // Order from largest to smallest
  };

  const getMovingAverage =  (previousMovingAverage, currentAudioLevel) => {
    if (previousMovingAverage == null || previousMovingAverage <= currentAudioLevel) {
      return currentAudioLevel;
    } else {
      return 0.7 * previousMovingAverage + 0.3 * currentAudioLevel;
    }
  };

  const addAudioLevel = (channelId, audioLevel) => {
    if(channels[channelId] == null) {
      console.log(`Channel ${channelId} does not exist`);
      return;
    }

    // Calculate Moving Average
    channels[channelId].movingAverageAudioLevel = getMovingAverage(channels[channelId].movingAverageAudioLevel, audioLevel);
  };

  const addPublisher = (publisher) => {
    console.log(`Adding Publisher ${publisher.id}`);
    channels[publisher.id] = {
      type: 'publisher',
      publisher,
      movingAverageAudioLevel: 0,
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

  return {
    addAudioLevel,

    addPublisher,
    removePublisher,
    removePublisherByStreamId,
    getPublisherByStreamId,

    addSubscriber,
    removeSubscriber,
    removeSubscriberByStreamId,
    getSubscriberByStreamId,

    getChannels,
  };
};