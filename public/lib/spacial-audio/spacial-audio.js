OTSpacialAudio = () => {
    
let isSupported = false;
let audioContext = undefined;
let resonanceAudioScene = undefined;
let mediaDestinationNode = undefined;
let resonanceGain = undefined;
var resonanceSources = {};
var audioEl = undefined;
let subscriberMap = {};
let MODE_NONE=0;
let MODE_SPATIAL=2;

var roomWidth = 7;
var roomHeight = 5;
var roomDepth = 7;

var audioMode = MODE_NONE;

function resumeAudioContext(){
    if(!isSupported)
        return;
    audioContext.resume();
}
function getAudioMode(){
    return audioMode;
}

function setAudioMode(mode){
    if(!isSupported)
        return;
    console.log("Changing mode to: "+mode);
    audioMode = mode;
    changeMode(audioMode);
}

function initResonanceAudio() {
    audioEl = new Audio();
    audioEl.setAttribute("autoplay", "autoplay");
    audioEl.setAttribute("playsinline", "playsinline");
    try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new window.AudioContext();
  } catch (e) {
    console.log('Web Audio API is not supported in this browser.');
    isSupported = false;
    return;
  }
   isSupported = true;
    mediaDestinationNode = audioContext.createMediaStreamDestination();
    resonanceGain = audioContext.createGain();
    resonanceAudioScene = new ResonanceAudio(audioContext,{
        ambisonicOrder: 1
    });
    
    resonanceAudioScene.output.connect(resonanceGain);
    if(/chrome/i.test(navigator.userAgent))
        fixChrome687574(mediaDestinationNode,audioContext,resonanceGain,audioEl);
    else
        resonanceGain.connect(audioContext.destination);

    let roomDimensions = {
        width: roomWidth,
        height: roomHeight,
        depth: roomDepth,
    };

    let roomMaterials = {
        left: 'uniform',
        right: 'uniform',
        up: 'uniform',
        down: 'uniform',
        front: 'uniform',
        back: 'uniform'
    };

    resonanceAudioScene.setRoomProperties(roomDimensions, roomMaterials);
    resonanceAudioScene.setListenerPosition(0, 0, 0);
    resonanceGain.gain.value=0;
}

function changeMode(mode){
    if(!isSupported)
        return;
    if(mode == MODE_SPATIAL){
        console.log("mode is spatial now");
        resonanceGain.gain.value=1;
        setSubscribersVolume(0);
    }
    else if(mode == MODE_NONE){
        console.log("mode is mono now");
        resonanceGain.gain.value=0;
        setSubscribersVolume(50);
    }
}

function setSubscribersVolume(vol){
    if(!isSupported)
        return;
    for (var streamId in subscriberMap) {
        subscriberMap[streamId].setAudioVolume(vol);
    }
}

function disconnectVideoFromResonance(subscriber){
    let streamId = subscriber.id;
    if(resonanceSources[streamId])
        resonanceSources[streamId].disconnect();
    if(subscriberMap[streamId])
        delete subscriberMap[streamId];
}

