OTStats = (options) => {
  const config = Object.assign({}, options, {
    statsInterval: 3000,
  });
    
  let subscribers = {};
  let publishers = {};
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
  
  const removePublisher = (publisherId) => {
      delete publishers[publisherId];
  }
  const addPublisher = (publisher) => {
      publishers[publisher.id] = {
      id: publisher.id,
      publisher,
      video:{
          previousTimestamp:0,
          prevBytesSent:0,
          prevPacketsLost:0,
          prevPacketsSent:0
      },
      audio:{
          previousTimestamp:0,
          prevBytesSent:0,
          prevPacketsLost:0,
          prevPacketsSent:0
      }
    };
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
      for(let publisherId in publishers){
          let publisher = publishers[publisherId].publisher;
          publisher.getStats((err, statsArray) => {
                if(err){
                    console.log(err);
                }
                if(publishers[publisherId].video.previousTimestamp === 0){
                    publishers[publisherId].video.previousTimestamp = statsArray[0].stats.timestamp;
                    publishers[publisherId].audio.previousTimestamp = statsArray[0].stats.timestamp;
                    return;
                }
                const audioStats = statsArray[0].stats.audio === undefined ? {packetsLost:0,packetsSent:0,bytesSent:0} : statsArray[0].stats.audio
                const videoStats = statsArray[0].stats.video;
              
                const videoPacketLost = videoStats.packetsLost - publishers[publisherId].video.prevPacketsLost;
                const videoPacketsSent = videoStats.packetsSent - publishers[publisherId].video.prevPacketsSent;
                let totalVideoPkts = videoPacketLost + videoPacketsSent;
                let videoPLRatio = totalVideoPkts > 0 ? (videoPacketLost/totalVideoPkts) : 0;
                videoPLRatio = Math.round(videoPLRatio*100)/100;
              
                const audioPacketLost = audioStats.packetsLost - publishers[publisherId].audio.prevPacketsLost;
                const audioPacketsSent = audioStats.packetsSent - publishers[publisherId].audio.prevPacketsSent;
                let totalAudioPkts = audioPacketLost + audioPacketsSent;
                let audioPLRatio = totalAudioPkts > 0 ? (audioPacketLost/totalAudioPkts) : 0;
                audioPLRatio = Math.round(audioPLRatio*100)/100;
              
                const videoKbps = Math.floor(((videoStats.bytesSent-publishers[publisherId].video.prevPublisherBytesSent)*8)/(statsArray[0].stats.timestamp-publishers[publisherId].video.previousTimestamp));
              
                const audioKbps = Math.floor(((audioStats.bytesSent-publishers[publisherId].audio.prevPublisherBytesSent)*8)/(statsArray[0].stats.timestamp-publishers[publisherId].audio.previousTimestamp));
              
                publishers[publisherId].video.prevPublisherBytesSent = videoStats.bytesSent;
                publishers[publisherId].video.prevPacketsSent = videoStats.packetsSent;
                publishers[publisherId].video.prevPacketsLost = videoStats.packetsLost;
                publishers[publisherId].video.previousTimestamp = statsArray[0].stats.timestamp;
                publishers[publisherId].audio.prevPublisherBytesSent = audioStats.bytesSent;
                publishers[publisherId].audio.prevPacketsSent = audioStats.packetsSent;
                publishers[publisherId].audio.prevPacketsLost = audioStats.packetsLost;
                publishers[publisherId].audio.previousTimestamp = statsArray[0].stats.timestamp;
              
                if(onPublisherStatsAvailableListener != null){
                    onPublisherStatsAvailableListener(publisherId,{
                            bandwidth: videoKbps,
                            width: publisher.videoWidth(),
                            height: publisher.videoHeight(),
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
     
      
      /* subscriber stats */
      for(let subscriberId in subscribers){
          let sub = subscribers[subscriberId].subscriber;
          sub.getStats((err, statsArray) => {
                if(err){
                    console.log(err);
                    return;
                }
                
                if(subscribers[subscriberId].video.previousTimestamp === 0){
                    subscribers[subscriberId].video.previousTimestamp = statsArray.timestamp;
                    subscribers[subscriberId].audio.previousTimestamp = statsArray.timestamp;
                    return;
                }
                
                console.log(statsArray);
                const audioStats = statsArray.audio === undefined ? {packetsLost:0,packetsReceived:0,bytesReceived:0} : statsArray.audio;
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
      addPublisher,
      removePublisher,
      start,
      stop,
      setPublisherOnStatsAvailableListener,
      setSubscriberOnStatsAvailableListener
  };
};