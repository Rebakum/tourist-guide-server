const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    'http://localhost:5173',
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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.upnu39b.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();

    const userCollection = client.db('touristDb').collection('users');
    const tourCollection = client.db('touristDb').collection('tours');
    const wishListCollection = client.db('touristDb').collection('wishLists');
    const guideCollection = client.db('touristDb').collection('guides');
    const bookingCollection = client.db('touristDb').collection('bookings');
    const reviewCollection = client.db('touristDb').collection('reviews');
    const reviewStoryCollection = client.db('touristDb').collection('reviewsStory');

    //----- JWT API ----
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    //----- Middleware ----
    const verifyToken = (req, res, next) => {
      const authorizationHeader = req.headers.authorization;
      if (!authorizationHeader) {
        return res.status(401).send({ message: 'Forbidden access 1' });
      }
      const token = authorizationHeader.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access 2' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (!user || user.role !== 'admin') {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      next();
    };

    // User get all with search, filter, and pagination
    // User get all with search, filter, and pagination
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const { search, role, page = 1, perPage = 10 } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      if (role) {
        query.role = role;
      }

      const skip = (page - 1) * perPage;
      const total = await userCollection.countDocuments(query);
      const users = await userCollection.find(query).skip(skip).limit(parseInt(perPage)).toArray();

      res.send({ users, total });
    });


    // User API - Create
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertOne: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // User get by email
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

    // Check if user is admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorized' });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      res.send({ admin: isAdmin });
    });

    // Update user role to admin
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { role: 'admin' } };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    // Update user role to tour guide
    app.patch('/users/tourguide/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { role: 'tour guide' } };
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

    // Tours API - Get all data
    app.get('/tours', async (req, res) => {
      const tourType = req.query.tourType;
      const query = tourType && tourType !== 'null' ? { tourType } : {};
      const result = await tourCollection.find(query).toArray();
      res.send(result);
    });

    // Tours API - Create
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

    // Booking API - Create
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // Booking API - Get by email

    // Booking API - Get by email with pagination
    app.get('/bookings/:email', async (req, res) => {
      const email = req.params.email;
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.perPage) || 10;
      const query = { touristEmail: email };

      const skip = (page - 1) * perPage;
      const total = await bookingCollection.countDocuments(query);
      const bookings = await bookingCollection.find(query).skip(skip).limit(perPage).toArray();

      res.send({ bookings, total });
    });


    // Booking API - Get all by guide email
    // app.get('/bookings', verifyToken, async (req, res) => {
    //   const guideEmail = req.query.guideEmail;
    //   const query = { guideEmail: guideEmail };
    //   const result = await bookingCollection.find(query).toArray();
    //   res.send(result);
    // });



    // Booking API - Get all by guide email with pagination
    // Update the route to handle pagination
    app.get('/bookings', verifyToken, async (req, res) => {
      const guideEmail = req.query.guideEmail;
      const page = parseInt(req.query.page) || 1; // Get page from query parameters
      const perPage = 10; // Set number of items per page
      const skip = (page - 1) * perPage;

      const query = { guideEmail: guideEmail };
      const result = await bookingCollection.find(query).skip(skip).limit(perPage).toArray();
      res.send(result);
    });


    // Booking API - Update status to "Paid"
    app.patch('/bookings/pay/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { status: 'Paid' } };
      const result = await bookingCollection.updateOne(query, update);
      res.send(result);
    });

    // Booking API - Delete
    app.delete('/bookings/cancel/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // Booking API - Update status to "Accepted"
    app.patch('/bookings/accept/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { status: 'Accepted' } };
      const result = await bookingCollection.updateOne(query, update);
      res.send(result);
    });

    // Booking API - Update status to "Rejected"
    app.patch('/bookings/reject/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { status: 'Rejected' } };
      const result = await bookingCollection.updateOne(query, update);
      res.send(result);
    });

    // Guides API - Get all
    app.get('/guides', async (req, res) => {
      const result = await guideCollection.find().toArray();
      res.send(result);
    });

    // Guides API - Create
    app.post('/guides', async (req, res) => {
      const guide = req.body;
      const result = await guideCollection.insertOne(guide);
      res.send(result);
    });

    // Guides API - Get single
    app.get('/guides/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await guideCollection.findOne(query);
      res.send(result);
    });



    // Reviews API - Get all with pagination
    app.get('/reviews', async (req, res) => {
      const { page = 1, perPage = 10, guideId, tourId } = req.query;
      const query = {};

      if (guideId) {
        query.guideId = guideId;
      }

      if (tourId) {
        query.tourId = tourId;
      }

      const skip = (page - 1) * perPage;
      const total = await reviewCollection.countDocuments(query);
      const reviews = await reviewCollection.find(query).skip(skip).limit(parseInt(perPage)).toArray();
      res.send({ reviews, total });
    });

    // Reviews API - Create
    app.post('/set-reviews', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    // get review for this guide
    app.get("/all-comment/:email", async (req, res) => {
      const query = { guidEmail: req.params.email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result)
    })
 

    // Reviews Story API - Get all
    app.get('/reviewsStory', async (req, res) => {
      const result = await reviewStoryCollection.find().toArray();
      res.send(result);
    });

    // Reviews Story API - Create
    app.post('/reviewsStory', async (req, res) => {
      const reviewStory = req.body;
      const result = await reviewStoryCollection.insertOne(reviewStory);
      res.send(result);
    });

    // Reviews Story API - Get by tour
    app.get('/reviewsStory/:tourId', async (req, res) => {
      const tourId = req.params.tourId;
      const query = { tourId };
      const result = await reviewStoryCollection.find(query).toArray();
      res.send(result);
    });

    // Wishlist API - Get by user email
    // app.get('/wishLists', async (req, res) => {
    //   const email = req.query.email;
    //   const query = { email };
    //   const result = await wishListCollection.find(query).toArray();
    //   console.log('Wishlist data for email:', email, result); // Log the result
    //   res.send(result);
    // });


    // Correctly handle the pagination and response
    app.get('/wishLists', async (req, res) => {
      const email = req.query.email;
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.perPage) || 10;
      const query = { email };

      const skip = (page - 1) * perPage;
      const total = await wishListCollection.countDocuments(query);
      const wishLists = await wishListCollection.find(query).skip(skip).limit(perPage).toArray();

      res.send({ wishLists, total });
    });




    // Wishlist API - Create
    app.post('/wishLists', async (req, res) => {
      const wishList = req.body;
      console.log(wishList)
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    // Wishlist API - Delete
    app.delete('/wishLists/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });

    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Tourist guide server is running...');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
