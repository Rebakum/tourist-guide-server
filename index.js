const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.upnu39b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const userCollection = client.db('touristDb').collection('users');
    const tourCollection = client.db('touristDb').collection('tours');
    const wishListCollection = client.db('touristDb').collection('wishLists');
    const guideCollection = client.db('touristDb').collection('guides');

    //----user api---------
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertOne: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    });

    // user get 
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    });

    // Update user role to admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          role: 'admin'
        }
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    // Update user role to tour guide
    app.patch('/users/tourguide/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          role: 'tour guide'
        }
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    // Delete user
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

     // guides API - Get all data
     app.get('/guides', async (req, res) => {
      const result = await tourCollection.find().toArray();
      res.send(result);
    });

    // Tours API - Get all data
    app.get('/tours', async (req, res) => {
      const result = await tourCollection.find().toArray();
      res.send(result);
    });

    // Tours API - Get single data
    app.get('/tour/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tourCollection.findOne(query);
      res.send(result);
    });

    // -----Wishlist API - Add to wishlist---
    app.post('/wishLists', async (req, res) => {
      const wishList = req.body;
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    // -----whishlists api get--------
    app.get('/wishLists', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await wishListCollection.find(query).toArray();
      res.send(result);
    });

    // ----wishList delete---
    app.delete('/wishLists/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });

   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); (Uncomment this if you want to close the connection after every request)
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("tourists and travel running");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
