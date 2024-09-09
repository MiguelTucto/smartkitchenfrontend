import Webcam from "react-webcam";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import {useCallback, useEffect, useRef, useState} from "react";
import axios from "axios";
import {gsap} from "gsap";
import {FaCheckCircle, FaExclamationCircle, FaHeart, FaRegHeart, FaSpinner} from "react-icons/fa";
import {FaRegFaceSmile} from "react-icons/fa6";

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
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'white',
                zIndex: '1',
                opacity: '0.1'
            }}></div>
            {isMenuOpen && (
                <div ref={menuRef} style={menuStyle}>
                    {userInfo ? (
                        <p style={menuTitleStyle}>Bienvenido, {userInfo.first_name}</p>
                    ) : (
                        <p>No se ha registrado usuario.</p>
                    )}
                    <ul style={detectionListStyle}>
                        {detections.map((detection, index) => (
                            <li key={index} style={detectionItemStyle}>
                                {detection.name}
                            </li>
                        ))}
                    </ul>
                    {loading && (
                        <div style={waitingStyle}>
                            <FaSpinner ref={spinnerRef}
                                       style={{marginRight: '10px', animation: 'spin 1s linear infinite'}}/>
                            Cargando...
                        </div>
                    )}
                    {newInfoAvailable && detections.length > 0 && (
                        <div style={loadingStyle}>
                            <FaExclamationCircle style={{marginRight: '10px'}}/>
                            Hay nueva información disponible
                        </div>
                    )}
                    {detections.length == 0 && (
                        <div style={loadingStyle}>
                            Realiza nuevas detecciones <FaRegFaceSmile style={{marginLeft: '10px'}}/>
                        </div>
                    )}
                    {showNotifications && (
                        <div>
                            <div style={nutritionInFoStyle}>
                                <FaCheckCircle style={{marginRight: '10px'}}/>
                                Información nutricional cargada
                            </div>
                            <div style={loadingStyle}>
                                <FaExclamationCircle style={{marginRight: '10px'}}/>
                                Recetas disponibles
                            </div>
                        </div>
                    )}
                    {showRecipes && (
                        <div>
                            <div style={nutritionInFoStyle}>
                                <FaCheckCircle style={{marginRight: '10px'}}/>
                                Recetas cargadas
                            </div>
                            <div ref={recipeRef} style={recipeContainerStyle}>
                                <div className={'flex flex-row justify-between items-center'} style={recipeTitleStyle}>
                                    <h3>{recipes[currentRecipeIndex].title}</h3>
                                    <FaRegHeart
                                        className="favorite-icon"
                                    />
                                </div>
                                <p style={{borderBottom: '1px solid white'}}>
                                    <strong>Ingredientes:</strong> {recipes[currentRecipeIndex].ingredients}</p>
                                {showPreparation && (
                                    <p><strong>Preparación:</strong> {recipes[currentRecipeIndex].preparation}</p>
                                )}
                                <span
                                    style={{marginLeft: '40%'}}>{currentRecipeIndex + 1} de {recipes.length}</span>
                            </div>
                        </div>

                    )}
                    {showFavorites && favoriteRecipes.length > 0 && (
                        <div style={favoriteContainerStyle}>
                            <div style={{marginBottom: '20px'}}>
                                <div className={'flex flex-row justify-between items-center'}
                                     style={favoriteTitleStyle}>
                                    <h3>{favoriteRecipes[currentRecipeIndex].title} </h3>
                                    <FaHeart
                                        className="favorite-icon"
                                        style={{color: 'red'}}
                                    />
                                </div>
                                <p><strong>Ingredientes:</strong> {favoriteRecipes[currentRecipeIndex].ingredients}</p>
                                <p><strong>Preparación:</strong> {favoriteRecipes[currentRecipeIndex].preparation}</p>
                                <span
                                    style={{marginLeft: '40%'}}>{currentRecipeIndex + 1} de {favoriteRecipes.length}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {showUserModal && (
                <div className="modal-container">
                    <div className={'modal-content'}>
                        <h2>Ingrese su información</h2>
                        <input
                            id="nameInput"
                            type="text"
                            value={name}
                            className="modal-input"
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre completo"
                        />
                        <input
                            id="dobInput"
                            type="date"
                            value={dob}
                            className="modal-input"
                            onChange={(e) => setDob(e.target.value)}
                            placeholder="Fecha de nacimiento"
                        />
                        <input
                            type="text"
                            placeholder="Preferencias alimentarias"
                            value={foodPreference}
                            onChange={(e) => setFoodPreference(e.target.value.split(',').map(item => item.trim()))}
                            className="modal-input"
                            id="foodPreferenceInput"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

const waitingStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    margin: '10px 0',
    color: 'rgb(12, 77, 83)', // Mantener color amarillo para los estados de carga
    backgroundColor: 'rgb(230, 240, 234)', // Fondo translúcido para mayor contraste
    padding: '5px',
    borderRadius: '5px'
}

const nutritionInFoStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    margin: '10px 0',
    color: 'rgb(12, 77, 83)', // Mantener color amarillo para los estados de carga
    backgroundColor: 'rgb(39, 219, 105)', // Fondo translúcido para mayor contraste
    padding: '5px',
    borderRadius: '5px'
}

const favoriteContainerStyle = {
    color: 'white',
    marginTop: '20px',
    fontSize: '16px',
    lineHeight: '1.5',
    border: '1px solid rgba(255, 255, 255, 0.5)', // Borde blanco translúcido para mantener coherencia
    borderRadius: '10px',
    padding: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
}

const favoriteTitleStyle = {
    margin: '0 0 10px',
    fontSize: '20px',
    borderBottom: '1px solid white',
    paddingBottom: '5px',
    color: 'white'
}
const menuStyle = {
    position: 'absolute',
    top: '50px',
    right: '50px',
    width: '350px',
    backgroundColor: 'rgba(18, 119, 128, 0.95)', // Fondo anaranjado más vibrante
    color: 'white', // Color de texto blanco para contraste
    padding: '20px',
    borderRadius: '10px',
    zIndex: '3',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    fontFamily: 'Arial, sans-serif',
    opacity: 0,
    transform: 'translateX(100%)'
};

const menuTitleStyle = {
    margin: '0 0 10px',
    fontSize: '24px',
    borderBottom: '2px solid white',
    paddingBottom: '5px',
    color: 'white' // Color de texto blanco para el título
};

const detectionListStyle = {
    listStyleType: 'none',
    padding: '0',
    margin: '0',
    color: 'white' // Color de texto blanco para los items de detección
};

const detectionItemStyle = {
    marginBottom: '10px',
    fontSize: '18px',
    lineHeight: '1.5',
    border: '1px solid rgba(255, 255, 255, 0.5)', // Borde blanco translúcido para mantener coherencia
    borderRadius: '5px',
    padding: '5px 10px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Fondo translúcido para detecciones
    color: 'white' // Color de texto blanco
};

const recipeContainerStyle = {
    marginTop: '20px',
    fontSize: '16px',
    lineHeight: '1.5',
    border: '1px solid rgba(255, 255, 255, 0.5)', // Borde blanco translúcido para mantener coherencia
    borderRadius: '10px',
    padding: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Fondo translúcido
    color: 'white', // Texto blanco
    opacity: 0
};

const recipeTitleStyle = {
    margin: '0 0 10px',
    fontSize: '20px',
    borderBottom: '1px solid white',
    paddingBottom: '5px',
    color: 'white' // Texto blanco para el título de la receta
};

const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px'
};

const buttonStyle = {
    backgroundColor: 'rgba(255, 140, 0, 0.8)', // Fondo anaranjado translúcido
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s',
    outline: 'none'
};

const loadingStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    margin: '10px 0',
    color: 'rgb(12, 77, 83)', // Mantener color amarillo para los estados de carga
    backgroundColor: 'rgb(252, 165, 3)', // Fondo translúcido para mayor contraste
    padding: '5px',
    borderRadius: '5px'
};

const transcriptStyle = {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    color: 'white',
    zIndex: '2'
};

export default Camera