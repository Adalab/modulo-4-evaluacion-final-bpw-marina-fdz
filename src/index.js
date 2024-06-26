const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 5001;
const api = express();

api.use(cors());
api.use(express.json({ limit: '25mb' }));

api.listen(PORT, ()=>{
    console.log(`Server running in port : http://localhost:${PORT}`);
});

async function getConnection(){
    const conex = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    await conex.connect();
    console.log('conexion con la BD' + conex.threadId);
    return conex;
}

//get all recipes
api.get("/recipes", async(req, res)=>{
    try{
        const conn = await getConnection();
        const select = `SELECT 
            recipes.idRecipe, 
            recipes.nameRecipe,
            recipes.descRecipe,
            recipes.cookingTime,
            ingredients.idIngredient,
            ingredients.nameIngredient,
            recipes_have_ingredients.quantity,
            recipes_have_ingredients.unit,
            recipes.directions,
            recipes.background,
            images.image,
            grandmas.idGrandma, 
            grandmas.name,
            grandmas.lastname,
            grandmas.city,
            grandmas.province,
            grandmas.photo
            FROM grandmas INNER JOIN recipes ON grandmas.idGrandma = recipes.fkGrandma INNER JOIN recipes_have_ingredients ON recipes.idRecipe = recipes_have_ingredients.fkRecipe INNER JOIN ingredients ON recipes_have_ingredients.fkIngredient = ingredients.idIngredient INNER JOIN images ON images.fkRecipe = recipes.idRecipe;`;
        const [results] = await conn.query(select);
        await conn.end();

        const recipesMap = new Map();
        results.forEach(row => {
            if (!recipesMap.has(row.idRecipe)) {
                recipesMap.set(row.idRecipe, {
                    idRecipe: row.idRecipe,
                    nameRecipe: row.nameRecipe,
                    descRecipe: row.descRecipe,
                    cookingTime: row.cookingTime,
                    ingredients: [],
                    directions: row.directions,
                    background: row.background,
                    images: [],
                    grandma: {
                        idGrandma: row.idGrandma,
                        nameGrandma: {
                            name: row.name,
                            lastname: row.lastname
                        },
                        location: {
                            city: row.city,
                            province: row.province
                        },
                        photo: row.photo
                    }
                });
            }

            // Add ingredient to the recipe
            recipesMap.get(row.idRecipe).ingredients.push({
                idIngredient: row.idIngredient,
                nameIngredient: row.nameIngredient,
                quantity: row.quantity,
                unit: row.unit
            });

            // Add image to the recipe if not already added
            if (row.image && !recipesMap.get(row.idRecipe).images.some(img => img === row.image)) {
                recipesMap.get(row.idRecipe).images.push(row.image);
            }
        });

        const recipes = Array.from(recipesMap.values());

        res.status(200).json({
            info: {count: recipes.length},
            results: recipes,
        });
    }catch (error){
        res.status(400).json(error);
    }
});

//get recipes by name
api.get("/recipes/:nameRecipe", async (req, res) => {
    try {
        const conn = await getConnection();
        const { nameRecipe } = req.params;
        const select = `SELECT 
            recipes.idRecipe, 
            recipes.nameRecipe,
            recipes.descRecipe,
            recipes.cookingTime,
            ingredients.idIngredient,
            ingredients.nameIngredient,
            recipes_have_ingredients.quantity,
            recipes_have_ingredients.unit,
            recipes.directions,
            recipes.background,
            images.image,
            grandmas.idGrandma, 
            grandmas.name AS grandmaName,
            grandmas.lastname AS grandmaLastname,
            grandmas.city AS grandmaCity,
            grandmas.province AS grandmaProvince,
            grandmas.photo AS grandmaPhoto
            FROM grandmas 
            INNER JOIN recipes ON grandmas.idGrandma = recipes.fkGrandma 
            INNER JOIN recipes_have_ingredients ON recipes.idRecipe = recipes_have_ingredients.fkRecipe 
            INNER JOIN ingredients ON recipes_have_ingredients.fkIngredient = ingredients.idIngredient 
            INNER JOIN images ON images.fkRecipe = recipes.idRecipe
            WHERE recipes.nameRecipe LIKE ?;`;
        const [results] = await conn.query(select, [`%${nameRecipe}%`]);
        await conn.end();

        const recipesMap = new Map();
        results.forEach(row => {
            if (!recipesMap.has(row.idRecipe)) {
                recipesMap.set(row.idRecipe, {
                    idRecipe: row.idRecipe,
                    nameRecipe: row.nameRecipe,
                    descRecipe: row.descRecipe,
                    cookingTime: row.cookingTime,
                    ingredients: [],
                    directions: row.directions,
                    background: row.background,
                    images: [],
                    grandma: {
                        idGrandma: row.idGrandma,
                        nameGrandma: {
                            name: row.grandmaName,
                            lastname: row.grandmaLastname
                        },
                        location: {
                            city: row.grandmaCity,
                            province: row.grandmaProvince
                        },
                        photo: row.grandmaPhoto
                    }
                });
            }
            recipesMap.get(row.idRecipe).ingredients.push({
                idIngredient: row.idIngredient,
                nameIngredient: row.nameIngredient,
                quantity: row.quantity,
                unit: row.unit
            });
            if (row.image && !recipesMap.get(row.idRecipe).images.some(img => img === row.image)) {
                recipesMap.get(row.idRecipe).images.push(row.image);
            }
        });

        const recipes = Array.from(recipesMap.values());
        if (recipes.length === 0) {
            res.status(200).json({
                success: false,
                message: `We couldn't find any recipe by that name`
            });
        } else {
            res.status(200).json({
                success: true,
                count: recipes.length,
                data: recipes
            });
        } 
    } catch (error) {
        res.status(400).json(error);
    }
});

