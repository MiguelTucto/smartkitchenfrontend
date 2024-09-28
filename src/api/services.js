import axios from 'axios';




export const fetchNutritionAndRecipes = async (toast, setLoading, setShowRecipes, setNewInfoAvailable, detections, userInfo, setNutritionInfo, setDetections, setRecipes, setShowNotifications) => {
    setLoading(true);
    setShowRecipes(false);
    setNewInfoAvailable(false);
    const apiKey = process.env.REACT_APP_API_KEY
    const ingredients = detections.map(detection => detection.name).join(', ');

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert nutritionist doctor who provides up-to-date nutritional information and detailed recipes in Spanish. You are expected to offer accurate nutrient breakdowns, suggest healthy alternatives if necessary, and provide clear, easy-to-follow instructions for the recipes."
                },
                {
                    role: "user",
                    content: `Dame la información nutricional, separando los nutrientes y las vitaminas disponibles, para los siguientes ingredientes: ${ingredients} (ejemplo: 19g/19mg/etc). Además, dame 5 recetas utilizando estos ingredientes, con la siguiente estructura:
                    1. Ingredientes con cantidades específicas en el formato 'ingrediente - cantidad' (ejemplo: "harina - 200g", "agua - 100ml").
                    2. Tiempo promedio de preparación (ejemplo: "20 minutos").
                    3. Nivel de dificultad: Las dos primeras recetas deben ser de nivel fácil, las dos siguientes de nivel intermedio y la última receta de nivel difícil.
                    4. La preparación de la receta debe estar dividida paso a paso, donde cada paso esté claramente numerado.

                    La respuesta debe estar estructurada en formato JSON de esta manera (no antepongas la palabra json a la respuesta generada):
                    {
                        "nutritional_info": {
                            "Ingrediente1": {
                                "nutrientes": {
                                    "Nutriente1": "X",
                                    "Nutriente2": "X",
                                    "Nutriente3": "X"
                                },
                                "vitaminas": {
                                    "Vitamina1": "X",
                                    "Vitamina2": "X"
                                }
                            },
                            "Ingrediente2": {
                                "nutrientes": {
                                    "Nutriente1": "X",
                                    "Nutriente2": "X"
                                },
                                "vitaminas": {
                                    "Vitamina1": "X"
                                }
                            }
                        },
                        "recipes": [
                            {
                                "title": "Receta 1",
                                "level": "Fácil",
                                "time": "20 minutos",
                                "ingredients": [
                                    "Ingrediente1 - cantidad",
                                    "Ingrediente2 - cantidad"
                                ],
                                "preparation": [
                                    "Descripción detallada del paso 1",
                                    "Descripción detallada del paso 2",
                                    "...",
                                    "Descripción detallada del último paso"
                                ]
                            },
                            {
                                "title": "Receta 2",
                                "level": "Fácil",
                                "time": "30 minutos",
                                "ingredients": [
                                    "Ingrediente1 - cantidad",
                                    "Ingrediente2 - cantidad"
                                ],
                                "preparation": [
                                    "Descripción detallada del paso 1",
                                    "Descripción detallada del paso 2",
                                    "..."
                                ]
                            },
                            {
                                "title": "Receta 3",
                                "level": "Intermedio",
                                "time": "45 minutos",
                                "ingredients": [
                                    "Ingrediente1 - cantidad",
                                    "Ingrediente2 - cantidad"
                                ],
                                "preparation": [
                                    "Descripción detallada del paso 1",
                                    "Descripción detallada del paso 2",
                                    "..."
                                ]
                            },
                            {
                                "title": "Receta 4",
                                "level": "Intermedio",
                                "time": "50 minutos",
                                "ingredients": [
                                    "Ingrediente1 - cantidad",
                                    "Ingrediente2 - cantidad"
                                ],
                                "preparation": [
                                    "Descripción detallada del paso 1",
                                    "Descripción detallada del paso 2",
                                    "..."
                                ]
                            },
                            {
                                "title": "Receta 5",
                                "level": "Difícil",
                                "time": "1 hora",
                                "ingredients": [
                                    "Ingrediente1 - cantidad",
                                    "Ingrediente2 - cantidad"
                                ],
                                "preparation": [
                                    "Descripción detallada del paso 1",
                                    "Descripción detallada del paso 2",
                                    "..."
                                ]
                            }
                        ]
                    }`
                }
            ],
            max_tokens: 4000
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const responseData = JSON.parse(response.data.choices[0].message.content.trim());
        const { nutritional_info, recipes } = responseData;

        const updatedDetections = detections.map(detection => ({
            ...detection,
            nutrition: nutritional_info[detection.name] || { nutrientes: {}, vitaminas: {} }
        }));

        setNutritionInfo(nutritional_info);
        setDetections(updatedDetections);
        setRecipes(recipes);
        setLoading(false);
        setShowNotifications(true);

        toast.success("¡Información nutricional cargada!", {
            position: "top-center",
            autoClose: 3000, // 1 segundo
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: 'dark'
        });

        toast.info("¡Recetas disponibles!", {
            position: "top-center",
            autoClose: 3000, // 1 segundo
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: 'dark'
        });
    } catch (error) {
        console.error("Error fetching nutrition information and recipes:", error);
        setLoading(false);
    }
};