function adjustAudioSourcePositions(streams, numSpeakersVisible, layoutDiv){
    let layoutRect = document.getElementById(layoutDiv).getBoundingClientRect();
    let layoutCenterX = layoutRect.left + (layoutRect.width/2);
    let layoutCenterZ = layoutRect.top + (layoutRect.height/2);
    console.log("layoutCenterX:"+layoutCenterX);
    console.log("layoutCenterZ:"+layoutCenterZ);
    let scaleX = roomWidth/layoutRect.width;
    let scaleZ = roomHeight/layoutRect.height;
    console.log("sacling "+scaleX+", "+scaleZ);
    for(i=0;i<numSpeakersVisible && i <streams.length;i++){
        /* for each subscriber, get the bounding box and find the center relative to the center of layoutContainer */
        let subscriberRect = document.getElementById(streams[i].subscriber.id).getBoundingClientRect();
        let subscriberCenterX = subscriberRect.left + (subscriberRect.width/2);
        let subscriberCenterZ = subscriberRect.top + (subscriberRect.height/2);
        console.log("subscriberCenterX:"+subscriberCenterX);
        console.log("subscriberCenterZ"+subscriberCenterZ);
        let relativeX = (subscriberCenterX - layoutCenterX)*scaleX;
        let relativeZ = (subscriberCenterZ - layoutCenterZ)*scaleZ;
        console.log("Setting ("+streams[i].subscriber.id+") to X="+relativeX+" Z="+relativeZ);
        /* lets keep people closer to the center of screen further away on Y axis, so it should be like people sitting in half circular shape */
        let Y = 2 * (1 - (Math.abs(relativeX)/(roomWidth/2)));
        setSourcePosition(streams[i].subscriber.id,relativeX,Y,relativeZ);
    }
}
function connectVideoToResonanceAudio(subscriber,x=1,y=0,z=1) {
    if(!isSupported)
        return;
    let subscriberId = subscriber.id;
    subscriberMap[subscriberId] = subscriber;
    if(audioMode == MODE_SPATIAL)
        subscriber.setAudioVolume(0);
    
    console.log("Adding streamId="+subscriber.stream.id+" to the map");
    /* find the video element */
    var videoElem = subscriber.element.querySelector('video');
    if(videoElem == undefined){
        console.log("Video Element null in connectVideoToResonanceAudio. Something terribly wrong");
        return;
    }
    
    //console.log(videoElem.srcObject);
    let audioElementSource = audioContext.createMediaStreamSource(/*videoElem.captureStream ? videoElem.captureStream():videoElem.mozCaptureStream()*/videoElem.srcObject);
    let source = resonanceAudioScene.createSource();
    audioElementSource.connect(source.input);
    source.setPosition(x, y, z);
    resonanceSources[subscriberId] = source;
}

function setSourcePosition(streamId,x,y,z){
    if(!isSupported)
        return;
	resonanceSources[streamId].setPosition(x,y,z);
}

function sourceExists(streamId){
    if(!isSupported)
        return;
    return resonanceSources.hasOwnProperty(streamId);
}

function setListenerOrientation(x,y,z,ux,uy,uz){
    if(!isSupported)
        return;
	resonanceAudioScene.setListenerOrientation(x,y,z,ux,uy,uz);
}

function setListenerPosition(x,y,z){
    if(!isSupported)
        return;
	resonanceAudioScene.setListenerPosition(x,y,z);
    audioContext.listener.setPosition(x, y, z);
}
    
function fixChrome687574(loopbackDestination, audioContext, resonanceGainNode,audioEl){
  const outboundPeerConnection = new RTCPeerConnection();
  const inboundPeerConnection = new RTCPeerConnection();

  const onError = e => {
    console.error("RTCPeerConnection loopback initialization error", e);
  };

  outboundPeerConnection.addEventListener("icecandidate", e => {
    inboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
  });

  inboundPeerConnection.addEventListener("icecandidate", e => {
    outboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
  });

  inboundPeerConnection.addEventListener("track", e => {
    //var tempSource = audioContext.createMediaStreamSource(e.streams[0]);
    //tempSource.connect(audioContext.destination);
      audioEl.srcObject = e.streams[0];
  });

  resonanceGainNode.connect(loopbackDestination);

  loopbackDestination.stream.getTracks().forEach(track => {
    outboundPeerConnection.addTrack(track, loopbackDestination.stream);
  });

  outboundPeerConnection.createOffer().then(offer => {
    outboundPeerConnection.setLocalDescription(offer).catch(onError);

    inboundPeerConnection
      .setRemoteDescription(offer)
      .then(() => {
        inboundPeerConnection
          .createAnswer()
          .then(answer => {
            answer.sdp = answer.sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1');
            inboundPeerConnection.setLocalDescription(answer).catch(onError);

            outboundPeerConnection.setRemoteDescription(answer).catch(onError);
          })
          .catch(onError);
      })
      .catch(onError);
  });
}

    return {
        initResonanceAudio,
        connectVideoToResonanceAudio,
        adjustAudioSourcePositions,
        changeMode,
        getAudioMode,
        setAudioMode,
        resumeAudioContext,
        MODE_SPATIAL,
        MODE_NONE,
    };
};
