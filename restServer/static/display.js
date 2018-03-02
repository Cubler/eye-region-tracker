// Display.js handles all graphics for feedback.html and dataCollection.html. 
// Application is designed to be used with a maximized browser window for the eye-tracker to 
// have the best performance.
// It requires a:
//      video element for processing features
//      save video element for capturing a higher resolution
//      canvases for each of the videos to display features and send to the server
//      animation canvas for data collection or SimonSays.


let DISPLAY = {

	canvasOffset: null,
	xoffset: null,
	xstart: null,
	yoffset: null,
	ystart: null,
    videoContext: null,
    animationContext: null,
    saveContext: null,
    showTimeout: null,
    saveWidth: 1280,
    saveHeight: 720,
    videoWRatio: null,
    videoHRatio: null,
    scoreElement: null,
    ptSize: 15,
    eps: 0.00001,
    scalePics: 1.75,


    // Draws the point in the corner of the appropriate quadrant.
    // Point domain: 
    //      0: center of the screen
    //      1-4: the corresponding algebraic quadrants 
	drawRectPoint: (point) => {
		let [x, y]  = MODEL.getCanvasPointOffset(point);

        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = "#000000";
        DISPLAY.animationContext.arc(DISPLAY.xstart+(x*DISPLAY.xoffset),(y*DISPLAY.yoffset)+DISPLAY.ystart,DISPLAY.ptSize,0,2*Math.PI);
	    DISPLAY.animationContext.fill();
		
	},

    transitionRecPoint: (prevPoint, currPoint, perimeterPercent) => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);

        let [x1, y1]  = MODEL.getCanvasPointOffset(prevPoint,perimeterPercent);
        let [x2, y2]  = MODEL.getCanvasPointOffset(currPoint,perimeterPercent);
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

    // Draws the eye boxes, the face box, and the landmark point found by the face detection package.
    // [x,y]: the top left coordinate for the corresponding eye or face box
    // boxlength: the length of the side of the square for the given feature
    // landmarks: array of point provided by the face detection package 
    drawLandmarks: ([lx,ly], [rx,ry], [fx,fy], eyeBoxLength, faceBoxLength, landmarks) => {

        DISPLAY.videoContext.strokeStyle = '#a64ceb';
        DISPLAY.videoContext.strokeRect(lx, ly, eyeBoxLength, eyeBoxLength);
        DISPLAY.videoContext.strokeRect(rx, ry, eyeBoxLength, eyeBoxLength);
        DISPLAY.videoContext.strokeRect(fx, fy, faceBoxLength, faceBoxLength);

        for(let l in landmarks){
                DISPLAY.videoContext.beginPath();
                DISPLAY.videoContext.fillStyle = "#fff"
                DISPLAY.videoContext.arc(landmarks[l][0],landmarks[l][1],1,0,2*Math.PI);
                DISPLAY.videoContext.fill();
        }
    },

    // resizes the animation canvas so that it fills the window and is independent of browser.
	resizeCanvas: () => {
		DISPLAY.offset = window.innerWidth * 0.02;
		DISPLAY.xoffset = (window.innerWidth-50)/2-DISPLAY.offset;
   		DISPLAY.xstart = (window.innerWidth-50)/2;
	    DISPLAY.yoffset = window.innerHeight*0.4;
		DISPLAY.ystart = DISPLAY.yoffset + DISPLAY.offset;

        DISPLAY.animationContext.canvas.width = window.innerWidth-50;
        DISPLAY.animationContext.canvas.height = 2*DISPLAY.yoffset+2*DISPLAY.offset;

	},

    showEdges: () => {
        DISPLAY.saveContext.drawImage(DISPLAY.saveVideo, 0, 0, DISPLAY.saveCanvas.width, DISPLAY.saveCanvas.height);
        let imgData = DISPLAY.saveContext.getImageData(0, 0, DISPLAY.saveCanvas.width, DISPLAY.saveCanvas.height);
        let edgeData = TRACKER.edgeDetection(imgData);
        let edgeImageData = DISPLAY.saveContext.createImageData(DISPLAY.saveCanvas.width, DISPLAY.saveCanvas.height);
        edgeImageData.data.set(new Uint8ClampedArray(edgeData[0]));
        DISPLAY.saveContext.putImageData(edgeImageData, 0, 0);
        document.getElementById("saveCanvas").style.filter="invert(100%)";
    },

    showImageData: (edgeData, x, y) => {
        let ctxImageData = DISPLAY.saveContext.createImageData(edgeData[1], edgeData[2]);
        ctxImageData.data.set(new Uint8ClampedArray(edgeData[0]));
        DISPLAY.saveContext.putImageData(ctxImageData, x, y);
    },

    // Given a quadrant, color the quadrant and play its unique sound.
	showFeedback: (quadrant, isSound=true) => {
		let [x,y,color,audioID] = MODEL.getDisplayQuadrantInfo(quadrant);
        let soundElement = document.getElementById(audioID);

        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = color;
        DISPLAY.animationContext.fillRect(DISPLAY.xstart+(x*DISPLAY.xoffset),(y*DISPLAY.yoffset)+DISPLAY.ystart, DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height/2);
        if(isSound){
            soundElement.play();
        }

	},

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

    selectAction: (quadrant) => {
        DISPLAY.drawActionPics();
        let [x,y,color,audioID] = MODEL.getDisplayQuadrantInfo(quadrant, "action");
        DISPLAY.animationContext.strokeRect(DISPLAY.xstart+(x*DISPLAY.xoffset),(y*DISPLAY.yoffset)+DISPLAY.ystart,
            DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height/2);

        let msg = new SpeechSynthesisUtterance(MODEL.words[audioID]);
        window.speechSynthesis.speak(msg);
    },

    drawConfirm: () => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = "#FF0000";
        DISPLAY.animationContext.fillRect(0,0, DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.fillStyle = "#00FF00";
        DISPLAY.animationContext.fillRect(DISPLAY.xoffset,0, DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height);
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

    // Writes the provided sequence into the sequence element so the current sequence is viewable to users.
    showSequenceText: (sequence) => {
        document.getElementById('sequence').value = sequence.toString();
    },

    // returns the current camera frame as a dataURL
    getPicToDataURL: () => {
        document.getElementById("saveCanvas").style.filter="invert(0%)";
        DISPLAY.saveContext.clearRect(0,0, DISPLAY.saveCanvas.width, DISPLAY.saveCanvas.height);
        DISPLAY.saveContext.drawImage(DISPLAY.saveVideo, 0, 0, DISPLAY.saveCanvas.width, DISPLAY.saveCanvas.height);
        return DISPLAY.saveCanvas.toDataURL('image/jpeg');
    },

    // Writes the score parameter in the score html element so it is displayed on the page.
    displayScore: (score) => {
        DISPLAY.scoreElement.value = score;

    },

    // Displays the animation canvas as all green
    showFullColor: (color) => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = color;
        DISPLAY.animationContext.fillRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        
    },

    // Initializes all variables referring to HTML elements that are needed for Display.js
    setup: () => {
        DISPLAY.video = document.getElementById('video');
        DISPLAY.saveVideo = document.getElementById('saveVideo');
        DISPLAY.saveCanvas = document.getElementById('saveCanvas');
        DISPLAY.videoCanvas = document.getElementById('videoCanvas');
        DISPLAY.scoreElement = document.getElementById('score');

        DISPLAY.saveContext = document.getElementById('saveCanvas').getContext('2d');
        DISPLAY.videoContext = document.getElementById('videoCanvas').getContext('2d');
        DISPLAY.animationContext = document.getElementById('animationCanvas').getContext('2d');

        DISPLAY.saveCanvas.width = DISPLAY.saveWidth
        DISPLAY.saveCanvas.height = DISPLAY.saveHeight
        DISPLAY.saveVideo.width = DISPLAY.saveWidth
        DISPLAY.saveVideo.height = DISPLAY.saveHeight
        DISPLAY.videoWRatio = DISPLAY.saveVideo.clientWidth/DISPLAY.video.clientWidth;
        DISPLAY.videoHRatio = DISPLAY.saveVideo.clientHeight/DISPLAY.video.clientHeight;
        
        DISPLAY.resizeCanvas();

        DISPLAY.goPic = new Image();
        DISPLAY.goPic.src = "./static/privatePics/go.png";
        DISPLAY.likePic = new Image();
        DISPLAY.likePic.src = "./static/privatePics/like.png";
        DISPLAY.notPic = new Image();
        DISPLAY.notPic.src = "./static/privatePics/not.png";
        DISPLAY.wantPic = new Image();
        DISPLAY.wantPic.src = "./static/privatePics/want.png";
    },



};

$(document).ready(() => {
    DISPLAY.setup()
});