//get recipe by id
api.get("/recipe/:idRecipe", async (req, res) => {
    try {
        const conn = await getConnection();
        const { idRecipe } = req.params;
        const select = `SELECT 
            recipes.idRecipe, 
            recipes.nameRecipe,
            recipes.descRecipe,
            recipes.cookingTime,
            ingredients.idIngredient,
            ingredients.nameIngredient,
            recipes_have_ingredients.quantity,
            recipes_have_ingredients.unit,
            recipes.directions,
            recipes.background,
            images.image,
            grandmas.idGrandma, 
            grandmas.name AS grandmaName,
            grandmas.lastname AS grandmaLastname,
            grandmas.city AS grandmaCity,
            grandmas.province AS grandmaProvince,
            grandmas.photo AS grandmaPhoto
            FROM grandmas 
            INNER JOIN recipes ON grandmas.idGrandma = recipes.fkGrandma 
            INNER JOIN recipes_have_ingredients ON recipes.idRecipe = recipes_have_ingredients.fkRecipe 
            INNER JOIN ingredients ON recipes_have_ingredients.fkIngredient = ingredients.idIngredient 
            INNER JOIN images ON images.fkRecipe = recipes.idRecipe
            WHERE recipes.idRecipe = ?;`;
        const [results] = await conn.query(select, [idRecipe]);
        await conn.end();

        const recipesMap = new Map();
        results.forEach(row => {
            if (!recipesMap.has(row.idRecipe)) {
                recipesMap.set(row.idRecipe, {
                    idRecipe: row.idRecipe,
                    nameRecipe: row.nameRecipe,
                    descRecipe: row.descRecipe,
                    cookingTime: row.cookingTime,
                    ingredients: [],
                    directions: row.directions,
                    background: row.background,
                    images: [],
                    grandma: {
                        idGrandma: row.idGrandma,
                        nameGrandma: {
                            name: row.grandmaName,
                            lastname: row.grandmaLastname
                        },
                        location: {
                            city: row.grandmaCity,
                            province: row.grandmaProvince
                        },
                        photo: row.grandmaPhoto
                    }
                });
            }
            recipesMap.get(row.idRecipe).ingredients.push({
                idIngredient: row.idIngredient,
                nameIngredient: row.nameIngredient,
                quantity: row.quantity,
                unit: row.unit
            });
            if (row.image && !recipesMap.get(row.idRecipe).images.some(img => img === row.image)) {
                recipesMap.get(row.idRecipe).images.push(row.image);
            }
        });

        const recipes = Array.from(recipesMap.values());
        if (recipes.length === 0) {
            res.status(200).json({
                success: false,
                message: `We couldn't find any recipe by that id`
            });
        } else {
            res.status(200).json({
                success: true,
                data: recipes[0]
            });
        } 
    } catch (error) {
        res.status(400).json(error);
    }
});

//get all grandmas
api.get("/grandmas", async(req, res)=>{
    try{
        const conn = await getConnection();
        const select = "SELECT * FROM grandmas;";
        const [results] = await conn.query(select);
        await conn.end();
        res.status(200).json({
            sucess: true,
            info: {count: results.length},
            results: results,
        });
    }catch (error){
        res.status(400).json(error);
    }
});

