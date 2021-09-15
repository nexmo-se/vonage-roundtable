OTSpacialAudio = () => {
    
let isSupported = false;
let audioContext = undefined;
let resonanceAudioScene = undefined;
let resonanceGain = undefined;
var resonanceSources = {};
var noneGains = {};

let subscriberStreamMap = {};
let MODE_NONE=0;
let MODE_SPATIAL=2;

var roomWidth = 7;
var roomHeight = 3;
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
    try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  } catch (e) {
    console.log('Web Audio API is not supported in this browser.');
    isSupported = false;
    return;
  }
   isSupported = true;
    resonanceGain = audioContext.createGain();
    resonanceAudioScene = new ResonanceAudio(audioContext,{
        ambisonicOrder: 1
    });
    
    resonanceAudioScene.output.connect(resonanceGain);
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
        setNoneGainValue(0);
    }
    else if(mode == MODE_NONE){
        console.log("mode is mono now");
        resonanceGain.gain.value=0;
        setNoneGainValue(1);
    }
}

function setNoneGainValue(val){
    if(!isSupported)
        return;
    for (var streamId in noneGains) {
        noneGains[streamId].gain.value=val;
    }
}

function disconnectVideoFromResonance(subscriber){
    let streamId = subscriber.id;
    if(resonanceSources[streamId])
        resonanceSources[streamId].disconnect();
    if(noneGains[streamId])
        noneGains[streamId].disconnect();
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
        setSourcePosition(streams[i].subscriber.id,relativeX,0,relativeZ);
    }
}
function connectVideoToResonanceAudio(subscriber,x=1,y=0,z=1) {
    if(!isSupported)
        return;
    let subscriberId = subscriber.id;
    subscriber.setAudioVolume(0);
    
    console.log("Adding streamId="+subscriber.stream.id+" to the map");
    /* find the video element */
    var videoElem = undefined;
    var subscriberElem = document.getElementById(subscriberId);
    var children = subscriberElem.getElementsByTagName('*');
    for (var i = -1, l = children.length; ++i < l;) {
        if(children[i].nodeName=="VIDEO"){
            videoElem = children[i];
        }
    }
    if(videoElem == undefined){
        console.log("Video Element null in connectVideoToResonanceAudio. Something terribly wrong");
        return;
    }
    
    let audioElementSource = audioContext.createMediaStreamSource(videoElem.captureStream ? videoElem.captureStream():videoElem.mozCaptureStream());
    let source = resonanceAudioScene.createSource();
    audioElementSource.connect(source.input);
    source.setPosition(x, y, z);
    resonanceSources[subscriberId] = source;
    
    let noneGain = audioContext.createGain();
    audioElementSource.connect(noneGain);
    noneGain.connect(audioContext.destination);
    noneGains[subscriberId] = noneGain;
    if(audioMode == MODE_SPATIAL)
        noneGain.gain.value=0;
    else
        noneGain.gain.value=1;
    
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
