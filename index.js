const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASSWORD}@cluster0.jxq1zup.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



app.get('/', (req, res)=>{
   res.send('car server is running please asure that')
})


async function run(){
   try{
      const allCatagoryCollection = client.db('resalePlanet').collection('allCatagories')
      const singleCatagoryCollection = client.db('resalePlanet').collection('singleCatagory')
      const userCollection = client.db('resalePlanet').collection('users');
      const bookingsCollection = client.db('resalePlanet').collection('bookings');
      const paymentsCollection = client.db('resalePlanet').collection('payment');
      const advertisedCollection = client.db('resalePlanet').collection('advertised');

      app.get('/all-catagory', async(req, res)=>{
         const query = {};
         const result = await allCatagoryCollection.find(query).toArray();
         res.send(result)
      });

      app.get('/catagory/:id', async(req, res)=>{
         // console.log(req.params.id)
         const id = req.params.id;
         const filter = {
            catagory_id: id
         }
         const result = await singleCatagoryCollection.find(filter).toArray();
         res.send(result)
      })

      app.get('/users/:email', async(req, res)=>{
         const email = req.params.email;
         const query = {email}
         const user = await userCollection.findOne(query);
         console.log(user)
         if(user.role === "Seller"){
           return res.send({isSeller: user?.role === "Seller"})
         }
         if(user.role === "Admin"){
           return res.send({isAdmin: user?.role === "Admin"})
         }
      })

      app.delete('/user/delete/:id', async(req, res)=>{
         const id = req.params.id
         const query = {
            _id: ObjectId(id)
         }
         const result = await userCollection.deleteOne(query)
         res.send(result);
      })

      app.get('/dashboard/all-buyer', async(req, res)=>{
         const query = {
            role: 'Buyer'
         }
         const users = await userCollection.find(query).toArray()
         res.send(users)
      })

      app.get('/dashboard/all-seller', async(req, res)=>{
         const query = {
            role: 'Seller'
         }
         const users = await userCollection.find(query).toArray()
         res.send(users)
      })

      app.get('/dashboard', async(req, res)=>{
         
         const email = req.query.email;
         const filter = {
            email
         }
         const user = await userCollection.findOne(filter)
         // console.log(user)
         if(user?.role == 'Buyer'){
            const result = await bookingsCollection.find(filter).toArray();
            return res.send(result)
         }
         if(user?.role == 'Seller'){
            return res.send({isSeller: true})
         }
         else{
            return res.send({message: "Unauthorized Access"})
         }
         
      })

      app.get('/dashboard/my-product', async(req, res)=>{
         const email = req.query.email         
         const bookingQuery = {seller_email:email}
         const myproduct = await singleCatagoryCollection.find(bookingQuery).toArray()
         // const alreadybooked = await bookingsCollection.find(bookingQuery).toArray()
        res.send(myproduct)
      })

      app.post('/dashboard/addvertise/:id', async(req, res)=>{
         const id = req.params.id;
         const query = {_id: ObjectId(id)}
         const product = await singleCatagoryCollection.findOne(query)
         if(product){
            const isAdvertise = await advertisedCollection.findOne(query)
            if(!isAdvertise){
               const result = await advertisedCollection.insertOne(product)
              return res.send(result);
            }
         }
        return res.send({message: 'product already in advertise'})

      })

      app.get('/advertise',async(req, res)=>{
         const query = {}
         const allProduct = await advertisedCollection.find(query).toArray()
        return res.send(allProduct)
      })
      
      // app.delete('/dashboard/my-product/:id',async(req, res)=>{
      //    const id = req.params.id;
      //    const query = {
      //       _id: ObjectId(id)
      //    }
      //    const result = await singleCatagoryCollection.deleteOne(query)
      //    res.send(result)
      // })

      app.delete('/dashboard/my-product/:id', async(req, res)=>{
         const id= req.params.id;
         const query = {_id: ObjectId(id)}
         const name = await singleCatagoryCollection.findOne(query)
         const result = await singleCatagoryCollection.deleteOne(query)
         res.send({result, name})
      })

      app.post('/jwt', async(req, res)=>{
         const user = req.body;
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'})
         res.send({token})
         
      })

      app.post('/create-payment-intent', async (req, res) => {
         const booking = req.body;
         const price = booking.price;
         const amount = price * 100;

         const paymentIntent = await stripe.paymentIntents.create({
             currency: 'usd',
             amount: amount,
             "payment_method_types": [
                 "card"
             ]
         });
         res.send({
             clientSecret: paymentIntent.client_secret,
         });
     });

     app.post('/payments', async (req, res) =>{
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId
      const filter = {_id: ObjectId(id)}
      const updatedDoc = {
          $set: {
              paid: true,
              transactionId: payment.transactionId
          }
      }
      const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
      res.send(result);
  })

      app.post('/users', async(req, res)=>{
         const user = req.body;
         const result = await userCollection.insertOne(user);
         res.send(result);
      })

      app.post('/bookings', async(req, res)=>{
         const bookings = req.body;
         const result = await bookingsCollection.insertOne(bookings);
         res.send(result);
      })

      app.get('/dashboard/payment/:id', async(req, res)=>{
         const id = req.params.id
         const query = {
            _id: ObjectId(id)
         }
         const result = await bookingsCollection.findOne(query)
         res.send(result)
      })

      app.post('/dashboard/add-product', async(req, res)=>{
         const productInfo = req.body;
         const result = await singleCatagoryCollection.insertOne(productInfo);
         res.send(result);
      })
   }
   finally{

   }
}
run().catch(err => console.log(err))

app.listen(port, ()=>{
   console.log(`port is running at ${port}`)
}) 