export const fetchFavoriteRecipes = async (userInfo, setCurrentRecipeIndex, setShowRecipes, setVoiceRecipe, setFavoriteRecipes, setShowFavorites ) => {
    if (userInfo) {
        setCurrentRecipeIndex(0);
        setShowRecipes(false);
        setVoiceRecipe(false);
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/get-user-favorite-recipes/${userInfo.id}/`);
            setFavoriteRecipes(response.data);
        } catch (e) {
            console.error("Error fetching favorite recipes:", e);
        } finally {
            setShowFavorites(true);
        }
    }
}

export const fetchRecipes = (setCurrentRecipeIndex, setShowRecipes, setShowFavorites, setVoiceRecipe, setShowNotifications) => {
    setCurrentRecipeIndex(0);
    setShowRecipes(true);
    setShowFavorites(false);
    setVoiceRecipe(true);
    setShowNotifications(false);
}

export const handleGetUserInfo = async (setShowUserModal, setUserInfo, setIsDetectionActive, setIsMenuOpen) => {
    try {
        const response = await axios.get('http://127.0.0.1:8000/api/get-all-users/');
        if (response.data.length === 0) {
            setShowUserModal(true);
        } else {
            const rv2 = await axios.get('http://127.0.0.1:8000/api/get-user-profile/4/');
            setIsDetectionActive(true);
            setUserInfo(rv2.data);
            setIsMenuOpen(true);
        }
    }catch (e) {
        console.log('Error showing user: ', e);
    }
}

export const handleSaveUserInfo = async (toast, name, setUserInfo, setShowUserModal) => {
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/create-user/', {
            first_name: name,
        });
        setUserInfo(response.data);
        setShowUserModal(false);
    } catch (error) {
        console.error("Error saving user info:", error);
    } finally {
        toast.success("¡Usuario creado satisfactoriamente!", {
            position: "top-center",
            autoClose: 3000, // 1 segundo
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: 'dark'
        });
    }
};

export const handleAddFavoriteRecipe = async (userInfo, recipes, currentRecipeIndex, setShowFavoriteNotification, toast) => {
    try {
        await axios.post('http://127.0.0.1:8000/api/create-favorite-recipe/', {
            user_id: userInfo.id,
            title: recipes[currentRecipeIndex].title,
            ingredients: recipes[currentRecipeIndex].ingredients,
            preparation: recipes[currentRecipeIndex].preparation,
            cook_time: recipes[currentRecipeIndex].time,
            level: recipes[currentRecipeIndex].level
        });
        toast.success("¡Receta añadida a favoritos!", {
            position: "top-center",
            autoClose: 3000, // 1 segundo
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: 'dark'
        });
    } catch (error) {
        console.error("Error saving favorite recipe:", error);
    }
};