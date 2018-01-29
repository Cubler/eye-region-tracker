let CONTROLLER = {

	serverURL: "https://localhost:3000",
    realTimeURL: "/getCoordsFast",
    isLoopInput: false,


    getRequest: (method, url, data) =>{
        return new Promise((resolve, reject) => {
            $.ajax({
                type: this.method,
                url: this.url,
                data: this.data,
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
        CONTROLLER._getUserFeedbackCoords(true);
    },

    _getUserFeedbackCoords: (isLoopInput = false) => {
        let method = "GET";
        let url = serverURL + realTimeURL;
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: TRACKER.getFormatFaceFeatures(),
            currentPosition: null,
            saveSubPath: null,
        };

        CONTROLLER.getRequest(method, url, data).then((coords) => {
            let quadrant = coordToQuadrant(coords);
            if(MODEL.userSequence.length == 0 || MODEL.userSequence[MODEL.userSequence.length-1] != quadrant){
                MODEL.userSequence.push(quadrant);
                DISPLAY.showFeedback(quadrant);

                if(sequenceMatching(MODEL.sequence, MODEL.userSequence)){
                    if(MODEL.sequence.length != 0 && MODEL.userSequence.length == MODEL.sequence.length){
                        console.log("Completed round!")
                        return;
                    }else {
                        // Matching so far, keep getting input
                        if(isLoopInput){
                            CONTROLLER._getUserFeedbackCoords();
                        }
                    }
                }else{
                    console.log("Incorrect quadrant: " + quadrant);
                }  
            }

        }, (error) => {
            console.log(error);
        });

    },


    capture: () => {
        CONTROLLER._getUserFeedbackCoords(false);

    },

    getCenter: () => {
        console.log("GetCenter() not implemented now");
    },

    cancelButtonMethod: () => {
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
