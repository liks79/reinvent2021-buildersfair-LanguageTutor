import React, { Component } from 'react';
import axios from "axios";
import mic from 'microphone-stream';
import { EventStreamMarshaller, Message } from '@aws-sdk/eventstream-marshaller';
import { toUtf8, fromUtf8 } from '@aws-sdk/util-utf8-node';

class TranscribeDemo extends Component {
    constructor(props) {
        super(props);
        this.eventStreamMarshaller = null;
        this.state = {
            result: ''
        };
    }

    componentDidMount() {

    }
    
    async transcribe() {

        var micStream = null;
        var mediaStream = null;
        var inputSampleRate = 0;
        const transcribeSampleRate = 16000;
        const transcribeLanguageCode = 'en-US';
        const sampleRate = 44100;
        const eventStreamMarshaller = new EventStreamMarshaller(toUtf8, fromUtf8);


        try {
            mediaStream = await window.navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                })
        }
        catch (error) {
            console.log(error);
            alert("Error. Please make sure you allow this website to access your microphone");
            return;
        }

        //this.eventStreamMarshaller = new marshaller.EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);
        //let's get the mic input from the browser, via the microphone-stream module
        micStream = new mic();

        micStream.on("format", data => {
            inputSampleRate = data.sampleRate;
        });

        micStream.setStream(mediaStream);        

        const backendAPI = process.env.REACT_APP_BACKEND_SERVER + '/demo/transcribe';
        console.log(backendAPI);
        const res = await axios.get(backendAPI);
        const transcribeUrl = res.data.transcribeUrl;
        console.log(transcribeUrl);

        //open up Websocket connection
        var websocket = new WebSocket(transcribeUrl);
        websocket.binaryType = 'arraybuffer';

        websocket.onopen = () => {
            //Make the spinner disappear
            micStream.on('data', rawAudioChunk => {
                // the audio stream is raw audio bytes. Transcribe expects PCM with additional metadata, encoded as binary
               let binary = convertAudioToBinaryMessage(rawAudioChunk);
        
                if (websocket.readyState === websocket.OPEN)
                    websocket.send(binary);
                }
            )};

        // handle messages, errors, and close events
        websocket.onmessage = async message => {

            //convert the binary event stream message to JSON
            var messageWrapper = eventStreamMarshaller.unmarshall(Buffer(message.data));

            var messageBody = JSON.parse(String.fromCharCode.apply(String, messageWrapper.body)); 

            //THIS IS WHERE YOU DO SOMETHING WITH WHAT YOU GET FROM TRANSCRIBE
            console.log("Got something from Transcribe!:");
            console.log(messageBody);
        }

        // FUNCTIONS
        function convertAudioToBinaryMessage(audioChunk) {
            var raw = mic.toRaw(audioChunk);
            if (raw == null) return; // downsample and convert the raw audio bytes to PCM
            var downsampledBuffer = downsampleBuffer(raw, inputSampleRate, transcribeSampleRate);
            var pcmEncodedBuffer = pcmEncode(downsampledBuffer); // add the right JSON headers and structure to the message
        
            var audioEventMessage = getAudioEventMessage(Buffer.from(pcmEncodedBuffer)); //convert the JSON object + headers into a binary event stream message
        
            var binary = eventStreamMarshaller.marshall(audioEventMessage);
            return binary;
        }

        function getAudioEventMessage(buffer) {
            // wrap the audio data in a JSON envelope
            return {
                headers: {
                    ':message-type': {
                        type: 'string',
                        value: 'event'
                    },
                    ':event-type': {
                        type: 'string',
                        value: 'AudioEvent'
                    }
                },
                body: buffer
            };
        }

        function downsampleBuffer(buffer, inputSampleRate = 44100, outputSampleRate = 16000) {
        
            if (outputSampleRate === inputSampleRate) {
                return buffer;
            }
        
            var sampleRateRatio = inputSampleRate / outputSampleRate;
            var newLength = Math.round(buffer.length / sampleRateRatio);
            var result = new Float32Array(newLength);
            var offsetResult = 0;
            var offsetBuffer = 0;
            
            while (offsetResult < result.length) {
        
                var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        
                var accum = 0,
                count = 0;
                
                for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++ ) {
                    accum += buffer[i];
                    count++;
                }
        
                result[offsetResult] = accum / count;
                offsetResult++;
                offsetBuffer = nextOffsetBuffer;
        
            }
        
            return result;
        
        }

        function pcmEncode(input) {
            var offset = 0;
            var buffer = new ArrayBuffer(input.length * 2);
            var view = new DataView(buffer);
            for (var i = 0; i < input.length; i++, offset += 2) {
                var s = Math.max(-1, Math.min(1, input[i]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
            return buffer;
        }

    }
    

    render() {
        return (
            <div>
                <br></br>
                <h1 className="text-secondary text-center">Speech Recognition with AWS Transcribe</h1>
                <br></br>

                <div className="App">
                    <button onClick={this.transcribe}>Transcribe</button>
                </div>
                <br/><br/>
                <div>{this.state.result}</div>
            </div>
        );
    }
}

export default TranscribeDemo;