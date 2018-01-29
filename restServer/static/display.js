let DISPLAY = {

	canvasOffset: null,
	xoffset: null,
	xstart: null,
	radius: null,
	ystart: null,
	canvasContext: null,
    videoContext: null,
    saveContext: null,  


	drawRectPoint: (point, canvasContext) => {
		let [x, y]  = MODEL.getCanvasPointOffset(point);

        canvasContext.clearRect(0,0,canvasContext.canvas.width, canvasContext.canvas.height);
        canvasContext.beginPath();
        canvasContext.arc(xstart+(x*xoffset),(y*r)+ystart,ptSize,0,2*Math.PI);
		canvasContext.fill();
		
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

		canvasContext.canvas.width = window.innerWidth-50;
		canvasContext.canvas.height = 2*DISPLAY.radius+2*DISPLAY.offset;

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

    getPicToDataURL: () => {
        return DISPLAY.saveContext.toDataURL('image/jpeg');
    },

};

$(document).ready(() => {

});