# Audio Level Layout Library
A library to detect top speakers and subscribe/unsubscribe accordingly

### Instantiating the OTSpeech class
```
const layoutContainer = document.getElementById('layoutContainer');
const screenContainer = document.getElementById('screenContainer');

const options = {
  aspectRatio: 1.78, // 16:9
  highlight: true, // whether the glow border should be used
};
const otLayout = OTLayout(layoutContainer, screenContainer, { aspectRatio, highlight });
```

### Options
**aspectRatio**: `DECIMAL`
Aspect Ratio of the videos, needed for calculating the best layout to maximize video sizes for all the videos

**highlight**: `BOOLEAN`
Flag to enable glowing border for the most active speaker

### Methods

#### adjustLayout
Trigger changes to the layout based on the current list of speaker positions and number of active speakers.

Example:
```
const positions = []; // positions of the speakers (list of speaker Ids) in the layout
const numberOfActiveSpeakers = 2; // number of speakers to show on screen
otLayout.adjustLayout(positions, numberOfActiveSpeakers);
```

#### updateHighlight
Update highlight speaker with glowing border to the given speaker Id

Example:
```
otLayout.updateHighlight(speakerId);
```

#### enableHightlight
Set whether to enable the glowing border

Example:
```
const shouldEnable = true;
otLayout.enableHighlight(shouldEnable);
```

#### addSelfSpeakerId
Add own id to pin own video to the first video elements

Example:
```
otLayout.addSelfSpeakerId(speakerId);
```

#### removeSelfSpeakerId
Remove own id from pinning to the first video elements

Example:
```
otLayout.removeSelfSpeakerId(speakerId);
```