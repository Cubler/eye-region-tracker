let CONTROLLER = {

	serverURL: "https://localhost:3000",
    realTimeURL: "/getCoordsFast",
    isLoopInput: false,


    getRequest: (method, url, data) =>{
        return new Promise((resolve, reject) => {
            $.ajax({
                type: method,
                url: url,
                data: data,
                success: function(coords){
                   resolve(coords);
                }, 
                error: function(exception){
                  reject(exception);
                }
            });
        });
    },

    getUserFeedbackCoords: () => {
        MODEL.userSequence = [];
        CONTROLLER._getUserFeedbackCoords(true);
    },

    _getUserFeedbackCoords: (isLoopInput = false) => {
        let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: TRACKER.getFormatFaceFeatures(),
            currentPosition: null,
            saveSubPath: null,
        };

        CONTROLLER.getRequest(method, url, data).then((coords) => {
            let quadrant = MODEL.coordsToQuadrant(coords);
            if(MODEL.userSequence.length == 0 || MODEL.userSequence[MODEL.userSequence.length-1] != quadrant){
                MODEL.userSequence.push(quadrant);
                DISPLAY.showFeedback(quadrant);

                if(MODEL.isSequenceMatching(MODEL.sequence, MODEL.userSequence)){
                    if(MODEL.sequence.length != 0 && MODEL.userSequence.length == MODEL.sequence.length){
                        console.log("Completed round!")
                        return;
                    }else {
                        // Matching so far, keep getting input
                        if(isLoopInput){
                            CONTROLLER._getUserFeedbackCoords(true);
                        }
                    }
                }else{
                    if(isLoopInput){
                        CONTROLLER._getUserFeedbackCoords(true);
                    }
                    console.log("Incorrect quadrant: " + quadrant);
                }  
            }else{
                if(isLoopInput){
                    CONTROLLER._getUserFeedbackCoords(true);
                }
            }

        }, (error) => {
            console.log(error);
        });

    },


    capture: () => {
        MODEL.userSequence = [];
        CONTROLLER._getUserFeedbackCoords(false);

    },

    getCenter: () => {
        console.log("GetCenter() not implemented now");
    },

    cancelButtonMethod: () => {
        CONTROLLER.isCanceled = true;
        console.log("cancelButtonMethod() not implemented now");

    },

    getNewSequence: () => {
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        MODEL.setNewSequence(maxSeqLen);
    },

    startSimonSays: () => {
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);

        if(MODEL.sequence.length == 0){
            MODEL.setNewSequence(maxSeqLen);
        }
        DISPLAY.showSequence(MODEL.sequence);
    },



} 
