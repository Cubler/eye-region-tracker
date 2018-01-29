let DISPLAY = {

	canvasOffset: null,
	xoffset: null,
	xstart: null,
	radius: null,
	ystart: null,
	faceContext: null,
    videoContext: null,
    saveContext: null,
    showTimeout: null,
    saveWidth: 800,
    saveHeight: 600,
    videoWRatio: null,
    videoHRatio: null,


	drawRectPoint: (point, canvasContext) => {
		let [x, y]  = MODEL.getCanvasPointOffset(point);

        animationContext.clearRect(0,0,canvasContext.canvas.width, canvasContext.canvas.height);
        animationContext.beginPath();
        animationContext.arc(xstart+(x*xoffset),(y*r)+ystart,ptSize,0,2*Math.PI);
		animationContext.fill();
		
	},

    drawLandmarks: ([lx,ly], [rx,ry], [fx,fy], eyeBoxLength, faceBoxLength, landmarks) => {

        videoContext.strokeStyle = '#a64ceb';
        videoContext.strokeRect(lx, ly, eyeBoxLength, eyeBoxLength);
        videoContext.strokeRect(rx, ry, eyeBoxLength, eyeBoxLength);
        videoContext.strokeRect(fx, fy, faceBoxLength, faceBoxLength);

        for(let l in landmarks){
                videoContext.beginPath();
                videoContext.fillStyle = "#fff"
                videoContext.arc(landmarks[l][0],landmarks[l][1],1,0,2*Math.PI);
                videoContext.fill();
        }
    },

	resizeCanvas: (canvasContext) => {
		DISPLAY.offset = window.innerWidth * 0.02;
		DISPLAY.xoffset = (window.innerWidth-50)/2-DISPLAY.offset;
   		DISPLAY.xstart = (window.innerWidth-50)/2;
	    DISPLAY.radius = window.innerHeight*0.4;
		DISPLAY.ystart = DISPLAY.radius + DISPLAY.offset;

		animationContext.canvas.width = window.innerWidth-50;
		animationContext.canvas.height = 2*DISPLAY.radius+2*DISPLAY.offset;

	},

	showFeedback: (canvasContext, quadrant) => {
		let [x,y,color,audioID] = MODEL.getDisplayQuadrantInfo(quadrant);
        let soundElement = document.getElementById(audio);

        canvasContext.clearRect(0,0,canvasContext.canvas.width, canvasContext.canvas.height);
        canvasContext.beginPath();
        canvasContext.fillStyle = color;
        canvasContext.fillRect(xstart+(x*xoffset),(y*r)+ystart,canvasContext.canvas.width/2, canvasContext.canvas.height/2);
        soundElement.play();

	},

    showSequence: (sequence) => {
        if(sequence.length == 0){
            showFeedback(-1);
        }else{
            let j=0
            DISPLAY.showTimeout = setInterval(function(){
                if(j<sequence.length){
                    showFeedback(sequence[j++]);
                }else{
                    clearTimeout(DISPLAY.showTimeout)                
                }
            }, 1000);
        }
    },

    getPicToDataURL: () => {
        return DISPLAY.saveContext.toDataURL('image/jpeg');
    },

    setup: () => {
        DISPLAY.video = document.getElementById('video');
        DISPLAY.saveVideo = document.getElementById('saveVideo');
        DISPLAY.saveCanvas = document.getElementById('saveCanvas');

        DISPLAY.saveContext = document.getElementById('saveCanvas').getContext('2d');
        DISPLAY.videoContext = document.getElementById('videoCanvas').getContext('2d');
        DISPLAY.animationContext = document.getElementById('animationCanvas').getContext('2d');

        DISPLAY.saveCanvas.width = DISPLAY.saveWidth
        DISPLAY.saveCanvas.height = DISPLAY.saveHeight
        DISPLAY.saveVideo.width = DISPLAY.saveWidth
        DISPLAY.saveVideo.height = DISPLAY.saveHeight
        DISPLAY.videoWRatio = DISPLAY.saveVideo.clientWidth/DISPLAY.video.clientWidth;
        DISPLAY.videoHRatio = DISPLAY.saveVideo.clientHeight/DISPLAY.video.clientHeight;

    },


};

$(document).ready(() => {
    DISPLAY.setup()
});