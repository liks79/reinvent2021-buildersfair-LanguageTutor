import React, { Component } from 'react';
import Webcam from "react-webcam";
import axios from "axios";

class RekognitionDemo extends Component {
    constructor(props) {
        super(props);
        this.webcamRef = React.createRef()
        this.state = {
            screenshot: null,
            labels: null,
            loading: false
        }
    }

    componentDidMount() {
    }

    capture = () => {

        const screenshot = this.webcamRef.current.getScreenshot();
        this.setState({ screenshot }, () => {
            this.postImage();
        });
    }

    async postImage() {
        // call a demo API here
        const formData = new FormData();
        formData.append('image', this.state.screenshot);
        // console.log(this.state.screenshot);

        this.setState({ loading: true });
        const backendAPI = process.env.REACT_APP_BACKEND_SERVER + '/demo/rekognition';
        const res = await axios.post(backendAPI, formData);
        this.setState({ loading: false });

        if (res !== null) {
            // console.log(res.data);
            this.setState({ labels: res.data.Labels });
        }
        else {
            // TODO: something wrong
            console.log("something wrong! try again.");
        }
    }

    render() {

        const videoConstraints = {
            width: 650,
            height: 520,
            facingMode: "user"
        };

        return (
            <div>
                <br></br>
                <h1 className="text-secondary text-center">Object Detection with AWS Rekognition</h1>
                <br></br>

                <div className="container">
                    <div className="row">
                        <div className="col-8">

                            <div className="text-center">
                            <Webcam
                                ref={this.webcamRef}
                                audio={false}
                                height={520}
                                screenshotFormat="image/png"
                                width={650}
                                videoConstraints={videoConstraints}
                            />
                            
                                <br/><br/>
                                <button id="buttonSnapshot" className="btn btn-primary mr-2" onClick={this.capture}>Take A Snapshot</button>
                                <br/>
                            
                            </div>
                            {this.state.loading ? <h1>Loading...</h1> : <h1>&nbsp;</h1>}
                        </div>

                        {this.state.labels && 
                        <div className="col-4">
                            <div>
                                <h5>Found objects : </h5>
                            </div>
                            <div className="container">
                                <table className="table">
                                <tr className="thead-light">
                                    <th>Label</th>  
                                    <th>Confidence</th>
                                </tr>
                                {this.state.labels.map(( label, index) => {
                                    return (
                                    <tr key={index}>
                                        <td>{ label.Name }</td>
                                        <td>{ label.Confidence }</td>
                                    </tr>
                                );
                                })}
                                </table>
                            </div>
                        </div>
                        }   
                    </div>
                </div>

            </div>
        );
    }
}

export default RekognitionDemo;