# Vonage Roundtable for Multiparty Conference
Roundtable sample application with automatic subscribe/unsubscribe video when the participant becomes one of the top active speakers.
This allows for reduced bandwidth consumption for videos on participants who are keeping silence. Audio will continue to be published and subscribed unless the participant decided to mute himself/herself.

### Setup (Local)
1. clone this repo
2. run `npm install`
3. setup `.env` according to `.env.example`
4. run `npm start`

### Setup (Heroku)
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/nexmo-se/vonage-roundtable)

# Using the application

### UI Usage
Load the page using your browser and start using

1. Fill in your Display Name.
2. Click on `Connect to Session` button.
3. List of available speakers will be shown with checkboxes.
4. Click on the checkboxes to pin a speaker to view. (always have their video in view)
5. Other speakers will appear in view when they starts to speak.
