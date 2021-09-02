OTSpacialAudio = () => {
    
let audioContext = undefined;
let resonanceAudioScene = undefined;
let resonanceGain = undefined;
var resonanceSources = {};
var noneGains = {};

let MODE_NONE=0;
let MODE_SPATIAL=2;

var roomWidth = 7;
var roomHeight = 3;
var roomDepth = 7;
var dimensionFactor = 1;

var audioMode = MODE_NONE;

function resumeAudioContext(){
    audioContext.resume();
}
function getAudioMode(){
    return audioMode;
}

function setAudioMode(mode){
    console.log("Changing mode to: "+audioMode);
    audioMode = mode;
    changeMode(audioMode);
}

function initResonanceAudio() {
    audioContext = new AudioContext();
    resonanceGain = audioContext.createGain();
    resonanceAudioScene = new ResonanceAudio(audioContext,{
        ambisonicOrder: 1
    });
    
    resonanceAudioScene.output.connect(resonanceGain);
    resonanceGain.connect(audioContext.destination);

    let roomDimensions = {
        width: roomWidth*dimensionFactor,
        height: roomHeight*dimensionFactor,
        depth: roomDepth*dimensionFactor,
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
    if(mode == MODE_SPATIAL){
        resonanceGain.gain.value=1;
        setNoneGainValue(0);
    }
    else if(mode == MODE_NONE){
        resonanceGain.gain.value=0;
        setNoneGainValue(1);
    }
}

function setNoneGainValue(val){
    for (var streamId in noneGains) {
        noneGains[streamId].gain.value=val;
    }
}

function connectVideoToResonanceAudio(streamId,x=10,y=0,z=10) {
    /* find the video element */
    var videoElem = undefined;
    var subscriberElem = document.getElementById(streamId);
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
    videoElem.volume=0;
    let audioElementSource = audioContext.createMediaStreamSource(videoElem.captureStream ? videoElem.captureStream():videoElem.mozCaptureStream());
    let source = resonanceAudioScene.createSource();
    audioElementSource.connect(source.input);
    source.setPosition(x, y, x);
    resonanceSources[streamId] = source;
    
    let noneGain = audioContext.createGain();
    audioElementSource.connect(noneGain);
    noneGain.connect(audioContext.destination);
    noneGains[streamId] = noneGain;
    if(audioMode == MODE_SPATIAL)
        noneGain.gain.value=0;
    else
        noneGain.gain.value=1;
}

function setSourcePosition(streamId,x,y,z){
	resonanceSources[streamId].setPosition(x,y,z);
}

function sourceExists(streamId){
    return resonanceSources.hasOwnProperty(streamId);
}

function setListenerOrientation(x,y,z,ux,uy,uz){
	resonanceAudioScene.setListenerOrientation(x,y,z,ux,uy,uz);
}

function setListenerPosition(x,y,z){
	resonanceAudioScene.setListenerPosition(x,y,z);
    audioContext.listener.setPosition(x, y, z);
}

    return {
        initResonanceAudio,
        connectVideoToResonanceAudio,
        changeMode,
        resumeAudioContext,
        MODE_SPATIAL,
        MODE_NONE,
    };
};
