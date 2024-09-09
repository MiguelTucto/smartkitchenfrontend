import Webcam from "react-webcam";
import {useCallback, useEffect, useRef, useState} from "react";
import axios from "axios";
import {gsap} from "gsap";

const Camera = () => {
    const webcamRef = useRef(null);
    const menuRef = useRef(null);
    const spinnerRef = useRef(null);
    const recipeRef = useRef(null);
    const [detections, setDetections] = useState([]);
    const [isDetectionActive, setIsDetectionActive] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [recipes, setRecipes] = useState([]);
    const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
    const [showPreparation, setShowPreparation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [showRecipes, setShowRecipes] = useState(false);
    const [isRequestPending, setIsRequestPending] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [voiceRecipe, setVoiceRecipe] = useState(false);
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [nutritionInfo, setNutritionInfo] = useState({});
    const [foodPreference, setFoodPreference] = useState([]);
    const [newInfoAvailable, setNewInfoAvailable] = useState(false);
    const [favoriteRecipes, setFavoriteRecipes] = useState([]);
    const [showFavorites, setShowFavorites] = useState(false);

    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: "user"
    };

    const capture = useCallback(async () => {
        if (!isDetectionActive || isRequestPending) return;

        setIsRequestPending(true);

        const imageSrc = webcamRef.current.getScreenshot();
        console.log('this is ss: ', imageSrc);
        if (imageSrc) {
            try {
                const response = await axios.post('http://127.0.0.1:8000/api/detect/', { image: imageSrc.split(",")[1] });
                const newDetections = response.data.map(detection => {
                    const existingDetection = detections.find(d => d.name === detection.name);
                    return existingDetection ? { ...detection, nutrition: existingDetection.nutrition } : detection;
                });

                if (newDetections.length !== detections.length) {
                    setNewInfoAvailable(true);
                }

                setDetections(newDetections);
            } catch (error) {
                console.error("There was an error detecting objects:", error);
            } finally {
                setIsRequestPending(false);
            }
        } else {
            setIsRequestPending(false);
        }
    }, [webcamRef, isDetectionActive, isRequestPending, detections]);

    useEffect(() => {
        const interval = setInterval(capture, 500);
        return () => clearInterval(interval);
    }, [capture]);

    useEffect(() => {
        const existingElements = document.querySelectorAll('.detection, .detection-info, .detection-name, .detection-name-top, .detection-name-bottom');
        existingElements.forEach(element => element.remove());


        detections.forEach((detection, index) => {
            const { x1, y1, x2, y2 } = detection.coordinates;
            const centerX = (x1 + x2) / 2;
            const centerY = (y1 + y2) / 2;
            const width = x2 - x1;
            const height = y2 - y1;
            const radius = Math.max(width, height) / 2;
            const ringRadius = radius + 50;

            const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgContainer.setAttribute('class', 'detection');
            svgContainer.setAttribute('width', `${ringRadius * 2}`);
            svgContainer.setAttribute('height', `${ringRadius * 2}`);
            svgContainer.setAttribute('style', `position: absolute; left: ${centerX - ringRadius}px; top: ${centerY - ringRadius}px; pointer-events: none; z-index: 2;`);

            svgContainer.innerHTML = `
            <defs>
                <mask id="mask-${index}">
                    <rect x="0" y="0" width="${ringRadius * 10}" height="${ringRadius * 2}" fill="white"/>
                    <circle cx="${ringRadius}" cy="${ringRadius}" r="${radius}" fill="black" />
                </mask>
            </defs>
            <circle cx="${ringRadius}" cy="${ringRadius}" r="${ringRadius}" fill="rgba(0, 0, 0, 0.5)" mask="url(#mask-${index})" />
        `;

            document.querySelector('.camera-container').appendChild(svgContainer);

            // Crear el texto superior
            const textTopPath = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            textTopPath.setAttribute('class', 'detection-name-top');
            textTopPath.setAttribute('width', `${ringRadius * 2}`);
            textTopPath.setAttribute('height', `${ringRadius * 2}`);
            textTopPath.setAttribute('style', `position: absolute; left: ${centerX - ringRadius}px; top: ${centerY - ringRadius - 17}px; pointer-events: none; z-index: 3;`);

            textTopPath.innerHTML = `
            <defs>
                <path id="textTopPath-${index}" d="M ${ringRadius},${ringRadius} m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0" />
            </defs>
            <text fill="#000000" font-size="${(ringRadius / radius)*20}" font-weight="bold">
                <textPath xlink:href="#textTopPath-${index}" startOffset="50%" text-anchor="middle">
                    Tamaño de porción 100g
                </textPath>
            </text>
        `;

            document.querySelector('.camera-container').appendChild(textTopPath);

            // Crear el texto inferior
            const textBottomPath = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            textBottomPath.setAttribute('class', 'detection-name-bottom');
            textBottomPath.setAttribute('width', `${ringRadius * 2}`);
            textBottomPath.setAttribute('height', `${ringRadius * 2}`);
            textBottomPath.setAttribute('style', `position: absolute; left: ${centerX - ringRadius}px; top: ${centerY - ringRadius + 40 }px; pointer-events: none; z-index: 3;`);

            textBottomPath.innerHTML = `
            <defs>
                <path id="textBottomPath-${index}" d="M ${ringRadius},${ringRadius} m -${radius},0 a ${radius},${radius} 0 1,0 ${radius * 2},0" />
            </defs>
            <text fill="#000000" font-size="50" font-weight="bold">
                <textPath xlink:href="#textBottomPath-${index}" startOffset="50%" text-anchor="middle">
                    ${detection.name}
                </textPath>
            </text>
        `;

            document.querySelector('.camera-container').appendChild(textBottomPath);

            if (nutritionInfo[detection.name]) {

                const nutritionData = nutritionInfo[detection.name];
                console.log('its printing nutrition info: ', nutritionData)
                const nutritionInfoElements = Object.entries(nutritionData)
                    .map(([key, value], index, array) => ({
                        label: key,
                        value: value,
                        // Puedes ajustar el ángulo aquí si lo deseas, por ejemplo, distribuyendolos en un círculo
                        angle: (360 / Object.keys(nutritionData).length) * Object.keys(nutritionData).indexOf(key),
                    }));


                nutritionInfoElements.forEach(info => {
                    const angle = info.angle * (Math.PI / 180);
                    const infoX = centerX + (radius + 80) * Math.cos(angle);
                    const infoY = centerY + (radius + 80) * Math.sin(angle);

                    const detectionInfo = document.createElement('div');
                    detectionInfo.className = 'detection-info';
                    detectionInfo.style.position = 'absolute';
                    detectionInfo.style.left = `${infoX}px`;
                    detectionInfo.style.top = `${infoY}px`;
                    detectionInfo.style.transform = `translate(-50%, -50%)`;
                    detectionInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                    detectionInfo.style.color = 'white';
                    detectionInfo.style.padding = '5px';
                    detectionInfo.style.fontSize = '12px';
                    detectionInfo.style.fontStyle = 'italic';
                    detectionInfo.style.fontWeight = 'bold';
                    detectionInfo.style.borderRadius = '5px';
                    detectionInfo.style.whiteSpace = 'nowrap';
                    detectionInfo.style.zIndex = '2';
                    detectionInfo.innerHTML = `
                    <strong>${info.value}</strong><br>
                    ${info.label}
                `;
                    document.querySelector('.camera-container').appendChild(detectionInfo);
                });
            }
            gsap.to(svgContainer, {
                x: 0,
                y: 0,
                duration: 0.5
            });
        });
    }, [detections, nutritionInfo]);


    useEffect(() => {
        if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
            console.error("Este navegador no soporta reconocimiento de voz.");
        } else {
            SpeechRecognition.startListening({ continuous: true });
        }
    }, []);

    useEffect(() => {
        if (isMenuOpen) {
            gsap.fromTo(menuRef.current, { x: '100%', opacity: 0 }, { x: '0%', opacity: 1, duration: 0.5 });
        } else {
            gsap.to(menuRef.current, { x: '100%', opacity: 0, duration: 0.5 });
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (loading) {
            gsap.to(spinnerRef.current, { rotation: 360, duration: 1, repeat: -1, ease: 'linear' });
        } else {
            gsap.killTweensOf(spinnerRef.current);
        }
    }, [loading]);

    useEffect(() => {
        if (showRecipes && recipeRef.current) {
            gsap.fromTo(recipeRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 });
            gsap.to(recipeRef.current.querySelectorAll('p, h3'), {
                opacity: 1,
                duration: 1,
                stagger: 0.1
            });
        }
    }, [showRecipes]);

    useEffect(() => {
        if (detections.length === 0) {
            setShowNotifications(false)
            setShowRecipes(false);
        }
    }, [detections]);

    return (
        <div style={{position: 'relative', overflow: 'hidden', width: '100%', height: '100vh'}}
             className="camera-container">
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                style={{width: '100%', height: 'auto', position: 'absolute', zIndex: '1'}}
            />
        </div>
    )
}

export default Camera