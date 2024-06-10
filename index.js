const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ['http://localhost:5173',
    'http://localhost:5174',
    'https://tourist-guide-3bd84.web.app',
    'https://tourist-guide-3bd84.firebaseapp.com'
  ],

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
    // await client.connect();

    const userCollection = client.db('touristDb').collection('users');
    const tourCollection = client.db('touristDb').collection('tours');
    const wishListCollection = client.db('touristDb').collection('wishLists');
    const guideCollection = client.db('touristDb').collection('guides');
    const bookingCollection = client.db('touristDb').collection('bookings');
    const reviewCollection = client.db('touristDb').collection('reviews');
    const reviewStoryCollection = client.db('touristDb').collection('reviewsStory');

    //-----jwt api----
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })
    //-----midleware----
    const verifyToken = (req, res, next) => {
      console.log('inside verify Token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access 1' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {

          return res.ststus(401).send({ message: 'forbidden access 2' })
        }
        req.decoded = decoded
        next();
      })

    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // user get all
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //----user api---------
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertOne: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });



    // user get by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        res.send(user);
      } else {
        res.status(404).send({ message: 'User not found' });
      }
    });

    app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ messqage: 'unauthorized' })
      }
      const query = { email: email }
      const result = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })


    // Update user role to admin
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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
    app.patch('/users/tourguide/:id', verifyToken, verifyAdmin, async (req, res) => {
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
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });


    // user get all with search and filter
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const { search, role } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      if (role) {
        query.role = role;
      }

      const result = await userCollection.find(query).toArray();
      res.send(result);
    });


    // Tours API - Get all data
    app.get('/tours', async (req, res) => {
      const tourType = req.query.tourType;
     console.log(tourType)
      let query = {}
      if (tourType && tourType !== 'null') query = { tourType }
      const result = await tourCollection.find(query).toArray();
      res.send(result);
    });
    // Tour Api -post 
    app.post('/tours', async (req, res) => {
      const query = req.body;
      const result = await tourCollection.insertOne(query);
      res.send(result);
    });

    // Tours API - Get single data
    app.get('/tour/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tourCollection.findOne(query);
      res.send(result);
    });

    // ----booking post api-----
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })

    // Tours API - Get single data
    app.get('/bookings/:email', async (req, res) => {
      const email = req.params.email;
      const query = { touristEmail: email };
      console.log(query)
      const result = await bookingCollection.find(query).toArray();
      console.log(result)
      res.send(result);
    });
    app.get('/bookings', verifyToken, async (req, res) => {
      const guideEmail = req.query.guideEmail;
      const query = { guideEmail: guideEmail };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    // Endpoint to update booking status to "Paid"
    app.patch('/bookings/pay/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: 'Paid'
        }
      };
      const result = await bookingCollection.updateOne(query, update);
      res.send(result);
    });

    // Endpoint to update booking status to "Cancelled"
    app.delete('/bookings/cancel/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.patch('/bookings/accept/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: 'Accepted'
        }
      };
      const result = await bookingCollection.updateOne(query, update);
      res.send(result);
    });

    // Endpoint to update booking status to "Rejected"
    app.patch('/bookings/reject/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: 'Rejected'
        }
      };
      const result = await bookingCollection.updateOne(query, update);
      res.send(result);
    });


    // guides API - Get all data
    app.get('/guides', async (req, res) => {
      const result = await guideCollection.find().toArray();
      res.send(result);
    });
    // Tours API - Get single data
    app.get('/guides/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await guideCollection.findOne(query);
      res.send(result);
    });

    // review api post data
    app.post('/reviews', async (req, res) => {
      const query = req.body;
      const result = await reviewCollection.insertOne(query)
      res.send(query)
    })
    // review api get
    app.get('/reviewsStory', async (req, res) => {
      const result = await reviewStoryCollection.find().toArray()
      res.send(result)
    })
    // Assuming you have an Express app and a reviewCollection defined

    app.get('/reviews', async (req, res) => {
      const email = req.query.email;
      const query = { touristEmail: email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);      
    })



    // -----Wishlist API - Add to wishlist---
    app.post('/wishLists', async (req, res) => {
      const wishList = req.body;
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    // -----wishlists api get--------
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
    // await client.db("admin").command({ ping: 1 });
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
