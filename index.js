const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const app = express();
const port = process.env.port || 5000;

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}
//---------midleware--------
app.use(cors(corsOptions))
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.upnu39b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
        const  tourCollection = client.db('touristDb').collection('tours')
      // Connect the client to the server	(optional starting in v4.7)

      //----------tours api-----------
    app.get('/tours', async(req, res)=>{
        const result = await tourCollection.find().toArray()
        res.send(result)
    })
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
     
    }
  }
  run().catch(console.dir);

app.get('/', (req, res)=>{
    res.send("tourists and travel runing")
})

app.listen(port, ()=>console.log(`server running on port ${port}`))