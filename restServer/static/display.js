let DISPLAY = {

	canvasOffset: null,
	xoffset: null,
	xstart: null,
	radius: null,
	ystart: null,
    videoContext: null,
    animationContext: null,
    saveContext: null,
    showTimeout: null,
    saveWidth: 800,
    saveHeight: 600,
    videoWRatio: null,
    videoHRatio: null,
    scoreElement: null,


	drawRectPoint: (point) => {
		let [x, y]  = MODEL.getCanvasPointOffset(point);

        DISPLAY.animationContext.clearRect(0,0,canvasContext.canvas.width, canvasContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.arc(xstart+(x*xoffset),(y*r)+ystart,ptSize,0,2*Math.PI);
	    DISPLAY.animationContext.fill();
		
	},

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

	resizeCanvas: () => {
		DISPLAY.offset = window.innerWidth * 0.02;
		DISPLAY.xoffset = (window.innerWidth-50)/2-DISPLAY.offset;
   		DISPLAY.xstart = (window.innerWidth-50)/2;
	    DISPLAY.radius = window.innerHeight*0.4;
		DISPLAY.ystart = DISPLAY.radius + DISPLAY.offset;

        DISPLAY.animationContext.canvas.width = window.innerWidth-50;
        DISPLAY.animationContext.canvas.height = 2*DISPLAY.radius+2*DISPLAY.offset;

	},

	showFeedback: (quadrant) => {
		let [x,y,color,audioID] = MODEL.getDisplayQuadrantInfo(quadrant);
        let soundElement = document.getElementById(audioID);

        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = color;
        DISPLAY.animationContext.fillRect(DISPLAY.xstart+(x*DISPLAY.xoffset),(y*DISPLAY.radius)+DISPLAY.ystart, DISPLAY.animationContext.canvas.width/2, DISPLAY.animationContext.canvas.height/2);
        soundElement.play();

	},

    showSequence: (sequence) => {
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

    updateSequence: (sequence) => {
        document.getElementById('sequence').value = sequence.toString();
    },

    getPicToDataURL: () => {
        DISPLAY.saveContext.clearRect(0,0, DISPLAY.saveCanvas.width, DISPLAY.saveCanvas.height);
        DISPLAY.saveContext.drawImage(DISPLAY.saveVideo, 0, 0, DISPLAY.saveCanvas.width, DISPLAY.saveCanvas.height);
        return DISPLAY.saveCanvas.toDataURL('image/jpeg');
    },

    displayScore: (score) => {
        DISPLAY.scoreElement.value = score;

    },

    showRoundComplete: () => {
        DISPLAY.animationContext.clearRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        DISPLAY.animationContext.beginPath();
        DISPLAY.animationContext.fillStyle = "#00FF00";
        DISPLAY.animationContext.fillRect(0,0,DISPLAY.animationContext.canvas.width, DISPLAY.animationContext.canvas.height);
        
    },

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
    },



};

$(document).ready(() => {
    DISPLAY.setup()
});
