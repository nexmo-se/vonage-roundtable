OTStats = (options) => {
  const config = Object.assign({}, options, {
    statsInterval: 3000,
  });
    
  let publisher = null;
  let publisherHistory ={previousTimestamp:0,prevPublisherBytesSent:0,prevPacketsLost:0,prevPacketsSent:0};
    
  let subscribers = {};
  let onPublisherStatsAvailableListener = null;
  let onSubscriberStatsAvailableListener = null;
  let statsTimer = null;
  
  const addSubscriber = (subscriber) => {
      subscribers[subscriber.id] = {
      id: subscriber.id,
      subscriber,
      previousTimestamp:0,
      prevPublisherBytesReceived:0,
      prevPacketsLost:0,
      prevPacketsReceived:0
    };
  }
  const setPublisher = (pub) => {
      publisher = pub;  
      console.log("publisher set");
  }
  
  const start = () => {
      statsTimer = setInterval(collectStats,config.statsInterval);
  }
  const collectStats = () => {
      
      /*publisher stats */
      if(publisher != null){
          publisher.getStats((err, statsArray) => {
                if(err){
                    console.log(err);
                }
                if(publisherHistory.previousTimestamp === 0){
                    publisherHistory.previousTimestamp = statsArray[0].stats.timestamp;
                    return;
                }
                const audioStats = statsArray[0].stats.audio;
                const videoStats = statsArray[0].stats.video;
                const packetLost = videoStats.packetsLost - publisherHistory.prevPacketsLost;
                const packetsSent = videoStats.packetsSent - publisherHistory.prevPacketsSent;
                let totalPkts = packetLost + packetsSent;
                let PLRatio = totalPkts > 0 ? (packetLost/totalPkts) : 0;
              
                const videoKbps = Math.floor((videoStats.bytesSent-publisherHistory.prevPublisherBytesSent)*8/1000000*(statsArray[0].stats.timestamp-publisherHistory.previousTimestamp));
              
                publisherHistory.prevPublisherBytesSent = videoStats.bytesSent;
                publisherHistory.prevPacketsSent = videoStats.packetsSent;
                publisherHistory.prevPacketsLost = videoStats.packetsLost;
                publisherHistory.previousTimestamp = statsArray[0].stats.timestamp;
                
                if(onPublisherStatsAvailableListener != null){
                    onPublisherStatsAvailableListener(videoKbps,videoStats.frameRate,PLRatio);
                }
                else {
                    console.log("onStatsAvailableListener is null");
                }
          });
      }
      else{
          console.log("publisher null");
      }
      
      /* subscriber stats */
      for(var subscriberId in subscribers){
          console.log(subscriberId);
          let sub = subscribers[subscriberId].subscriber;
          console.log(sub);
          sub.getStats((err, statsArray) => {
                if(err){
                    console.log(err);
                    return;
                }
                
                if(subscribers[subscriberId].previousTimestamp === 0){
                    subscribers[subscriberId].previousTimestamp = statsArray[0].stats.timestamp;
                    return;
                }
                console.log(statsArray);
                const audioStats = statsArray[0].stats.audio;
                const videoStats = statsArray[0].stats.video;
                const packetLost = videoStats.packetsLost - subscribers[subscriberId].prevPacketsLost;
                const packetsReceived = videoStats.packetsReceived - subscribers[subscriberId].prevPacketsReceived;
                let totalPkts = packetLost + packetsReceived;
                let PLRatio = totalPkts > 0 ? (packetLost/totalPkts) : 0;
              
                const videoKbps = Math.floor((videoStats.bytesReceived-subscribers[subscriberId].prevPublisherBytesReceived)*8/1000000*(statsArray[0].stats.timestamp-subscribers[subscriberId].previousTimestamp));
              
                subscribers[subscriberId].prevPublisherBytesReceived = videoStats.bytesReceived;
                subscribers[subscriberId].prevPacketsReceived = videoStats.packetsReceived;
                subscribers[subscriberId].prevPacketsLost = videoStats.packetsLost;
                subscribers[subscriberId].previousTimestamp = statsArray[0].stats.timestamp;
                
                if(onSubscriberStatsAvailableListener != null){
                    onSubscriberStatsAvailableListener(sub.id,videoKbps,videoStats.frameRate,PLRatio);
                }
                else {
                    console.log("onStatsAvailableListener is null");
                }
          });
      }
  }
  
  const setPublisherOnStatsAvailableListener = (listener) => {
    onPublisherStatsAvailableListener = listener;
  }
  const setSubscriberOnStatsAvailableListener = (listener) => {
    onSubscriberStatsAvailableListener = listener;
  }
  
  return {
      addSubscriber,
      setPublisher,
      start,
      setPublisherOnStatsAvailableListener,
      setSubscriberOnStatsAvailableListener
  };
};