// Display.js handles all graphics for feedback.html and dataCollection.html. 
// Application is designed to be used with a maximized browser window for the eye-tracker to 
// have the best performance.
// It requires a:
//      video element for processing features
//      save video element for capturing a higher resolution
//      canvases for each of the videos to display features and send to the server
//      animation canvas for data collection or SimonSays.


let DISPLAY = {

    animationContext: null,
	canvasOffset: null,
    eps: 0.00001,
    ptSize: 15,
    dispContext: null,
    saveWidth: 1280,
    saveHeight: 720,
    scalePics: 1.75,
    scoreElement: null,
    showTimeout: null,
    videoContext: null,
    videoWRatio: null,
    videoHRatio: null,
    xoffset: null,
    xstart: null,
    yoffset: null,
    ystart: null,
    
    // Writes the score parameter in the score html element so it is displayed on the page.
    displayScore: (score) => {
        DISPLAY.scoreElement.value = score;
    },

    // Draws the action pictures 
    drawActionPics: () => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);

        DISPLAY.animationContext.drawImage(DISPLAY.goPic,0,0,DISPLAY.goPic.width*DISPLAY.scalePics, DISPLAY.goPic.height*DISPLAY.scalePics);
        
        DISPLAY.animationContext.drawImage(DISPLAY.notPic,DISPLAY.animationContext.canvas.width-(DISPLAY.notPic.width*DISPLAY.scalePics),0,
            DISPLAY.notPic.width*DISPLAY.scalePics, DISPLAY.notPic.height*DISPLAY.scalePics);
        
        DISPLAY.animationContext.drawImage(DISPLAY.likePic,0,DISPLAY.animationContext.canvas.height - (DISPLAY.likePic.height*DISPLAY.scalePics),
            DISPLAY.likePic.width*DISPLAY.scalePics, DISPLAY.likePic.height*DISPLAY.scalePics);
        
        DISPLAY.animationContext.drawImage(DISPLAY.wantPic,
            DISPLAY.animationContext.canvas.width - (DISPLAY.wantPic.width*DISPLAY.scalePics),
            DISPLAY.animationContext.canvas.height - (DISPLAY.wantPic.height*DISPLAY.scalePics),
            DISPLAY.wantPic.width*DISPLAY.scalePics, DISPLAY.wantPic.height*DISPLAY.scalePics);
    },

    // Used to display confirmation (yes/no) options that are to be selected
    // Fills the left side of the canvas with a red box and the right side with a green box
    drawConfirm: () => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = "#FF0000";
        DISPLAY.animationContext.fillRect(0,0, DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.fillStyle = "#00FF00";
        DISPLAY.animationContext.fillRect(DISPLAY.xoffset,0, DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height);
    },

    // Draws the point in the corner of the appropriate quadrant.
    // Point domain: 
    //      0: center of the screen
    //      1-4: the corresponding algebraic quadrants 
	drawRectPoint: (point, perimeterPercent = 1) => {
		let [x, y]  = CONTROLLER.getCanvasPointOffset(point, perimeterPercent);

        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = "#000000";
        DISPLAY.animationContext.arc(DISPLAY.xstart+(x*DISPLAY.xoffset),(y*DISPLAY.yoffset)+DISPLAY.ystart,DISPLAY.ptSize,0,2*Math.PI);
	    DISPLAY.animationContext.fill();
	},

    // resizes the animation canvas so that it fills the window and is independent of browser.
	resizeCanvas: () => {
		DISPLAY.offset = window.innerWidth * 0.02;
		DISPLAY.xoffset = (window.innerWidth-50)/2-DISPLAY.offset;
   		DISPLAY.xstart = (window.innerWidth-50)/2;
	    DISPLAY.yoffset = window.innerHeight*0.45;
		DISPLAY.ystart = DISPLAY.yoffset + DISPLAY.offset;

        DISPLAY.animationContext.canvas.width = window.innerWidth-50;
        DISPLAY.animationContext.canvas.height = 2*DISPLAY.yoffset+2*DISPLAY.offset;
	},

    selectAction: (quadrant) => {
        DISPLAY.drawActionPics();
        let [x,y,pic, audioID] = DISPLAY.quadToPic[quadrant];
        let picWidth = pic.width*DISPLAY.scalePics;
        let picHeight = pic.height*DISPLAY.scalePics;

        let xPicOffset = DISPLAY.animationContext.canvas.width-picWidth;
        let yPicOffset = DISPLAY.animationContext.canvas.height-picHeight;

        DISPLAY.animationContext.lineWidth = 10; 

        DISPLAY.animationContext.strokeRect(x*xPicOffset, y*yPicOffset, picWidth, picHeight);

        let msg = new SpeechSynthesisUtterance(CONTROLLER.words[audioID]);
        window.speechSynthesis.speak(msg);
    },

    // Displays the comment in the relative center of the screen for the time duration (in milliseconds) 
    showComment: (comment, time = 2000) => {
        return new Promise((resolve, reject) => {
            DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
            DISPLAY.animationContext.fillStyle = "#000000";
            DISPLAY.animationContext.font = "80px Georgia";
            DISPLAY.animationContext.fillText(comment, DISPLAY.xstart*(5.0/6), DISPLAY.ystart);
            setTimeout(() => {
                DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
                resolve();
            }, time);
        });
    },

    showCommentAt: (comment, x, y) => {
        DISPLAY.animationContext.fillStyle = "#000000";
        DISPLAY.animationContext.font = "80px Georgia";
        DISPLAY.animationContext.fillText(comment, DISPLAY.xstart+(x*DISPLAY.xoffset), (y*DISPLAY.yoffset)+DISPLAY.ystart);
    },

    showDebounceProgress: () => {
        let count = CONTROLLER.debouncer.getDebounceProgress(CONTROLLER.debouncer);
        let quadrant = CONTROLLER.debouncer.getRecent(CONTROLLER.debouncer);
        let [x,y] = CONTROLLER.getCanvasPointOffset(quadrant, 0.9);
        DISPLAY.showCommentAt(count,x,y);
    },

    showEdges: () => {
        
        let imgData = TRACKER.getSaveCanvasImageData();
        let edgeData = TRACKER.edgeDetection(imgData);
        let edgeImageData = DISPLAY.dispContext.createImageData(DISPLAY.saveWidth, DISPLAY.saveHeight);
        edgeImageData.data.set(new Uint8ClampedArray(edgeData[0]));
        DISPLAY.dispContext.putImageData(edgeImageData, 0, 0);
        document.getElementById("saveCanvas").style.filter="invert(100%)";
    },

    // Given a quadrant, color the quadrant and play its unique sound.
    showFeedback: (quadrant, isSound=true) => {
        let [x,y,color,audioID] = CONTROLLER.getDisplayQuadrantInfo(quadrant);
        let soundElement = document.getElementById(audioID);

        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = color;
        DISPLAY.animationContext.fillRect(DISPLAY.xstart+(x*DISPLAY.xoffset),(y*DISPLAY.yoffset)+DISPLAY.ystart, DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height/2);
        if(isSound){
            soundElement.play();
        }

    },

    // Displays the color across the whole animation canvas 
    showFullColor: (color) => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = color;
        DISPLAY.animationContext.fillRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
    },

    showImageData: (edgeData, x, y) => {
        let ctxImageData = DISPLAY.dispContext.createImageData(edgeData[1], edgeData[2]);
        ctxImageData.data.set(new Uint8ClampedArray(edgeData[0]));
        DISPLAY.dispContext.putImageData(ctxImageData, x, y);
    },

    // Return a promise that resolves when the the animation for the given sequence
    // has finished. The animation consists of showing the unique feedback for each 
    // quadrant in the sequence for one second.
    showSequence: (sequence) => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.showSequenceText(sequence)
        return new Promise((resolve,reject) => {
            if(sequence.length == 0){
                DISPLAY.showFeedback(-1);
            }else{
                let j=0
                DISPLAY.showTimeout = setInterval(function(){
                    if(j<sequence.length){
                        DISPLAY.showFeedback(sequence[j++]);
                    }else{
                        clearTimeout(DISPLAY.showTimeout)

                        resolve()                
                    }
                }, 1000);
            }
        });
    },

    // Writes the provided sequence into the sequence element so the current sequence is viewable to users.
    showSequenceText: (sequence) => {
        document.getElementById('sequence').value = sequence.toString();
    },

    showTrialStats: () => {
        CONTROLLER.getTrialStats().then((stats) => {
            resultString = "quadrantAccuracy: " + stats['quadrantAccuracy'].toFixed(2) + '\n' +
            "eyeMetricAverage: " + stats['eyeMetricAverage'][0].toFixed(2) + 
            ", " + stats['eyeMetricAverage'][1].toFixed(2) + '\n'
            document.getElementById('coordsList').value = resultString;
        });
    },

    // Initializes all variables referring to HTML elements that are needed for Display.js
    setup: () => {

        // $('div.view-frame').append(TRACKER.trackVid)
        // $('div.view-frame').append(TRACKER.trackCanvas)
        TRACKER.trackVid.className = "displayFeatures"
        TRACKER.trackCanvas.className = "displayFeatures"

        DISPLAY.saveCanvas = document.getElementById('saveCanvas');
        DISPLAY.videoCanvas = document.getElementById('videoCanvas');
        DISPLAY.scoreElement = document.getElementById('score');

        DISPLAY.dispContext = document.getElementById('saveCanvas').getContext('2d');
        DISPLAY.videoContext = document.getElementById('videoCanvas').getContext('2d');
        DISPLAY.animationContext = document.getElementById('animationCanvas').getContext('2d');

        DISPLAY.saveCanvas.width = DISPLAY.saveWidth
        DISPLAY.saveCanvas.height = DISPLAY.saveHeight
        
        DISPLAY.resizeCanvas();

        DISPLAY.goPic = new Image();
        DISPLAY.goPic.src = "./static/privatePics/go.png";
        DISPLAY.likePic = new Image();
        DISPLAY.likePic.src = "./static/privatePics/like.png";
        DISPLAY.notPic = new Image();
        DISPLAY.notPic.src = "./static/privatePics/not.png";
        DISPLAY.wantPic = new Image();
        DISPLAY.wantPic.src = "./static/privatePics/want.png";

        DISPLAY.quadToPic = {
            1: [1, 0, DISPLAY.notPic, "audio1"],
            2: [0, 0, DISPLAY.goPic, "audio2"],
            3: [0, 1, DISPLAY.likePic, "audio3"],
            4: [1, 1, DISPLAY.wantPic, "audio4"],
        }
    },

    transitionRecPoint: (prevPoint, currPoint, perimeterPercent) => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);

        let [x1, y1]  = CONTROLLER.getCanvasPointOffset(prevPoint,perimeterPercent);
        let [x2, y2]  = CONTROLLER.getCanvasPointOffset(currPoint,perimeterPercent);
        let xDiff = -(x1*DISPLAY.xoffset-x2*DISPLAY.xoffset)
        let yDiff = -(y1*DISPLAY.yoffset-y2*DISPLAY.yoffset)
        let stepRatio = 0.05
        let currRatio = stepRatio

        return new Promise((resolve, reject) => {
            let transitionTimeout = setInterval(function(){
                DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
                DISPLAY.animationContext.beginPath();
                DISPLAY.animationContext.arc(DISPLAY.xstart+(x1*DISPLAY.xoffset)+xDiff*currRatio,(y1*DISPLAY.yoffset)+DISPLAY.ystart+yDiff*currRatio,DISPLAY.ptSize,0,2*Math.PI);
                DISPLAY.animationContext.fill();
                currRatio = currRatio + stepRatio
                if(currRatio > 1.0+DISPLAY.eps){
                    clearTimeout(transitionTimeout);
                    resolve();
                }
            }, 75);
        });
    },

};

$(document).ready(() => {
    DISPLAY.setup()
});
