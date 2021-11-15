const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

const port = process.env.PORT || 5000;
//Firebase admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jo3y1.mongodb.net/handmade_craft?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('handmade_craft');
        const productsCollection = database.collection('products');
        const usersCollection = database.collection('users');
        const orderCollection = database.collection('orders');
        const reviewCollection = database.collection('reviews');
        const sitereviewCollection = database.collection('sitereviews');

        // GET API
        app.get('/viewProducts', async (req, res) => {
            const cursor =productsCollection.find({});
            const dataList = await cursor.toArray();
            res.send(dataList);
        });
        app.get('/updateProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.json(product);
        });
        //PUT API
        app.put('/updateProducts/:id', async(req, res) => {
            const id = req.params.id;
            const updateProduct = req.body;
            const options ={upsert:true};
            const filter = { _id: ObjectId(id) };
            console.log(filter);
            const updateDoc ={
                $set:{
                    productname : updateProduct.productname,
                    price : updateProduct.price,  
                    img : updateProduct.img, 
                    rating : updateProduct.rating 
                },
            };
            const result=await productsCollection.updateOne(filter, updateDoc,options);
            console.log('Updating single product id', id);
            res.json(result);

        });
        
        // DELETE API Admin Delete Order
        app.delete('/viewallproduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        })
        
        app.post('/addProducts', async (req, res) => {
            const products = req.body;
            const result = await productsCollection.insertOne(products);
            res.json(result);
        });
        //Order Part
        // GET API
        app.get('/orders', async (req, res) => {
            const cursor =orderCollection.find({});
            const dataList = await cursor.toArray();
            res.send(dataList);
        });
        //post api(order)
        app.post('/orders',async(req,res)=>{
            const order=req.body;
            const result=await orderCollection.insertOne(order);
            res.json(result)

        });
        // update api(order status)
        app.get('/orders/:id',async(req,res)=>{
            const id= req.params.id;
            const query ={_id:ObjectId(id)};
            const newQuery={$set:{status:'Shipped'}}
            const result = await orderCollection.updateOne(query, newQuery);
            console.log('load order with id :',id)
            res.json(result)
            })

        //delete api(order)
        app.delete('/orders/:id',async(req,res)=>{
            const id = req.params.id;
            const query={_id: ObjectId(id)};
            const result =await orderCollection.deleteOne(query);
            console.log("deleting order with id",result);
            res.json(result)
        })
        // GET API With Email
        app.get('/ManageProducts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email}
            const cursor = orderCollection.find(query);
            const singleUserProducts = await cursor.toArray();
            res.json(singleUserProducts);
        })
        // GET API With status
        app.get('/orders', async (req, res) => {
            const email = req.query.ststus;
            const query = { status: status}
            const cursor = orderCollection.find(query);
            const singleUserProducts = await cursor.toArray();
            res.json(singleUserProducts);
        })

        //Users  Api Here

        // USER EMAIL FIND 
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            console.log(user);
            let isAdmin = false;
            if ( user.role === 'admin') {
                   isAdmin = true;
                   
             }
            console.log(user.role);
            
            res.json({ admin : isAdmin });
        })
       
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'You do not have access to make admin' })
            }

        })

        // Review api here 
        // GET API
        app.get('/viewReviews', async (req, res) => {
            const cursor =reviewCollection.find({});
            const dataList = await cursor.toArray();
            res.send(dataList);
        });
        //post api(order)
        app.post('/reviews',async(req,res)=>{
            const order=req.body;
            const result=await reviewCollection.insertOne(order);
            res.json(result)

        });
        // GET API
        app.get('/viewsiteReviews', async (req, res) => {
            const cursor =sitereviewCollection.find({});
            const dataList = await cursor.toArray();
            res.send(dataList);
        });
        //post api(site Reviews)
        app.post('/sitereviews',async(req,res)=>{
            const order=req.body;
            const result=await sitereviewCollection.insertOne(order);
            res.json(result)

        });
        console.log("Connected successfully mongodb server !");
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Handmade Craft Server!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})