OTStats = (options) => {
  const config = Object.assign({}, options, {
    statsInterval: 3000,
  });
    
  let publisher = null;
  let publisherHistory ={previousTimestamp:0,prevPublisherBytesSent:0,prevPacketsLost:0,prevPacketsSent:0};
    
  let subscribers = {};
  let onPublisherStatsAvailableListener = null;
  let onSubscriberStatsAvailableListener = null;
  let statsTimer = undefined;
  
  const removeSubscriber = (streamId) => {
      delete subscribers[streamId];
  }
  const addSubscriber = (subscriber) => {
      subscribers[subscriber.stream.id] = {
      id: subscriber.id,
      subscriber,
      video:{
          previousTimestamp:0,
          prevBytesReceived:0,
          prevPacketsLost:0,
          prevPacketsReceived:0
      },
      audio:{
          previousTimestamp:0,
          prevBytesReceived:0,
          prevPacketsLost:0,
          prevPacketsReceived:0
      }
    };
  }
  const setPublisher = (pub) => {
      publisher = pub;  
      console.log("publisher set");
  }
  
  const start = () => {
      if(statsTimer === undefined){
        statsTimer = setInterval(collectStats,config.statsInterval);
      }
  }
  
  const stop = () => {
      if(statsTimer !== undefined){
          clearInterval(statsTimer);
          statsTimer = undefined;
      }
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
                PLRatio = Math.round(PLRatio*100)/100;
              
                const videoKbps = Math.floor(((videoStats.bytesSent-publisherHistory.prevPublisherBytesSent)*8)/(statsArray[0].stats.timestamp-publisherHistory.previousTimestamp));
              
                publisherHistory.prevPublisherBytesSent = videoStats.bytesSent;
                publisherHistory.prevPacketsSent = videoStats.packetsSent;
                publisherHistory.prevPacketsLost = videoStats.packetsLost;
                publisherHistory.previousTimestamp = statsArray[0].stats.timestamp;
                
                if(onPublisherStatsAvailableListener != null){
                    onPublisherStatsAvailableListener(videoKbps,publisher.videoWidth(),publisher.videoHeight(),Math.round(videoStats.frameRate),PLRatio);
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
          //console.log(subscriberId);
          let sub = subscribers[subscriberId].subscriber;
          //console.log(sub);
          
          sub.getStats((err, statsArray) => {
                if(err){
                    console.log(err);
                    return;
                }
                //console.log(statsArray);
                
                if(subscribers[subscriberId].video.previousTimestamp === 0){
                    subscribers[subscriberId].video.previousTimestamp = statsArray.timestamp;
                    subscribers[subscriberId].video.previousTimestamp = statsArray.timestamp;
                    return;
                }
                
                const audioStats = statsArray.audio;
                const videoStats = statsArray.video;
              
                const videoPacketLost = videoStats.packetsLost - subscribers[subscriberId].video.prevPacketsLost;
                const videoPacketsReceived = videoStats.packetsReceived - subscribers[subscriberId].video.prevPacketsReceived;
                let videoTotalPkts = videoPacketLost + videoPacketsReceived;
                let videoPLRatio = videoTotalPkts > 0 ? (videoPacketLost/videoTotalPkts) : 0;
                videoPLRatio = Math.round(videoPLRatio*100)/100;
               
                const audioPacketLost = audioStats.packetsLost - subscribers[subscriberId].audio.prevPacketsLost;
                const audioPacketsReceived = audioStats.packetsReceived - subscribers[subscriberId].audio.prevPacketsReceived;
                let audioTotalPkts = audioPacketLost + audioPacketsReceived;
                let audioPLRatio = audioTotalPkts > 0 ? (audioPacketLost/audioTotalPkts) : 0;
                audioPLRatio = Math.round(audioPLRatio*100)/100;
              
                const videoKbps = Math.floor(((videoStats.bytesReceived-subscribers[subscriberId].video.prevBytesReceived)*8)/(statsArray.timestamp-subscribers[subscriberId].video.previousTimestamp));
              
                const audioKbps = Math.floor(((audioStats.bytesReceived-subscribers[subscriberId].audio.prevBytesReceived)*8)/(statsArray.timestamp-subscribers[subscriberId].audio.previousTimestamp));
              
                subscribers[subscriberId].video.prevBytesReceived = videoStats.bytesReceived;
                subscribers[subscriberId].video.prevPacketsReceived = videoStats.packetsReceived;
                subscribers[subscriberId].video.prevPacketsLost = videoStats.packetsLost;
                subscribers[subscriberId].video.previousTimestamp = statsArray.timestamp;
                subscribers[subscriberId].audio.prevBytesReceived = audioStats.bytesReceived;
                subscribers[subscriberId].audio.prevPacketsReceived = audioStats.packetsReceived;
                subscribers[subscriberId].audio.prevPacketsLost = audioStats.packetsLost;
                subscribers[subscriberId].audio.previousTimestamp = statsArray.timestamp;
                
                if(onSubscriberStatsAvailableListener != null){
                    onSubscriberStatsAvailableListener(sub.id,{
                            bandwidth: videoKbps,
                            width: sub.videoWidth(),
                            height: sub.videoHeight(),
                            frameRate: Math.round(videoStats.frameRate),
                            packetLoss: videoPLRatio
                        },
                        {
                            bandwidth: audioKbps,
                            packetLoss: audioPLRatio
                        }
                    );
                                                       
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
      removeSubscriber,
      setPublisher,
      start,
      stop,
      setPublisherOnStatsAvailableListener,
      setSubscriberOnStatsAvailableListener
  };
};