//get one grandma by id
api.get('/grandma/:idGrandma', async(req, res)=>{
    try{
        const {idGrandma} = req.params;
        const conn = await getConnection();
        const select = "SELECT * FROM grandmas WHERE idGrandma = ?;";
        const [result] = await conn.query(select, [idGrandma]);
        await conn.end();
        if(result.length === 0){
            res.status(200).json({
                success: false,
                message: 'That id does not exist in our data base'
            });
        }else{
            res.status(200).json({
                success: true,
                data: result[0],
            });
        }  
    }catch(error){
        res.status(400).json(error);
    }
});


//user signup
api.post('/signup', async (req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const { email, password } = req.body;
        const selectEmail = 'SELECT * FROM users WHERE email = ?';
        const [emailResult] = await conn.query(selectEmail, [email]);
        if (emailResult.length === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertUser = 'INSERT INTO users (email, password) VALUES (?, ?)';
            const [newUser] = await conn.query(insertUser, [email, hashedPassword]);
            await conn.end();
            res.status(201).json({ success: true, idUser: newUser.insertId });
        } else {
            res.status(400).json({ success: false, message: 'User already exists' });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    } 
});

//user login
api.post('/login', async (req, res) =>{
    try{
        conn = await getConnection();
        const { email, password } = req.body;
        const selectUser = 'SELECT * FROM users WHERE email = ?';
        const [userResult] = await conn.query(selectUser, [email]);
        if(userResult.length !== 0){
            const samePassword = await bcrypt.compare(password, userResult[0].password);
            if(samePassword){
                const secretKey = process.env.KEY_TOKEN;
                const infoToken = {email: userResult[0].email, id: userResult[0].idUser };
                const token = jwt.sign(infoToken, secretKey, {expiresIn: '1h'});
                await conn.end();
                res.status(201).json({ success: true, token: token });
            }else{
                res.status(400).json({ success: false, message: 'Wrong password' });
            }
        }else{
            res.status(400).json({ success: false, message: 'Wrong email' });
        }
    }catch(error){
        res.status(400).json({ success: false, error: error.message });
    }
});

//authorization
function authorize (req, res, next){
    const tokenString = req.headers.authorization;
    if(!tokenString){
        res.status(400).json({success: false, message: 'User not authorized'});
    }else{
        try{
            const token = tokenString.split(' ')[1];
            const secretKey = process.env.KEY_TOKEN;
            const verifiedToken = jwt.verify(token, secretKey);
            req.userInfo = verifiedToken;
        }catch(error){
            res.status(400).json({ success: false, message: error })
        }
        next();
    }
}

//get all users profiles
api.get('/users', authorize, async(req, res) =>{
    try{
        conn = await getConnection();
        const select = 'SELECT * FROM users';
        const [result] = await conn.query(select);
        await conn.end();
        res.status(201).json({ success: true, data: result });
    }catch(error){
        res.status(400).json({ success: false, error: error.message });
    }
});

//get user profile
api.get('/user/:idUser', authorize, async(req, res) =>{
    try{
        const {idUser} = req.params;
        conn = await getConnection();
        const select = 'SELECT * FROM users WHERE idUser = ?';
        const [result] = await conn.query(select, [idUser]);
        await conn.end();
        if (result.length === 0) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }else{
            res.status(200).json({ success: true, data: result[0] });
        } 
    }catch(error){
        res.status(400).json({ success: false, error: error.message });
    }
});

//add new grandma associated with user
api.post('/grandma', authorize, async (req, res)=>{
    try{
        const conn = await getConnection();
        const { name, lastname, city, province, country, birthYear, bio, photo } = req.body;
        const idUser = req.userInfo.id;
        const insertGrandma = "INSERT INTO grandmas (name, lastname, city, province, country, birthYear, bio, photo) VALUES (?,?,?,?,?,?,?,?)";
        const [newGrandma] = await conn.query(insertGrandma, [name, lastname, city, province, country, birthYear, bio, photo]);
        const insertUserGrandma = "INSERT INTO users_have_grandmas (fkUser, fkGrandma) VALUES (?,?)";
        await conn.query(insertUserGrandma, [ idUser , newGrandma.insertId ]);
        await conn.end();
        res.status(200).json({
            success: true,
            info: {idGrandma: newGrandma.insertId, idUser: idUser}
        })
    }catch(error){
        console.error('Error:', error); 
        res.status(400).json(error);
    }
});

