import Webcam from "react-webcam";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import React, {useCallback, useEffect, useRef, useState} from "react";
import axios from "axios";
import {gsap} from "gsap";
import {FaCarrot, FaCheckCircle, FaExclamationCircle, FaHeart, FaLemon, FaRegHeart, FaSpinner} from "react-icons/fa";
import {FaRegFaceSmile} from "react-icons/fa6";
import '../styles/camera.css'
import {
    fetchFavoriteRecipes,
    fetchNutritionAndRecipes,
    fetchRecipes,
    handleAddFavoriteRecipe,
    handleGetUserInfo,
    handleSaveUserInfo
} from "../api/services";
import {GiPickle, GiPotato, GiShinyApple, GiTomato} from "react-icons/gi";
import {PiOrangeFill} from "react-icons/pi";

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
    const [showRecipeNotification, setShowRecipeNotification] = useState(true);
    const notificationRef = useRef(null);

    const videoConstraints = {
        width: 1920,
        height: 1080,
        facingMode: "user"
    };

    const iconMap = {
        manzana: GiShinyApple,
        zanahoria: FaCarrot,
        pepinillo: GiPickle,
        limon: FaLemon,
        tomate: GiTomato ,
        papa: GiPotato ,
        naranja: PiOrangeFill,
    }

    const commands = [
        {
            command: 'Empezar',
            callback: () => handleGetUserInfo(setShowUserModal, setUserInfo, setIsDetectionActive, setIsMenuOpen)
        },
        {
            command: 'Detener',
            callback: () => setIsDetectionActive(false)
        },
        {
            command: 'Abrir menú',
            callback: () => openMenu()
        },
        {
            command: 'Cerrar menú',
            callback: () => closeMenu()
        },
        {
            command: 'Mostrar información',
            callback: () => fetchNutritionAndRecipes(setLoading, setShowRecipes, setNewInfoAvailable, detections, userInfo, setNutritionInfo, setDetections, setRecipes, setShowNotifications)
        },
        {
            command: 'Mostrar preparación',
            callback: () => togglePreparation()
        },
        {
            command: 'Agregar favorito',
            callback: () => handleAddFavoriteRecipe(userInfo, recipes, currentRecipeIndex)
        },
        {
            command: 'Mostrar recetas',
            callback: () => fetchRecipes(setCurrentRecipeIndex, setShowRecipes, setShowFavorites, setVoiceRecipe, setShowNotifications)
        },
        {
            command: 'Siguiente receta',
            callback: () => nextRecipe()
        },
        {
            command: 'Anterior receta',
            callback: () => previousRecipe()
        },
        {
            command: 'Mi nombre es *',
            callback: (name) => {
                setName(name);
                document.getElementById('dobInput').focus(); // Enfoca el siguiente input
            }
        },
        {
            command: 'Mi fecha de nacimiento es *',
            callback: (dob) => {
                setDob(dob);
                document.getElementById('foodPreferenceInput').focus(); // Enfoca el siguiente input
            }
        },
        {
            command: 'Mis preferencias alimentarias son *',
            callback: (preference) => {
                const preferenceArray = preference.split(',');
                setFoodPreference(preferenceArray);
            }
        },
        {
            command: 'Enviar',
            callback: () => handleSaveUserInfo(name, dob, foodPreference, setUserInfo, setShowUserModal)
        },
        {
            command: 'Mostrar mis recetas favoritas',
            callback: () => fetchFavoriteRecipes(userInfo, setCurrentRecipeIndex, setShowRecipes, setVoiceRecipe, setFavoriteRecipes, setShowFavorites )

        }
    ];

    const { transcript, resetTranscript } = useSpeechRecognition({ commands });

    const previousRecipe = () => {
        setCurrentRecipeIndex((currentRecipeIndex - 1 + recipes.length) % recipes.length);
        setShowPreparation(false);
    };

    const nextRecipe = () => {
        if (voiceRecipe === true) {
            setCurrentRecipeIndex((currentRecipeIndex + 1) % recipes.length);
        } else {
            setCurrentRecipeIndex((currentRecipeIndex + 1) % favoriteRecipes.length);
        }
        setShowPreparation(false);
    };

    const closeMenu = () => {
        setShowRecipes(false);
        setShowFavorites(false);
        setIsMenuOpen(false);
        setShowNotifications(false);
    }

    const openMenu = () => {
        setIsMenuOpen(true);
        if (voiceRecipe === true) {
            setShowRecipes(true);
        } else {
            setShowFavorites(true);
        }
    }
    const togglePreparation = () => {
        setShowPreparation(!showPreparation);
    };
    const capture = useCallback(async () => {
        if (!isDetectionActive || isRequestPending) return;

        setIsRequestPending(true);

        const imageSrc = webcamRef.current.getScreenshot();
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

    // Función para aplicar la homografía
    const applyHomography = (x, y, homographyMatrix) => {
        const point = [x, y, 1];

        // Multiplicar el punto por la matriz de homografía
        const transformedPoint = [
            homographyMatrix[0][0] * point[0] + homographyMatrix[0][1] * point[1] + homographyMatrix[0][2] * point[2],
            homographyMatrix[1][0] * point[0] + homographyMatrix[1][1] * point[1] + homographyMatrix[1][2] * point[2],
            homographyMatrix[2][0] * point[0] + homographyMatrix[2][1] * point[1] + homographyMatrix[2][2] * point[2]
        ];

        // Normalizar las coordenadas para obtener los valores correctos
        const transformedX = transformedPoint[0] / transformedPoint[2];
        const transformedY = transformedPoint[1] / transformedPoint[2];

        return { transformedX, transformedY };
    };


    useEffect(() => {
        const interval = setInterval(capture, 500);
        return () => clearInterval(interval);


    }, [capture]);

    useEffect(() => {
        if (showRecipes) {
            setShowRecipeNotification(true); // Mostrar la notificación cuando se cargan las recetas
            const timer = setTimeout(() => {
                // Animar la desaparición con GSAP
                gsap.to(notificationRef.current, {
                    opacity: 0,
                    y: -20,
                    duration: 1.5, // Duración de la animación (1 segundo)
                    onComplete: () => setShowRecipeNotification(false), // Después de la animación, ocultar la notificación
                });
            }, 5000); // Esperar 2 segundos antes de iniciar la animación de desaparición

            return () => clearTimeout(timer); // Limpiar el temporizador si el componente se desmonta
        }
    }, [showRecipes]);


    useEffect(() => {
        const existingElements = document.querySelectorAll('.detection, .detection-info, .detection-name, .detection-name-top, .detection-name-bottom');
        existingElements.forEach(element => element.remove());

        const homographyMatrix = [
            [ 9.85820722e-01, -1.01994070e-03,  1.29719571e+01],
            [ 1.94296259e-03,  9.68230691e-01,  1.35171648e+00],
            [ 4.14613758e-06, -1.29106418e-05,  1.00000000e+00]]
        ;



        detections.forEach((detection, index) => {
            const { x1, y1, x2, y2 } = detection.coordinates;

            const { transformedX: centerX, transformedY: centerY } = applyHomography(
                (x1 + x2) / 2, // Coordenada X del centro
                (y1 + y2) / 2, // Coordenada Y del centro
                homographyMatrix
            );

            const width = x2 - x1;
            const height = y2 - y1;
            const radius = (Math.max(width, height) / 2) + 20;
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
        <circle cx="${ringRadius}" cy="${ringRadius}" r="${ringRadius}" fill="rgb(0, 204, 102)" mask="url(#mask-${index})" />
    `;

            document.querySelector('.camera-container').appendChild(svgContainer);

            // Crear el texto superior
            const textTopPath = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            textTopPath.setAttribute('class', 'detection-name-top');
            textTopPath.setAttribute('width', `${ringRadius * 2}`);
            textTopPath.setAttribute('height', `${ringRadius * 2}`);
            textTopPath.setAttribute('style', `position: absolute; left: ${centerX - ringRadius}px; top: ${centerY - ringRadius - 30}px; pointer-events: none; z-index: 3;`);

            textTopPath.innerHTML = `
        <defs>
            <path id="textTopPath-${index}" d="M ${ringRadius},${ringRadius + 20} m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0" />
        </defs>
        <text fill="#000000" font-size="${ringRadius * 0.15}" letter-spacing="1"  font-weight="bold">
            <textPath xlink:href="#textTopPath-${index}" startOffset="40%" text-anchor="middle">
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
            textBottomPath.setAttribute('style', `position: absolute; left: ${centerX - ringRadius}px; top: ${centerY - ringRadius + 40}px; pointer-events: none; z-index: 3;`);

            textBottomPath.innerHTML = `
        <defs>
            <path id="textBottomPath-${index}" d="M ${ringRadius},${ringRadius} m -${radius},0 a ${radius},${radius} 0 1,0 ${radius * 2},0" />
        </defs>
        <text fill="#ffffff" font-size="${ringRadius*0.25}" letter-spacing="5" font-weight="bold" >
            <textPath xlink:href="#textBottomPath-${index}" startOffset="60%" text-anchor="middle">
                ${detection.name}
            </textPath>
        </text>
    `;

            document.querySelector('.camera-container').appendChild(textBottomPath);

            if (nutritionInfo[detection.name]) {
                const nutritionData = nutritionInfo[detection.name];
                const nutritionInfoElements = Object.entries(nutritionData)
                    .map(([key, value], idx) => ({
                        label: key,
                        value: value,
                        angle: (120 / Object.keys(nutritionData).length) * idx, // Distribuir en un ángulo uniforme
                    }));

                nutritionInfoElements.forEach(info => {
                    const angle = info.angle * (Math.PI / 180);
                    const infoX = centerX + (radius + 115) * Math.cos(angle);
                    const infoY = centerY + (radius + 90) * Math.sin(angle);

                    // Crear la línea que conecta el anillo verde con la información
                    const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    lineElement.setAttribute('class', 'nutrition-line');
                    lineElement.setAttribute('x1', centerX + radius * Math.cos(angle)); // Punto en el anillo
                    lineElement.setAttribute('y1', centerY + radius * Math.sin(angle)); // Punto en el anillo
                    lineElement.setAttribute('x2', infoX); // Punto en el texto nutricional
                    lineElement.setAttribute('y2', infoY); // Punto en el texto nutricional
                    lineElement.setAttribute('stroke', 'yellow');
                    lineElement.setAttribute('stroke-width', '20');
                    lineElement.setAttribute('style', 'position: absolute; z-index: 3;');

                    svgContainer.appendChild(lineElement); // Añadir la línea al contenedor SVG

                    // Crear el cuadro de información nutricional
                    const detectionInfo = document.createElement('div');
                    detectionInfo.className = 'detection-info';
                    detectionInfo.style.position = 'absolute';
                    detectionInfo.style.left = `${infoX}px`;
                    detectionInfo.style.top = `${infoY}px`;
                    detectionInfo.style.transform = `translate(-50%, -50%)`;
                    detectionInfo.style.color = 'white';
                    detectionInfo.style.padding = '5px';
                    detectionInfo.style.fontSize = '20px';
                    detectionInfo.style.fontStyle = 'italic';
                    detectionInfo.style.fontWeight = 'bold';
                    detectionInfo.style.whiteSpace = 'nowrap';
                    detectionInfo.style.zIndex = '2';
                    detectionInfo.innerHTML = `
                    <p style="font-size: 50px; font-weight: bolder; color: black">${info.value}</p>
                    <p style="color: black">${info.label}</p>
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
                opacity: '1'
            }}></div>
            {isMenuOpen && (
                <div ref={menuRef} style={menuStyle} >
                    {userInfo ? (
                        <p className="text-3xl italic font-semibold border-b border-gray-500 pb-2 mb-4">Bienvenido, {userInfo.first_name}</p>
                    ) : (
                        <p className="text-red-500">No se ha registrado usuario.</p>
                    )}
                    <ul className="mb-4">
                        {detections.map((detection, index) => {
                            const IconComponent = iconMap[detection.name.toLowerCase()];
                            return (
                                <li key={index} className="flex items-center space-x-3 mb-2 text-lg">
                                    {IconComponent && <IconComponent  className="text-2xl text-white"/>}
                                    <span className="text-white">{detection.name}</span>
                                </li>
                            )

                        })}
                    </ul>
                    {loading && (
                        <div className="flex items-center text-yellow-400 font-bold">
                            <FaSpinner className="animate-spin mr-3"/>
                            Cargando...
                        </div>
                    )}
                    {newInfoAvailable && detections.length > 0 && (
                        <div className="flex items-center bg-yellow-500 text-white p-2 rounded-lg font-bold">
                            <FaExclamationCircle className="mr-3"/>
                            Hay nueva información disponible
                        </div>
                    )}
                    {detections.length == 0 && (
                        <div className="flex items-center text-gray-400 font-bold">
                            Realiza nuevas detecciones <FaRegFaceSmile className="ml-3"/>
                        </div>
                    )}
                    {showNotifications && (
                        <div>
                            <div className="flex items-center bg-green-500 text-white p-2 rounded-lg mt-2 font-bold">
                                <FaCheckCircle className="mr-3"/>
                                Información nutricional cargada
                            </div>
                            <div className="flex items-center bg-yellow-500 text-white p-2 rounded-lg mt-2 font-bold">
                                <FaExclamationCircle className="mr-3"/>
                                Recetas disponibles
                            </div>
                        </div>
                    )}
                    {showRecipes && (
                        <div>
                            {showRecipeNotification && (
                                <div ref={notificationRef} className="flex items-center bg-green-500 text-white p-2 rounded-lg mt-3 font-bold">
                                    <FaCheckCircle className="mr-3"/>
                                    Recetas cargadas
                                </div>
                            )}
                            <div ref={recipeRef} className="bg-white p-5 rounded-lg shadow-lg text-black mt-3">
                                <div className="mb-5">
                                    <div className="flex flex-row justify-between items-center mb-3">
                                        <h1 className="text-3xl font-black">{recipes[currentRecipeIndex].title}</h1>
                                        <FaRegHeart
                                            className="text-red-500 text-6xl"
                                        />
                                    </div>
                                    <p className="font-semibold mb-2">Ingredientes:</p>
                                    <ul className="list-disc list-inside ml-4 mb-4 font-mono">
                                        {recipes[currentRecipeIndex].ingredients.split(',').map((ingredient, index) => (
                                            <li key={index} className={'capitalize'}>{ingredient.trim()}</li>
                                        ))}
                                    </ul>
                                    {showPreparation && (
                                        <>
                                            <p className="font-semibold mb-2">Preparación:</p>
                                            <ol className="list-decimal list-inside ml-4 mb-4 font-sans">
                                                {recipes[currentRecipeIndex].preparation.split('.').map((step, index) => (
                                                    step.trim() !== '' && <li key={index} className={"mb-2"}>{step.trim()}</li>
                                                ))}
                                            </ol>
                                        </>
                                    )}
                                    <div className="text-center mt-5">
                                        <strong>{currentRecipeIndex + 1} de {recipes.length}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                    )}
                    {showFavorites && favoriteRecipes.length > 0 && (
                        <div className="bg-white p-5 rounded-lg shadow-lg text-black mt-3">
                            <div className="mb-5">
                                <div className="flex flex-row justify-between items-center mb-3">
                                    <h1 className="text-3xl font-black">{favoriteRecipes[currentRecipeIndex].title}</h1>
                                    <FaHeart className="text-red-500 text-6xl"/>
                                </div>

                                {/* Ingredientes en formato de lista */}
                                <p className="font-semibold mb-2">Ingredientes:</p>
                                <ul className="list-disc list-inside ml-4 mb-4 font-mono">
                                    {favoriteRecipes[currentRecipeIndex].ingredients.split(',').map((ingredient, index) => (
                                        <li key={index} className={'capitalize'}>{ingredient.trim()}</li>
                                    ))}
                                </ul>

                                {/* Preparación en formato de lista numerada */}
                                <p className="font-semibold mb-2">Preparación:</p>
                                <ol className="list-decimal list-inside ml-4 mb-4 font-sans">
                                    {favoriteRecipes[currentRecipeIndex].preparation.split('.').map((step, index) => (
                                        step.trim() !== '' && <li key={index} className="mb-2">{step.trim()}.</li>
                                    ))}
                                </ol>

                                {/* Índice del número de receta */}
                                <div className="text-center mt-5">
                                    <strong>{currentRecipeIndex + 1} de {favoriteRecipes.length}</strong>
                                </div>
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
            <span className={'text-black'}><strong>{transcript}</strong></span>
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
    backgroundColor: 'rgb(0,0,0)', // Fondo anaranjado más vibrante
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
    padding: '5px 10px',
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
const iconStyle= {
    marginRight: '10px',
    fontSize: '24px'
}
export default Camera