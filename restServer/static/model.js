// Model.js encapsulates the metadata and preforms calculations for dataCollection.html and feedback.js
// Terminology: 
//      point: {0-4}: 0: center of screen; 1-4: corresponding algebraic quadrants
//      quadrant: {1-4}: corresponding algebraic quadrants (same as points 1-4)
let MODEL = {

    // Optional: used to find the center of the screen for calibration 
	centerList: [],

    // The current score for SimonSays
    score: 0,

    // The sequence to match for the current round of simonsays.
    // For info on how its generated, see setSequence()
	sequence: [],

    // The current user sequence for any given round. 
    // Only will ever be a partial sequence of the true sequence.
    // Used to determine how far and what is the next correct sequence.
	userSequence: [],

    words: {
        "audio1": "Not",
        "audio2": "Go",
        "audio3": "Like",
        "audio4": "Want",
    },

    // Takes a RGBA vector representing the edges,
    // converts it to grayscale then averages the values
    averageEdges: (edgeData) => {
        let grayscale = tracking.Image.grayscale(edgeData[0],edgeData[1],edgeData[2],false);
        let sum = grayscale.reduce((previous, current) => current += previous);
        let avg = sum / grayscale.length;
        return avg
    },

    // Given coordinate as a String return corresponding canvas quadrant.
    coordsToQuadrant: (coords) => {
        let [x,y] = MODEL.parseCoords(coords);
        let [xMid, yMid] = MODEL.getAvgCenter();
        xMid = 0;
        if(x > xMid){
            if(y > yMid){ 
                quadrant = 1
            }else {
                quadrant = 4
            }
        }else{
            if(y > yMid){
                quadrant = 2
            }else {
                quadrant = 3
            }
        }
        return quadrant;
    },

    coordsToLeftRight: (coords) => {
        let [x,y] = MODEL.parseCoords(coords);
        let [xMid, yMid] = MODEL.getAvgCenter();
        xMid = 0;
        if(x > xMid){
            quadrant = 1
        }else{
            quadrant = 2
        }
        return quadrant;
    },

    // Given a point such that
    //      0: center of screen
    //      1-4: algebraic quadrants
    // returns the x and y offsets from the origin for that point
	getCanvasPointOffset: (point, perimeterPercent=1) => {
		let x = null;
		let y = null;
		switch(parseInt(point)){
            case 0: x=0;
                    y=0;
                    break;
            case 1: x=1;
                    y=-1;
                    break;
            case 2: x=-1;
                    y=-1;
                    break;
            case 3: x=-1;
                    y=1;
                    break;  
            case 4: x=1;
                    y=1;
                    break; 
    	}
		return [x*perimeterPercent,y*perimeterPercent]
	},

    // Gets the current average coordinates for the center of screen that is recorded by getCenter(). 
    // Used to determine the boundaries of the quadrants. Default is (0,-2)
    getAvgCenter: () => {
        let xTotal = 0;
        let yTotal = 0;

        if(MODEL.centerList.length == 0){
            return [0,-2]
        }
        for(let i = 0; i < MODEL.centerList.length; i++){
            xTotal +=  MODEL.centerList[i][0];
            yTotal +=  MODEL.centerList[i][1];
        }
        return [xTotal/MODEL.centerList.length, yTotal/MODEL.centerList.length]
    },

    // given a quadrant
	getDisplayQuadrantInfo: (quadrant) => {
		let x = null;
		let y = null;
        let color = "#FFFFFF";
        let audioID = "default";

        switch(parseInt(quadrant)){
            case 1: 
        		x=0;
                y=-1;
                color = "#FF0000";
                audioID = "audio1";
                break;
            case 2: 
        		x=-1;
                y=-1;
                color = "#00FF00";
                audioID = "audio2";
                break;
            case 3: 
	    		x=-1;
	            y=0;
	            color = "#0000FF";
	            audioID = "audio3";
	            break;  
            case 4: 
        		x=0;
                y=0;
                color = "#FFFF00";
                audioID = "audio4";
                break; 
            default:
            	x=-1;
                y=-1;
                color = "#000000";
                audioID = "default";
                break;
    	}
    	return [x,y,color,audioID];
	},


    // Determines the average edge intensity for the eye regions that would be used for detection
    // and shows the resulting edge detection on the saveCanvas. 
    getEdgeMetric: () => {
        let featuresString = TRACKER.getFormatFaceFeatures();
        let features = JSON.parse(featuresString);
        let leftScaledFeatures = MODEL.scaleEyeBox(features['leftEye'], 0.75, 0.5);
        let rightScaledFeatures = MODEL.scaleEyeBox(features['rightEye'], 0.75, 0.5);

        let leftEye = TRACKER.getCropedRegion(leftScaledFeatures);
        let rightEye = TRACKER.getCropedRegion(rightScaledFeatures);

        let leftEdges = TRACKER.edgeDetection(leftEye);
        let rightEdges = TRACKER.edgeDetection(rightEye);

        DISPLAY.showImageData(leftEdges, leftScaledFeatures[0], leftScaledFeatures[1]);
        DISPLAY.showImageData(rightEdges, rightScaledFeatures[0], rightScaledFeatures[1]);

        let leftAvg = MODEL.averageEdges(leftEdges);
        let rightAvg = MODEL.averageEdges(rightEdges);

        document.getElementById('edgeMetric').value = parseFloat(leftAvg).toFixed(2) +", " + parseFloat(rightAvg).toFixed(2);
        return [leftAvg, rightAvg]

    },

    getModelInput: () => {
        let features = JSON.parse(TRACKER.getFormatFaceFeatures());
        [wholeImage, imageLeft, imageRight, imageFace] = getModelPics(features);
        let faceGrid = createFaceGridFromBox(wholeImage, features['face'], features['faceGridPoints']);
        return [imageLeft, imageRight, imageFace, faceGrid]
    },

    getModelPics: (features) => {
        let wholeImage = DISPLAY.getSaveCanvasImageData();
        let imageLeft = DISPLAY.saveContext.getImageData.apply(this, features['leftEye']);
        let imageRight = DISPLAY.saveContext.getImageData.apply(this, features['rightEye']);
        let imageFace = DISPLAY.saveContext.getImageData.apply(this, features['face']);
        return [wholeImage, imageLeft, imageRight, imageFace]
    },  

    createFaceGridFromBox: (wholeFace, faceBox, fgpts) => {
        let h = wholeFace.height
        let w = wholeFace.width

        let vol = new Net.Vol(w, h, 1, 0.0);
        let [fx,fy,fw,fh] = faceBox;
        let facegrid = []

        for (let y=0; y < h; y++){
            for (let x=0; x < w; x++){
                if(x >= fx and x <= (fx+fw) and y >= fy and y <= (fy+fh)){
                    faceGrid.append(1);
                }else {
                    faceGrid.append(0);
                }
            }
        }

        return facegrid

    },

    // Tests if the partialSequence is matching the primarySequence so far.
    // Input: Two arrays
    // e.g. primary = [1,2,3,2] partial = [1,2] returns true
    isSequenceMatching: (primarySequence, partialSequence) => {
        if(primarySequence.length == 0){
            return true;
        }if(partialSequence.length > primarySequence.length){
            return false;
        }for(var i=0; i<partialSequence.length; i++){
            if(primarySequence[i] != partialSequence[i]){
                return false;       
            }else{
                continue;   
            }
        }return true
    },

	// Coordinate string to float array
	// e.g. ("3.2, -5.2") => [3.2, -5.2]
	parseCoords: (coords) => {
        let [x,y] = coords.split(",")
        x = parseFloat(x.trim())
        y = parseFloat(y.trim())
        return [x,y]
	},

    scaleEyeBox: ([x,y,boxWidth,boxHeight], widthFactor, heightFactor) => {
        let newWidth = boxWidth * widthFactor;
        let newHeight = boxHeight * heightFactor;
        let newX = (x+boxWidth/2)-newWidth/2;
        let newY = (y+boxHeight/2)-newHeight/2;
        return [newX, newY, newWidth, newHeight];
    },

    // given the desired sequence length, generate and set the current sequence 
    // such that subsequent quadrants are either one clockwise or counter-clockwise
    // from the current previous quadrant. Never the same or across the origin.
	setNewSequence: (seqLen) => {
		MODEL.sequence = [];
		MODEL.sequence.push(Math.floor(Math.random() * 4) + 1)
        for(var i=1; i < seqLen; i++){
            var choose = (Math.random() < 0.5) ? -1 : 1;
            var newQuadrant = (MODEL.sequence[i-1] + choose) % 4
            if(newQuadrant == 0){
                newQuadrant = 4; 
            }
            MODEL.sequence.push(newQuadrant);
        }
        DISPLAY.showSequenceText(MODEL.sequence);
        return MODEL.sequence;
	},

    // Given a number to change the score by (scoreChange), update to the 
    // new score and display it.
    updateScore: (scoreChange) => {
        MODEL.score += scoreChange;
        DISPLAY.displayScore(MODEL.score);
    },

}

