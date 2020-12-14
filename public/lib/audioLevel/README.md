# Audio Level Management Library
A library to detect top speakers and subscribe/unsubscribe accordingly

### Instantiating the OTSpeech class
```
const options = { numberOfActiveSpeakers: 4 };
const otSpeech = OTSpeech(options);
```

### Options
**numberOfActiveSpeakers**: `INTEGER`
Maximum Number of Active Speaker (which video should be shown)

**autoSubscription**: `BOOLEAN`
Automatically subscribe/unsubscribe to video with delay

**autoSubscriptionCallbackDelay**: `INTEGER`
Delay in milliseconds before calling callback (to allow time for subscription to stablize)

**unsubscribeDelay**: `INTEGER`
Delay in milliseconds before unsubscribing

**voiceLevelThreshold**: `DECIMAL`
Threshold for Voice Detection (default 0.25)

**consecutiveVoiceMs**: `INTEGER`
Minimum amount of consecutive voice (ms) before the speaker is considered in a speech

**consecutiveSilenceMs**: `INTEGER`
Minimum amount of consecutive silence (ms) before speaker is considered out of speech

**audioLevelPreviousWeight**: `DECIMAL`
previous value weightage for moving average computation (default: 0.7)

**audioLevelCurrentWeight**: `DECIMAL`
current value weightage for moving average computation (default: 0.3)

**audioLevelUpdateInterval**: `INTEGER`
interval between updates of audio level in ms (lower = more real-time, higher = less cpu intensive)


### Methods

#### setOnActiveSpeakerChangeListener
Set listener that will be triggered when the active speakers list changes.

Example:
```
const listener = (updatedActiveSpeakers, positions, numberOfActiveSpeakers) => {};
otSpeech.setOnActiveSpeakerChangeListener(listener);
```

`updatedActiveSpeakers`: list of speakers ordered by active speakers (most active to least active)

`positions`: speakers position to be displayed in the layout, useful for deciding how to order the video elements in the layout

`numberOfActiveSpeakers`: number of current active speakers, capped by the configured number of active speakers

#### setOnMostActiveSpeakerChangeListener
Set listener that will be triggered when the most active speaker changes.

Example:
```
const listener = (mostActiveSpeakerId) => {};
otSpeech.setOnMostActiveSpeakerChangeListener(listener);
```

`mostActiveSpeakerId`: subscriber ID of the most active speaker, useful for setting the glowing border in the layout

#### setNumberOfActiveSpeakers
Set the configured maximum number of active speakers.

Example:
```
otSpeech.setNumberOfActiveSpeakers(4);
```

#### getNumberOfActiveSpeakers
Get the configured maximum number of active speakers.

Example:
```
const numActiveSpeaker = otSpeech.getNumberOfActiveSpeakers();
```

#### setVoiceLevelThreshold
Set the voice level threshold to be considered human voice.

Example:
```
otSpeech.setVoiceLevelThreshold(0.3);
```

#### addSelf
Notify the library that there is an additional self video (so that your own video always be taking up one space in the active speakers number).

Example:
```
otSpeech.addSelf();
```

#### removeSelf
Notify the library that there is one less self video.

Example:
```
otSpeech.removeSelf();
```

#### addSubscriber
Adding subscriber to have the audio level detected.

Example:
```
otSpeech.addSubscriber(subscriber);
```

#### removeSubscriber
Removing subscriber, useful when the subscriber left the session.

Example:
```
otSpeech.removeSubscriber(subscriber);
```

#### removeSubscriberByStreamId
Removing subscriber by stream Id, useful when the subscriber left the session.

Example:
```
otSpeech.removeSubscriberByStreamId(streamId);
```

#### getSubscriberIdByStreamId
Get subscriber by stream Id, or null if stream Id does not exist

Example:
```
const subscriber = otSpeech.getSubscriberByStreamId(streamId);
```

#### updateSubscriptionToVideos
Triggers subscriptions to all subscriber videos based on current number of active speakers, including changing the resolution and frame rate.

##### Current Configuration
>9 active speakers: 320x240 @ 7 fps
>4 active speakers: 320x240 @ 15 fps
>1 active speakers: 640x480 @ 30 fps
1 active speaker: 1280x720 @ 30 fps

Example:
```
otSpeech.updateSubscriptionToVideos();
```

#### subscribeToVideo
Trigger subscription to subscriber video

Example: 
```
const shouldSubscribe = true;
otSpeech.subscribeToVideo(channelId, shouldSubscribe);
```

#### subscribeToQuality
Trigger subscription to subscriber quality, including resolution and frame rate

Example: 
```
const resolution = {
  width: 320,
  height: 240,
};
const framerate = 15;
otSpeech.subscribeToQuality(channelId, resolution, framerate);
```

#### addAudioLevel
Manually adding audio level update to channel.

Example:
```
const audioLevel = 0.8;
otSpeech.addAudioLevel(channelId, audioLevel);
```

#### setSpeakerPin
Set whether a speaker is pinned as an active speaker

Example:
```
const pinned = true;
otSpeech.setSpeakerPin(channelId, pinned);
```

#### notifySpeakerChange
Notify the library that there is a change in speakers, useful for forcing a reevaluation of the active speakers

Example:
```
otSpeech.notifySpeakerChange();
```

#### getOrderedChannels
Get current active speaker list

Example:
```
const activeSpeakers = otSpeech.getOrderedChannels();
```

#### getPositions
Get current speaker positions in the layout

Example:
```
const positions = otSpeech.getPositions(activeSpeakers);
```

#### getMostActiveSpeakerId
Get current most active speaker Id

Example:
```
const speakerId = otSpeech.getMostActiveSpeakerId();
```
