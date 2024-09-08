import Webcam from "react-webcam";
import {useRef} from "react";

const Camera = () => {
    const webCamRef = useRef(null);
    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: "user"
    };
    return (
        <div style={{position: 'relative', overflow: 'hidden', width: '100%', height: '100vh'}}
             className="camera-container">
            <Webcam
                audio={false}
                ref={webCamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                style={{width: '100%', height: 'auto', position: 'absolute', zIndex: '1'}}
            />
        </div>
    )
}

export default Camera