import axios from 'axios';




export const fetchNutritionAndRecipes = async (setLoading, setShowRecipes, setNewInfoAvailable, detections, userInfo, setNutritionInfo, setDetections, setRecipes, setShowNotifications) => {
    setLoading(true);
    setShowRecipes(false);
    setNewInfoAvailable(false);
    const apiKey = process.env.REACT_APP_API_KEY
    const ingredients = detections.map(detection => detection.name).join(', ');
    const nutritionalInfo = userInfo.preferred_cuisines.split(' ');
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that provides nutritional information and recipes in Spanish."
                },
                {
                    role: "user",
                    content: `Dame la información nutricional: ${nutritionalInfo.join(',')}. También tres recetas usando los siguientes ingredientes: ${ingredients}. La respuesta debe estar estructurada de la siguiente manera (no antepongas la palabra json a la respuesta generada):
                        {
                            "nutritional_info": {
                                "Ingrediente1": {
                                    "nutritionalInformation1": "X",
                                    "nutritionalInformation2": "X",
                                    "nutritionalInformation3": "X"
                                },
                                "Ingrediente2": {
                                    "nutritionalInformation1": "X",
                                    "nutritionalInformation2": "X",
                                    "nutritionalInformation3": "X"
                                }
                            },
                            "recipes": [
                                {
                                    "title": "Receta 1",
                                    "ingredients": "ingrediente1, ingrediente2, ...",
                                    "preparation": "preparación detallada"
                                },
                                {
                                    "title": "Receta 2",
                                    "ingredients": "ingrediente1, ingrediente2, ...",
                                    "preparation": "preparación detallada"
                                },
                                {
                                    "title": "Receta 3",
                                    "ingredients": "ingrediente1, ingrediente2, ...",
                                    "preparation": "preparación detallada"
                                }
                            ]
                        }`
                }
            ],
            max_tokens: 1000
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
            nutrition: nutritional_info[detection.name] || { calorias: 'No disponible', fibra: 'No disponible', calcio: 'No disponible' }
        }));
        setNutritionInfo(nutritional_info);
        setDetections(updatedDetections);
        setRecipes(recipes);
        setShowNotifications(true);
        setLoading(false);
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
            const rv2 = await axios.get('http://127.0.0.1:8000/api/get-user-profile/36/');
            setUserInfo(rv2.data);
            setIsDetectionActive(true);
            setIsMenuOpen(true);
        }
    }catch (e) {
        console.log('Error showing user: ', e);
    }
}

export const handleSaveUserInfo = async (name, dob, foodPreference, setUserInfo, setShowUserModal) => {
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/create-user/', {
            first_name: name,
            birth_date: dob,
            preferred_cuisines: foodPreference.join(', ')
        });
        setUserInfo(response.data);

        setShowUserModal(false);
    } catch (error) {
        console.error("Error saving user info:", error);
    }
};

export const handleAddFavoriteRecipe = async (userInfo, recipes, currentRecipeIndex) => {
    try {
        await axios.post('http://127.0.0.1:8000/api/create-favorite-recipe/', {
            user_id: userInfo.id,
            title: recipes[currentRecipeIndex].title,
            ingredients: recipes[currentRecipeIndex].ingredients,
            preparation: recipes[currentRecipeIndex].preparation
        });
        alert('Receta guardada como favorita');
    } catch (error) {
        console.error("Error saving favorite recipe:", error);
    }
};