//modify any existing grandma
api.put('/grandma/:id', authorize, async (req, res) => {
    try{
        const conn = await getConnection();
        const idGrandma = req.params.id;
        const data = req.body;
        const update = "UPDATE grandmas SET name = ?, lastname = ?, city = ?, province = ?, country = ?, birthYear = ?, bio = ?, photo = ? WHERE idGrandma = ?";
        const [result] = await conn.query(update, [
            data.name, 
            data.lastname, 
            data.city, 
            data.province, 
            data.country, 
            data.birthYear, 
            data.bio, 
            data.photo,
            idGrandma,
        ]);
        await conn.end();
        if(result.affectedRows > 0){
            res.status(200).json({ 
                success: true,
                message: result.affectedRows + ' fields updated'
             });
        }else{
            res.status(400).json({ 
                success: false, 
                message: 'That id does not exist in our data base' 
            });
        }
    }catch(error){
        res.status(400).json(error);
    }
})

//delete grandma not associated with user
api.delete('/grandma/:id', authorize, async (req, res) => {
    try{
        const conn = await getConnection();
        const idGrandma = req.params.id;
        const deleteSQL = "DELETE FROM grandmas WHERE idGrandma = ?";
        const [result] = await conn.query(deleteSQL, [idGrandma]);
        await conn.end();
        if(result.affectedRows > 0){
            res.status(200).json({ 
                success: true,
                message: `The row with idGrandma = ${idGrandma} has been deleted.`
             });
        }else{
            res.status(400).json({ 
                success: false, 
                message: 'That id does not exist in our data base' 
            });
        }
    }catch(error){
        res.status(400).json(error);
    }
})

//add new recipe associated with user and grandma
api.post('/recipes/new', authorize, async (req, res) => {
    try {
        const conn = await getConnection();
        const {
            nameRecipe,
            descRecipe,
            cookingTime,
            ingredients,
            directions,
            background,
            images,
            grandma
        } = req.body;
        
        const idUser = req.userInfo.id;

        if (!nameRecipe || !descRecipe || !cookingTime || !ingredients || !directions || !background || !images || !grandma) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        console.log(grandma);
        const insertGrandmaQuery = `
            INSERT INTO grandmas (name, lastname, city, province)
            VALUES (?, ?, ?, ?);
        `;

        const insertRecipeQuery = `
            INSERT INTO recipes (nameRecipe, descRecipe, cookingTime, fkGrandma, directions, background, fkUser)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
        
        const insertIngredientQuery = `
            INSERT INTO ingredients (nameIngredient)
            VALUES (?);
        `;

        const insertHaveIngredientQuery = `
            INSERT INTO recipes_have_ingredients (fkRecipe, fkIngredient, quantity, unit)
            VALUES (?, ?, ?, ?);
        `;
        const insertImageQuery = `
            INSERT INTO images (fkRecipe, image)
            VALUES (?, ?);
        `;

        const[grandmaResult] = await conn.query(insertGrandmaQuery, [grandma.nameGrandma.name, grandma.nameGrandma.lastname, grandma.location.city, grandma.location.province]);
        const idGrandma = grandmaResult.insertId;

        const [recipeResult] = await conn.query(insertRecipeQuery, [nameRecipe, descRecipe, cookingTime, idGrandma, directions, background, idUser]);
        const idRecipe = recipeResult.insertId;

        for (const ingredient of ingredients) {
            const [ingredientResult] = await conn.query(insertIngredientQuery, [ingredient.nameIngredient]);
            const idIngredient = ingredientResult.insertId;

            await conn.query(insertHaveIngredientQuery, [idRecipe, idIngredient, ingredient.quantity, ingredient.unit]);
        }

        for (const image of images) {
            await conn.query(insertImageQuery, [idRecipe, image]);
        }

        await conn.end();
        res.status(201).json({ message: 'Recipe added successfully', idRecipe });
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(400).json({ sucess: false, error: 'Failed to add recipe', error: error});
    }
});


//logout
api.put("/logout", async (req, res) => {
    const authHeader = req.headers["authorization"];
    jwt.sign(authHeader, "", { expiresIn: 1 } , (logout, err) => {
       if (logout) {
          res.send({success: true, message : 'Session ended' });
       } else {
          res.send({success: false, message:'Error while logging out'});
       }
    });
 });

