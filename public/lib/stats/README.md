## How to use this module

```

      let otStats = OTStats();
      otStats.setPublisherOnStatsAvailableListener(onPublisherStatsAvailable);
      otStats.setSubscriberOnStatsAvailableListener(onSubscriberStatsAvailable);
      otStats.setOnAggregateStatsAvailableListener(onAggregateStatsAvailable);
      
      // add publisher - camera or screen
      otStats.addPublisher(publisher);
      
      // for each subscriber you want to monitor, add
      otStats.addSubscriber(subscriber);
      
      function onPublisherStatsAvailable(id,video,audio){
        // your logic
      }
      function onSubscriberStatsAvailable(id, video, audio){
          //your logic
      }
        
      function onAggregateStatsAvailable(stats){
          //your logic 
      }
      
```
