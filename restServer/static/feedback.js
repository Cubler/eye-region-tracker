$(document).ready(() => {

    // Event Listeners 
    document.getElementById('getPos').addEventListener("click", CONTROLLER.capture);
    document.getElementById('trackButton').addEventListener("click", CONTROLLER.startSimonSays);
    document.getElementById('getSequence').addEventListener("click", CONTROLLER.getNewSequence);
    document.getElementById('getUserSequence').addEventListener("click", CONTROLLER.getUserFeedbackCoords);
    document.getElementById('cancelTrack').addEventListener("click", CONTROLLER.cancelButtonMethod);
    document.getElementById('getCenter').addEventListener("click", CONTROLLER.getCenter);


});