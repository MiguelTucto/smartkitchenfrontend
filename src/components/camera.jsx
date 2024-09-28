import Webcam from "react-webcam";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

// Función para convertir texto a voz
const speakText = (text) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES'; // Idioma español
        window.speechSynthesis.speak(utterance);
    } else {
        console.error('El navegador no soporta Speech Synthesis.');
    }
};

// Componente para mostrar el reloj, la fecha y la temperatura
const WeatherClock = () => {
    const [time, setTime] = useState(new Date());
    const [temperature, setTemperature] = useState(null);
    const [location, setLocation] = useState("Lima"); // Ubicación por defecto

    // Actualizar la hora cada segundo
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Obtener la temperatura
    const fetchTemperature = async () => {
        const apiKey = "9bc948d61a466e297edbc9cfcdaeaf43"; // Reemplaza con tu API key de OpenWeatherMap
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;

        try {
            const response = await axios.get(url);
            const temp = response.data.main.temp;
            setTemperature(temp);
        } catch (error) {
            console.error("Error al obtener los datos del clima:", error);
        }
    };

    useEffect(() => {
        fetchTemperature(); // Obtener la temperatura al cargar el componente
    }, []);

    return (
        <div style={clockContainerStyle}>
            <div style={timeStyle}>
                <p>{time.toLocaleTimeString()}</p>
                <p>{time.toLocaleDateString()}</p>
            </div>
            {temperature !== null && (
                <div style={temperatureStyle}>
                    <p>{temperature}°C</p>
                    <p>{location}</p>
                </div>
            )}
        </div>
    );
};

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
    const [isListening, setIsListening] = useState(false);
    const [showFavoriteNotification, setShowFavoriteNotification] = useState(false);

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
        tomate: GiTomato,
        papa: GiPotato,
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
            callback: () => fetchNutritionAndRecipes(toast, setLoading, setShowRecipes, setNewInfoAvailable, detections, userInfo, setNutritionInfo, setDetections, setRecipes, setShowNotifications)
        },
        {
            command: 'Mostrar preparación',
            callback: () => togglePreparation()
        },
        {
            command: 'Agregar favorito',
            callback: () => handleAddFavoriteRecipe(userInfo, recipes, currentRecipeIndex, setShowFavoriteNotification, toast)
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
            command: 'Mostrar mis recetas favoritas',
            callback: () => fetchFavoriteRecipes(userInfo, setCurrentRecipeIndex, setShowRecipes, setVoiceRecipe, setFavoriteRecipes, setShowFavorites )

        },
        {
            command: 'Mi nombre es *',
            callback: (name) => {
                setName(name);
            }
        },
        {
            command: 'Enviar',
            callback: () => handleSaveUserInfo(toast, name, setUserInfo, setShowUserModal)
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

    // **Aquí se utiliza la función de voz**
    useEffect(() => {
        if (showRecipes && recipes.length > 0 && recipes[currentRecipeIndex]) {
            const currentRecipe = recipes[currentRecipeIndex];
            const textToSpeak = `Receta ${currentRecipeIndex + 1}: ${currentRecipe.title}`;
            speakText(textToSpeak);
        }

        if (showUserModal === true){
            speakText('Bienvenido a Smart quitchen. Para comenzar di tu nombre')
        }

        if (isDetectionActive === true && showNotifications === false && showRecipes && recipes.length < 0 && recipes[currentRecipeIndex]) {
            speakText(`Bienvenido ${userInfo.first_name}`)
        }

        if (showNotifications === true) {
            speakText(`Recetas disponibles`)
        }
    }, [currentRecipeIndex, recipes, showRecipes, showUserModal, isDetectionActive, showNotifications]);

    const closeMenu = () => {
        setShowRecipes(false);
        setShowFavorites(false);
        setIsMenuOpen(false);
        setShowNotifications(false);
    };

    const openMenu = () => {
        setIsMenuOpen(true);
        if (voiceRecipe === true) {
            setShowRecipes(true);
        } else {
            setShowFavorites(true);
        }
    };

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

    // Reiniciar reconocimiento de voz en caso de error
    const handleRecognitionError = () => {
        SpeechRecognition.stopListening();
        setTimeout(() => {
            SpeechRecognition.startListening({ continuous: true });
        }, 1000); // Reinicia después de 1 segundo
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
        // Elimina cualquier elemento previo de detección
        const existingElements = document.querySelectorAll('.detection, .detection-info, .detection-name, .detection-name-top, .detection-name-bottom');
        existingElements.forEach(element => element.remove());

        // Elimina el contenedor SVG de líneas si existe
        const svgLinesContainer = document.querySelector('#svgLinesContainer');
        if (svgLinesContainer) {
            svgLinesContainer.remove();
        }

        const homographyMatrix = [
            [9.85820722e-01, -1.01994070e-03, 1.29719571e+01],
            [1.94296259e-03, 9.68230691e-01, 1.35171648e+00],
            [4.14613758e-06, -1.29106418e-05, 1.00000000e+00]
        ];

        detections.forEach((detection, index) => {
            const { x1, y1, x2, y2 } = detection.coordinates;

            const { transformedX: centerX, transformedY: centerY } = applyHomography(
                (x1 + x2) / 2,
                (y1 + y2) / 2,
                homographyMatrix
            );

            const width = x2 - x1;
            const height = y2 - y1;
            const radius = (Math.max(width, height) / 2) + 20;
            const ringThickness = radius * 0.3;
            const ringRadius = radius + ringThickness;
            const textTopPathRadius = radius + ringThickness / 3;
            const textBottomPathRadius = radius + ringThickness / 1.5;
            const textSize = ringRadius * 0.12;

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
            textTopPath.setAttribute('style', `position: absolute; left: ${centerX - ringRadius}px; top: ${centerY - ringRadius}px; pointer-events: none; z-index: 3;`);

            textTopPath.innerHTML = `
        <defs>
            <path id="textTopPath-${index}" d="M ${ringRadius},${ringRadius} m -${textTopPathRadius},0 a ${textTopPathRadius},${textTopPathRadius} 0 1,1 ${textTopPathRadius * 2},0" />
        </defs>
        <text fill="#000000" font-size="${textSize}" letter-spacing="1" >
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
            textBottomPath.setAttribute('style', `position: absolute; left: ${centerX - ringRadius}px; top: ${centerY - ringRadius}px; pointer-events: none; z-index: 3;`);

            textBottomPath.innerHTML = `
        <defs>
            <path id="textBottomPath-${index}" d="M ${ringRadius},${ringRadius} m -${textBottomPathRadius},0 a ${textBottomPathRadius},${textBottomPathRadius} 0 1,0 ${textBottomPathRadius * 2},0" />
        </defs>
        <text fill="#ffffff" font-size="${textSize * 1.2}" letter-spacing="3" >
            <textPath xlink:href="#textBottomPath-${index}" startOffset="60%" text-anchor="middle">
                ${detection.name}
            </textPath>
        </text>
        `;

            document.querySelector('.camera-container').appendChild(textBottomPath);

            // Dibuja una línea con un punto inicial en el borde del círculo
            const drawLineWithPoint = (startX, startY, endX, endY) => {
                const svgContainer = document.querySelector('#svgLinesContainer');
                if (!svgContainer) {
                    // Si no existe, crear un contenedor SVG global para las líneas
                    const newSvgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    newSvgContainer.setAttribute('id', 'svgLinesContainer');
                    newSvgContainer.setAttribute('width', '100%');
                    newSvgContainer.setAttribute('height', '100%');
                    newSvgContainer.setAttribute('style', 'position: absolute; top: 0; left: 0; z-index: 2; pointer-events: none;');
                    document.querySelector('.camera-container').appendChild(newSvgContainer);
                }

                // Crear el círculo pequeño en el borde del círculo verde
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', startX);
                circle.setAttribute('cy', startY);
                circle.setAttribute('r', '4');  // Radio del pequeño círculo
                circle.setAttribute('fill', '#FFDD00'); // Color del círculo (amarillo similar a la imagen)
                document.querySelector('#svgLinesContainer').appendChild(circle);



                // Calcular un nuevo punto final que esté más cerca del borde del texto
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const reducedLength = length * 0.5; // Reducir la longitud al 85% para que la línea llegue al borde del texto
                const newEndX = startX + (deltaX / length) * reducedLength;
                const newEndY = startY + (deltaY / length) * reducedLength;

                // Crear la línea que conecta el borde con el texto
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', startX);
                line.setAttribute('y1', startY);
                line.setAttribute('x2', newEndX);
                line.setAttribute('y2', newEndY);
                line.setAttribute('stroke', '#FFDD00'); // Color de la línea (amarillo)
                line.setAttribute('stroke-width', '2'); // Grosor de la línea
                document.querySelector('#svgLinesContainer').appendChild(line);

                const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle2.setAttribute('cx', newEndX);
                circle2.setAttribute('cy', newEndY);
                circle2.setAttribute('r', '4');  // Radio del pequeño círculo
                circle2.setAttribute('fill', '#FFDD00'); // Color del círculo (amarillo similar a la imagen)
                document.querySelector('#svgLinesContainer').appendChild(circle2);
            };

            // Nutritional information
            if (nutritionInfo[detection.name]) {
                const nutrientsData = nutritionInfo[detection.name].nutrientes || {};
                const vitaminsData = nutritionInfo[detection.name].vitaminas || {};

                const nutrientsInfoElements = Object.entries(nutrientsData)
                    .map(([key, value], idx) => ({
                        label: key,
                        value: value,
                        id: idx,
                        angle: (150 / Object.keys(nutrientsData).length) * idx,
                    }));

                nutrientsInfoElements.forEach(info => {
                    let newRadiusX = 1.4;
                    let newRadiusY = 1.5;

                    if (info.id === 2) {
                        newRadiusX = 1.8;

                    }



                    const angle = info.angle * (Math.PI / 180) - Math.PI / 2;
                    const startX = centerX + (ringRadius * 1) * Math.cos(angle);
                    const startY = centerY + (ringRadius * 1) * Math.sin(angle);
                    const endX = centerX + (ringRadius * newRadiusX) * Math.cos(angle);
                    const endY = centerY + (ringRadius * newRadiusY) * Math.sin(angle);

                    const detectionInfo = document.createElement('div');
                    detectionInfo.className = 'detection-info';
                    detectionInfo.style.position = 'absolute';
                    detectionInfo.style.left = `${endX}px`;
                    detectionInfo.style.top = `${endY}px`;
                    detectionInfo.style.textAlign = 'right';
                    detectionInfo.style.transform = `translate(-50%, -50%)`;
                    detectionInfo.style.color = 'black';
                    detectionInfo.style.padding = '5px';
                    detectionInfo.style.fontSize = `${ringRadius * 0.12}px`;
                    detectionInfo.style.fontStyle = 'italic';
                    detectionInfo.style.fontWeight = 'bold';
                    detectionInfo.style.whiteSpace = 'nowrap';
                    detectionInfo.style.zIndex = '2';
                    detectionInfo.innerHTML = `
            <p style="font-size: ${ringRadius * 0.15}px; font-weight: bolder; color: black">${info.value}</p>
            <p style="color: black">${info.label}</p>
        `;
                    document.querySelector('.camera-container').appendChild(detectionInfo);

                    drawLineWithPoint(startX, startY, endX, endY);
                });

                // Vitamin information
                const vitaminsInfoElements = Object.entries(vitaminsData)
                    .map(([key, value], idx) => ({
                        label: key,
                        value: value,
                        id: idx,
                        angle: (90 / Object.keys(vitaminsData).length) * idx,
                    }));

                vitaminsInfoElements.forEach(info => {
                    let newRadiusX = 1.4;
                    let newRadiusY = 1.4;

                    if (info.id === 2) {
                        newRadiusY = 1.7;
                        newRadiusX = 1.5;
                    }


                    const angle = info.angle * (Math.PI / 180) + Math.PI / 2;
                    const startX = centerX + (ringRadius * 1) * Math.cos(angle);
                    const startY = centerY + (ringRadius * 1) * Math.sin(angle);
                    const endX = centerX + (ringRadius * newRadiusX) * Math.cos(angle);
                    const endY = centerY + (ringRadius * newRadiusY) * Math.sin(angle);

                    const detectionInfo = document.createElement('div');
                    detectionInfo.className = 'detection-info';
                    detectionInfo.style.position = 'absolute';
                    detectionInfo.style.left = `${endX}px`;
                    detectionInfo.style.top = `${endY}px`;
                    detectionInfo.style.transform = `translate(-50%, -50%)`;
                    detectionInfo.style.color = 'black';
                    detectionInfo.style.padding = '5px';
                    detectionInfo.style.fontSize = `${ringRadius * 0.12}px`;
                    detectionInfo.style.fontStyle = 'italic';
                    detectionInfo.style.fontWeight = 'bold';
                    detectionInfo.style.whiteSpace = 'nowrap';
                    detectionInfo.style.zIndex = '2';
                    detectionInfo.innerHTML = `
            <p style="font-size: ${ringRadius * 0.15}px; font-weight: bolder; color: black">${info.value}</p>
            <p style="color: black">${info.label}</p>
        `;
                    document.querySelector('.camera-container').appendChild(detectionInfo);

                    drawLineWithPoint(startX, startY, endX, endY);
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
            return;
        }

        try {
            // Solo iniciar el reconocimiento de voz si el navegador lo soporta
            SpeechRecognition.startListening({ continuous: true });
            setIsListening(true);
        } catch (error) {
            console.error("Error al iniciar el reconocimiento de voz:", error);
        }

        return () => {
            // Detener el reconocimiento cuando el componente se desmonta
            SpeechRecognition.stopListening();
            setIsListening(false);
        };
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
            <ToastContainer />

            {isMenuOpen && (
                <div ref={menuRef} style={menuStyle}>
                    {userInfo ? (
                        <p className=" text-[#00cc66] text-3xl italic font-semibold border-b border-gray-500 pb-2 mb-4">Bienvenido, {userInfo.first_name}</p>
                    ) : (
                        <p className="text-red-500">No se ha registrado usuario.</p>
                    )}
                    <ul className="mb-4 ">
                        {detections.map((detection, index) => {
                            const IconComponent = iconMap[detection.name.toLowerCase()];
                            return (
                                <li key={index} className="flex items-center space-x-3 mb-2 text-lg">
                                    {IconComponent && <IconComponent className="text-2xl text-white"/>}
                                    <span className="text-white">{detection.name}</span>
                                </li>
                            )

                        })}
                    </ul>
                    {loading && (
                        <div className="flex items-center text-yellow-400 font-bold mb-5 ">
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
                </div>
            )}
            {showRecipes && (
                <div>

                    <div ref={recipeRef} style={{ position: 'fixed', top: '20px', left: '10px', zIndex: '100', maxWidth:'400px', width: 'auto' }} className="bg-black p-3 rounded-lg shadow-lg text-[#00cc66]">
                        <div className="mb-5">
                            {/* Título de la receta */}
                            <div className="flex flex-row justify-normal items-center mb-3">
                                <h1 className="text-6xl font-black mr-1">{recipes[currentRecipeIndex].title}</h1>
                            </div>

                            {/* Nivel de dificultad y tiempo de preparación */}
                            <div className="flex flex-row justify-between items-center mt-7 mb-2 text-xl text-white">
                                <p className="font-semibold">Nivel: {recipes[currentRecipeIndex].level}</p>
                                <p className="font-semibold">Tiempo: {recipes[currentRecipeIndex].time}</p>
                            </div>

                            {/* Ingredientes con cantidades específicas */}
                            <p className="font-semibold mb-5 text-center text-4xl">Ingredientes</p>
                            <ul className="list-disc list-inside text-white">
                                {Array.isArray(recipes[currentRecipeIndex]?.ingredients) && recipes[currentRecipeIndex].ingredients.map((ingredient, index) => {
                                    const [name, quantity] = ingredient.split(' - ');
                                    const safeName = name ? name.trim() : '';
                                    const safeQuantity = quantity ? quantity.trim() : '';
                                    return (
                                        <li key={index} className={'capitalize flex flex-row justify-between'}>
                                            <span style={{ marginRight: '10px' }}>{safeName}</span>
                                            <span>{safeQuantity}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Preparación paso a paso */}
                            {showPreparation && (
                                <>
                                    <p className="font-semibold my-5 text-center text-4xl">Preparación</p>
                                    <ol className="list-decimal list-inside mb-4 font-sans text-justify text-white">
                                        {recipes[currentRecipeIndex].preparation.map((step, index) => {
                                            // Eliminar cualquier número cardinal al inicio del paso usando una expresión regular
                                            const cleanedStep = step.replace(/^\d+\.\s*/, ''); // Elimina números como '1. ', '2. ', etc.
                                            return (
                                                <li key={index} className="mb-2">{cleanedStep}</li>
                                            );
                                        })}
                                    </ol>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showFavorites && favoriteRecipes.length > 0 && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: '100', maxWidth: '400px' }} className="bg-[#00cc66] p-3 rounded-lg shadow-lg text-black">
                    <div className="mb-5">
                        <div className="flex flex-row justify-between items-center mb-3">
                            <h1 className="text-6xl font-black">{favoriteRecipes[currentRecipeIndex].title}</h1>
                        </div>

                        {/* Nivel de dificultad y tiempo de preparación */}
                        <div className="flex flex-row justify-between items-center mt-7 mb-2 text-xl text-white">
                            <p className="font-semibold">Nivel: {favoriteRecipes[currentRecipeIndex].level}</p>
                            <p className="font-semibold">Tiempo: {favoriteRecipes[currentRecipeIndex].cook_time}</p>
                        </div>

                        {/* Ingredientes con cantidades específicas */}
                        <p className="font-semibold mb-5 text-center text-4xl">Ingredientes</p>
                        <ul className="list-disc list-inside text-white">
                            {favoriteRecipes[currentRecipeIndex]?.ingredients &&
                                Array.isArray(JSON.parse(favoriteRecipes[currentRecipeIndex].ingredients.replace(/'/g, '"'))) &&
                                JSON.parse(favoriteRecipes[currentRecipeIndex].ingredients.replace(/'/g, '"')).map((ingredient, index) => {
                                    const [name, quantity] = ingredient.split(' - '); // Dividir el string en nombre y cantidad
                                    const safeName = name ? name.trim() : ''; // Validación para nombre
                                    const safeQuantity = quantity ? quantity.trim() : ''; // Validación para cantidad
                                    return (
                                        <li key={index} className={'capitalize flex flex-row justify-between'}>
                                            <span
                                                style={{marginRight: '10px'}}>{safeName}</span> {/* Nombre del ingrediente */}
                                            <span>{safeQuantity}</span> {/* Cantidad */}
                                        </li>
                                    );
                                })
                            }
                        </ul>

                        {/* Preparación paso a paso */}
                        {showPreparation && (
                            <>
                                <p className="font-semibold my-5 text-center text-4xl">Preparación</p>
                                <ol className="list-decimal list-inside mb-4 font-sans text-justify text-white">
                                    {JSON.parse(favoriteRecipes[currentRecipeIndex].preparation.replace(/'/g, '"')).map((step, index) => {
                                        // Elimina cualquier número cardinal al inicio del paso usando una expresión regular
                                        const cleanedStep = step.replace(/^\d+\.\s*/, '');
                                        return (
                                            <li key={index} className="mb-2">{cleanedStep}</li>
                                        );
                                    })}
                                </ol>
                            </>
                        )}
                    </div>
                </div>
            )}
            {showUserModal && (
                <div className="modal-container">
                    <div className={'modal-content'}>
                        <input
                            id="nameInput"
                            type="text"
                            value={name}
                            className="py-3 pe-0 ps-8 block w-full text-[100px] bg-transparent border-t-transparent border-b-2 border-x-transparent border-b-gray-200  focus:border-t-transparent focus:border-x-transparent focus:border-b-blue-500 focus:ring-0 disabled:opacity-50 disabled:pointer-events-none dark:border-b-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 dark:focus:border-b-neutral-600"
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Mi nombre es..."
                        />
                    </div>
                </div>
            )}

            {
                showRecipes  && (
                    <div style={recipeContainerStyle}>
                        <p style={recipeTitleStyle} className={'text-[#00cc66]'}>{recipes[currentRecipeIndex]?.title}</p>
                        <div style={{display: 'flex', gap: '10px'}}>
                            {recipes.map((recipe, index) => (
                                <div
                                    key={recipe.id}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        backgroundColor: index === currentRecipeIndex ? '#00cc66' : '#ddd',
                                        color: index === currentRecipeIndex ? '#fff' : '#000',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {index + 1}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
            {
                showFavorites && favoriteRecipes.length > 0 && (
                    <div style={recipeContainerStyle}>
                        <p style={recipeTitleStyle} className={'text-[#00cc66]'}>{favoriteRecipes[currentRecipeIndex]?.title}</p>
                        <div style={{display: 'flex', gap: '10px'}}>
                            {favoriteRecipes.map((favoriteRecipe, index) => (
                                <div
                                    key={favoriteRecipe.id}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        backgroundColor: index === currentRecipeIndex ? '#00cc66' : '#ddd',
                                        color: index === currentRecipeIndex ? '#fff' : '#000',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {index + 1}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
            <WeatherClock/>
            <span className={'text-black'}><strong>{transcript}</strong></span>
        </div>
    )
}

const clockContainerStyle = {
    position: "fixed",
    bottom: "20px",
    right: "10px",
    color: "#00cc66",
    fontSize: "20px",
    backgroundColor: "rgb(0, 0, 0)",
    padding: "10px",
    borderRadius: "8px",
    zIndex: 100,
    textAlign: "center",
};

const timeStyle = {
    fontSize: "18px",
    marginBottom: "5px",
};

const temperatureStyle = {
    fontSize: "22px",
    fontWeight: "bold",
};

const recipeContainerStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '10px',
    backgroundColor: '#000',
    padding: '10px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2
};

const recipeTitleStyle = {
    fontWeight: 'bold',
    marginRight: '20px',
};

const menuStyle = {
    position: 'fixed',
    top: '20px',
    right: '10px',
    width: '350px',
    backgroundColor: '#000',
    color: '#fff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 10
};

const menuTitleStyle = {
    margin: '0 0 10px',
    fontSize: '24px',
    borderBottom: '2px solid white',
    paddingBottom: '5px',
    color: 'white',
};

export default Camera