$(document).ready(() => {

    // Event Listeners 
    //document.getElementById('getPos').addEventListener("click", CONTROLLER.capture);
    //document.getElementById('trackButton').addEventListener("click", CONTROLLER.startSimonSays);
    //document.getElementById('getSequence').addEventListener("click", CONTROLLER.getNewSequence);
    //document.getElementById('getUserSequence').addEventListener("click", CONTROLLER.getUserFeedbackCoords);
    //document.getElementById('cancelTrack').addEventListener("click", CONTROLLER.cancelButtonMethod);
    //document.getElementById('getCenter').addEventListener("click", CONTROLLER.getCenter);

    $('#getSequence').click(function() {
        CONTROLLER.getNewSequence();
    });

    $('#getPos').click(function() {
        CONTROLLER.capture();
    });
   
     $('#trackButton').click(function() {
        CONTROLLER.startSimonSays();
    });

    $('#getUserSequence').click(function() {
        CONTROLLER.getUserFeedbackCoords(-1);
    });

    $('#cancelTrack').click(function() {
        CONTROLLER.cancelButtonMethod();
    });

    $('#getCenter').click(function() {
        CONTROLLER.getCenter();
    });

    $(window).resize(function(){
        DISPLAY.resizeCanvas();
    });
});
