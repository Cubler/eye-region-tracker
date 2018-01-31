let MODEL = {

	centerList: [],
	sequence: [],
	userSequence: [],

	getCanvasPointOffset: (point) => {
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
		return [x,y]
	},


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

	// Coordinate String to corresponding canvas quadrant. Quadrant numbering 
	// correspond both to algebra quadrants and the tracking point number
	coordsToQuadrant: (coords) => {
        let [x,y] = MODEL.parseCoords(coords);
        let [xMid, yMid] = MODEL.getAvgCenter();

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

	// Coordinate string to float array
	// e.g. ("3.2, -5.2") => [3.2, -5.2]
	parseCoords: (coords) => {
        let [x,y] = coords.split(",")
        x = parseFloat(x.trim())
        y = parseFloat(y.trim())
        return [x,y]
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
            xTotal += MODEL.centerList[i][0]
            yTotal += MODEL.centerList[i][1]
        }
        return [xTotal/MODEL.centerList.length, yTotal/MODEL.centerList.length]
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

	setNewSequence: (maxSeqLen) => {
		MODEL.sequence = [];
		MODEL.sequence.push(Math.floor(Math.random() * 4) + 1)
        for(var i=1; i < maxSeqLen; i++){
            var choose = (Math.random() < 0.5) ? -1 : 1;
            var newQuadrant = (MODEL.sequence[i-1] + choose) % 4
            if(newQuadrant == 0){
                newQuadrant = 4; 
            }
            MODEL.sequence.push(newQuadrant);
        }
        DISPLAY.updateSequence(MODEL.sequence);
        return MODEL.sequence;
	},


}

