# eye-region-tracker

Trackingjs is the library used to detect and extract the locations of the eyes and face from a camera feed. 

### Installation: 

In order to run the server, web.py needs to be installed.


In order to run the neural network on the server, caffe needs to be installed. To run the neural network on the client-side, deeplearnjs-caffe is needed. 

Caffe: 

Go to http://caffe.berkeleyvision.org/ and install based on your environment.


Deeplearnjs-caffe:

Deeplearnjs-caffe needs to be modified slightly in order to run the GazeCapture model. The predict method in src/model.ts has been customized for GazeCapture. To install, navigate to the deeplearnjs-caffe directory and run the following code (you need node.js and npm installed first):

```bash
npm install

// We need to modify the predict method of models to accept Array<NDArray> as input.
cp model.d.ts node_modules/deeplearn/dist

npm run build
```


### Certificate of HTTPS

The webpages need to be hosted with HTTPS to allow camera access. If working locally, openssl should be able to provide a certificate. The certificate's address should be included in server.py 


### Overview of Modules

##Server-Side:

server.py: Handles hosting the server with web.py.

inputSetup.py: Formats the images from the client into the desired input for the neural network.

runModel.py: Loads and runs the gazeCapture Neural Network.

processData.py: Provides analysis of data from dataCollection Tool.

____________________________________________________________________
##Client-Side:

static/controller.js: Handles user interaction and the logic between computation and display.

static/util.js: encapsulates the metadata and preforms calculations on that data.

static/display.js: Handles all the manipulation of the HTML display objects.

static/tracker.js: Uses the trackingjs library to extract face features.

static/dlmodel.js: Uses the deeplearnjs-caffe library to run GazeCapture in javascript.







