// Util.js encapsulates the metadata and preforms calculations on that data.
// Terminology: 
//      point: {0-4}: 0: center of screen; 1-4: corresponding algebraic quadrants
//      quadrant: {1-4}: corresponding algebraic quadrants (same as points 1-4)
let UTIL = {

    // Optional: used to find the center of the screen for calibration 
	centerList: [],
    centerCoord: [],

    // The current user sequence for any given round. 
    // Only will ever be a partial sequence of the true sequence.
    // Used to determine how far and what is the next correct sequence.
	userSequence: [],
    coordList: [],
    contrastMetrics: null,

    // Takes a RGBA vector representing the edges,
    // converts it to grayscale then averages the values
    averageEdges: (edgeData) => {
        let grayscale = tracking.Image.grayscale(edgeData[0],edgeData[1],edgeData[2],false);
        let sum = grayscale.reduce((previous, current) => current += previous);
        let avg = sum / grayscale.length;
        return avg
    },

    createFaceGridFromBox: (wholeFace, faceBox, fgpts) => {
        let h = wholeFace.height
        let w = wholeFace.width
        let [fx,fy,fw,fh] = faceBox;
        let size = 25;
        let xRatio = size / w;
        let yRatio = size / h;

        [fx,fy,fw,fh] = [fx * xRatio,fy * yRatio,fw * xRatio,fh * yRatio]

        let facegrid = []

        for (let y=0; y < size; y++){
            for (let x=0; x < size; x++){
                if(x >= fx && x <= (fx+fw) && y >= fy && y <= (fy+fh)){
                    facegrid.push(1);
                }else {
                    facegrid.push(0);
                }
            }
        }
        return facegrid
    },

    // Given coordinate as a String return corresponding canvas quadrant.
    coordsToQuadrant: (coords) => {
        let [x,y] = UTIL.parseCoords(coords);
        let [xMid, yMid] = UTIL.centerCoord;
        // HardCode option. xMid be zero since the camera 
        // is in the center of the screen when using a laptop.
        // xMid = 0; 
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
        let [x,y] = UTIL.parseCoords(coords);
        let [xMid, yMid] = UTIL.centerCoord();
        // xMid = 0;
        if(x > xMid){
            quadrant = 1
        }else{
            quadrant = 2
        }
        return quadrant;
    },

        // Gets the current average coordinates for the center of screen that is recorded by getCenter(). 
    // Used to determine the boundaries of the quadrants. Default is (0,-2)
    setAvgCenter: () => {
        let xTotal = 0;
        let yTotal = 0;

        if(UTIL.centerList.length == 0){
            return [0,-2]
        }
        for(let i = 0; i < UTIL.centerList.length; i++){
            xTotal +=  UTIL.centerList[i][0];
            yTotal +=  UTIL.centerList[i][1];
        }
        UTIL.centerCoord = [xTotal/UTIL.centerList.length, yTotal/UTIL.centerList.length]
    },

    // Determines the average edge intensity for the eye regions that would be used for detection
    // and shows the resulting edge detection on the saveCanvas. 
    getEdgeMetric: () => {
        let featuresString = TRACKER.getFormatFaceFeatures();
        let features = JSON.parse(featuresString);
        let leftScaledFeatures = UTIL.scaleEyeBox(features['leftEye'], 0.75, 0.5);
        let rightScaledFeatures = UTIL.scaleEyeBox(features['rightEye'], 0.75, 0.5);

        let leftEdges = TRACKER.edgeDetection(TRACKER.getCropedRegion(leftScaledFeatures));
        let rightEdges = TRACKER.edgeDetection(TRACKER.getCropedRegion(rightScaledFeatures));

        let leftAvg = UTIL.averageEdges(leftEdges);
        let rightAvg = UTIL.averageEdges(rightEdges);

        return [leftAvg, rightAvg]

    },


    getModelInput: () => {
        let features = JSON.parse(TRACKER.getFormatFaceFeatures());
        [wholeImage, imageLeft, imageRight, imageFace] = TRACKER.getModelPics(features);
        let faceGrid = UTIL.createFaceGridFromBox(wholeImage, features['face'], features['faceGridPoints']);
        return [imageLeft, imageRight, imageFace, faceGrid]
    },

    // Coordinate string to float array
    // e.g. ("3.2, -5.2") => [3.2, -5.2]
    parseCoords: (coords) => {
        if(typeof(coords) == 'string'){
            let [x,y] = coords.split(",")
            x = parseFloat(x.trim())
            y = parseFloat(y.trim())
            return [x,y]
        }else if(coords.constructor === Float32Array){
            return coords;
        }else{
            // Error
            throw "Coords are neither a string or an array.";
        } 

    },

    scaleEyeBox: ([x,y,boxWidth,boxHeight], widthFactor, heightFactor) => {
        let newWidth = boxWidth * widthFactor;
        let newHeight = boxHeight * heightFactor;
        let newX = (x+boxWidth/2)-newWidth/2;
        let newY = (y+boxHeight/2)-newHeight/2;
        return [newX, newY, newWidth, newHeight];
    },

    newDebouncer: (length) => {

        var Debouncer = {
            length: length,
            sequence: [],
        };

        Debouncer.prototype = {
            clearDebouncer: () => {
                this.sequence = [];
            },

            checkConsistent: (quadrant) =>{
                if(this.sequence.length == 0){
                    throw "debouncerArray has no length. Should not have been called yet.";
                }else{
                    return quadrant == this.sequence[this.sequence.length-1];
                }
            },

            debounce: (newQuadrant) => {
                if(this.sequence.length == 0){
                    this.sequence.push(newQuadrant);
                    return newQuadrant;
                }
                if(this.sequence.length < (this.length)){
                    // Not enough data to determine consistency
                    this.sequence.push(newQuadrant);
                    return -1;
                }else{
                    this.sequence = CONTROLLER.shiftArray(this.sequence, -1);
                    this.sequence.push(newQuadrant);
                    if(this.sequence.every(this.checkConsistent)){
                        return newQuadrant;
                    }else{
                        // Noisy Array
                        return -1;
                    }
                }
            },

            getDebounceProgress: () => {
                let count = this.sequence.map(this.checkConsistent).lastIndexOf(false);
                if(count == -1){
                    return array.length
                }else {
                    return this.length-(count+1);
                }
            },
        };
        return Debouncer
    },



};
