# Participation Library
A library to calculate participation duration (active) for each of the speakers

### Instantiating the OTParticipation class
```
const otParticipation = OTParticipation();
otParticipation.setOnParticipationChangeListener(onChangeListener); // Set On Change Listener

function onChangeListener() {
  const latestParticipations = otParticipation.getParticipations();
  // DO SOMETHING
}
```

### Options
**participationUpdateInterval**: `INTEGER`
Interval for automatic participation update in milliseconds


#### setCurrentParticipant
Set current participating speaker

Example:
```
otParticipation.setCurrentParticipant(speakerId);
```

#### deleteParticipant
Remove speaker from participation. This could be that the participant has left or something.

Example:
```
otParticipation.deleteParticipant(speakerId);
```

#### getParticipations
Get participation for all participants available

Example:
```
otParticipation.getParticipations();
```

#### setOnParticipationChangeListener
Set onChange listener

Example:
```
otParticipation.setOnParticipationChangeListener(listener);
```