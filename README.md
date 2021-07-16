# Vonage Roundtable for Multiparty Conference
![Main](https://github.com/nexmo-se/vonage-roundtable/blob/master/images/main.png?raw=true)

Roundtable sample application with automatic subscribe/unsubscribe video when the participant becomes one of the top active speakers.
This allows for reduced bandwidth consumption for videos on participants who are keeping silence. Audio will continue to be published and subscribed unless the participant decided to mute himself/herself.

### Setup (Local)
1. clone this repo.
2. ensure you are using nodejs v12.x as it does NOT work on nodejs v14.x.
3. run `npm install`.
4. install database (mysql/postgres).
5. setup `.env` according to `.env.example`.
6. run `npm run migrate`.
7. run `npm start`.

### Setup (Heroku)
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/nexmo-se/vonage-roundtable/tree/caption-active-speaker)


# Using the application

### Rooms
The concept of meeting rooms are being used in Roundtable. A human-readable room name is used to identify a room. Each room will have a session ID that will expire after 2 hours 30 minutes (configurable) since the last action for the room (get token, mute all). Thereafter, a new session ID will be generated, and new participants will be joining a different session. This is to allow a refresh of session ID for better keep track, reporting and debugging of the meeting session.

There are two types of rooms:
- public rooms
- private rooms

Private rooms are rooms with room names that starts with and underscore (`_`). All private rooms are only joinable by Signing In with Google using Vonage emails (configurable). Joining from other email domains will be blocked to ensure privacy within Vonage.

Public rooms are rooms that can be joined by anyone. Signing in using Name or Google are available.

### Sign In
![Sign In](https://github.com/nexmo-se/vonage-roundtable/blob/master/images/signin.png?raw=true)

There are 2 ways to sign in:
- Sign In with Google (public and private room)
- Sign In with Name (public room only)

*Note that private rooms only allows signing in from a Vonage email. Allowed email domains can be configured in the environment variable `AUTH_EMAIL_DOMAINS`.*

### Roles
There are 2 modes within the application:
- User
- Admin

User has the following basic privileges:
- Chat
- View list of participants
- Pin participant to always show on screen
- Change number of on-screen participants
- Change Audio/Video input and output devices
- Toggle sound effect when participants join/leave the room
- Enable/Disable Microphone Audio (mute)
- Enable/Disable Webcam Video
- Screenshare
- Video Player (loads and play video, visible to all participants)

![Control](https://github.com/nexmo-se/vonage-roundtable/blob/master/images/control.png?raw=true)

![Chat](https://github.com/nexmo-se/vonage-roundtable/blob/master/images/chat2.png?raw=true)

![Settings](https://github.com/nexmo-se/vonage-roundtable/blob/master/images/settings.png?raw=true)

Admin has all the privileges of a normal User, as well as additional permissions, such as:
- Mute All (muting all current participants and setting initial state of new participants to be muted)
- Recording (start, stop, list and download recordings for the room)
- Subtitle - OPTIONAL (start, stop subtitle transcription service, only available with sub=true option)

![Admin](https://github.com/nexmo-se/vonage-roundtable/blob/master/images/admin.png?raw=true)

### Query
A room meeting URL can be added with queries to achieve additional configurations.

The following is a list of available queries:
- name: STRING - join and connect to room using a name automatically.
- token: STRING - token to be used, allowing joining a custom session with any opentok token.
- highlight: BOOLEAN (`true` or `false`) - configuration on whether to highlight the most active speaker. Default to `true`.
- room: STRING - room name.
- max: INTEGER - number of on-screen speakers (overwriting the default).
- ratio: STRING (`16_9` or `4_3`) - aspect ratio for the video tiles. Default to `16_9`.
- unpublish_delay: INTEGER - delay (ms) before unpublishing video when user is no longer an active speaker visible on screen. Default to `30`.
- retry_limit: INTEGER - number of retries to be attempted if connection fails. Default to `0`.
- hide_control_delay - INTEGER - delay (ms) before hiding the control buttons when the mouse moves out of the video tiles.
- role: STRING (`user` or `admin`) - role of participant. Default to `user`.
- sound: BOOLEAN (`true` or `false`) - enable sound effect when participants join or leave the room. Default to `true`.
- cycleMode: STRING (`auto`, `manual`) - Video Cycle Mode when clicking the cycle camera button. Default to `manual`.
- sub: BOOLEAN (`true` or `false`) - Whether to enable the subtitle function, showing the subtitle button.
- hide_sidebar: BOOLEAN (`true` or `false`) - Whether to hide the sidebar on load. Default to `false`.
- disable_sidebar: BOOLEAN (`true` or `false`) - Whether to disable sidebar entirely. Default to `false`.

### Cycle Mode
When the user clicks on the cycle camera button, there are different ways that the camera can be cycled. With the use of the default video source, opentok may change the underlying camera source without republishing using the `auto` option. However, if the user changes the video source in the settings tab, a `manual` approach will be used. The following shows how the `manual` approach works.

1. Get a list of available video sources.
2. Find the next video source (as compared to current source).
3. Unpublish current video.
4. Publish new video with new video source.

*Do note that the `manual` approach may cause a temporary lost of publisher (both audio and video) while it is unpublishing and republishing as compared to the `auto` approach.*


### Embedded Mode (untested)
This application is made to be embeded in any other web application as an iFrame. With the use of queries such as `room`, `token` and `name`, developers can easily add a video call function to their web application using an iFrame, connecting users to the correct opentok session with all the Roundtable functions available to be used.

# API Documentations
### Get Token for Room
```
GET /token
Require JWT Authentication

Query:
room: STRING
```

### Mute All
```
GET /muteAll
Require JWT Authentication

Query:
room: STRING
mute: STRING ['true', 'false']
```

### List Archives
```
GET /archives

Query:
sessionId: STRING
```

### Start/Stop Archive
```
POST /archives

Body:
{
  sessionId: STRING,
  action: STRING ['start', 'stop']
}
```

### Download Archive
```
GET /archives/:archiveId/download

Parameter:
archiveId: STRING
```

### Get Transcription Host
```
GET /transcribeHost
```
