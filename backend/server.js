const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bookRoutes = require('./routes/book');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/api/books', bookRoutes);

const startMongo = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/bookstore');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('MongoDB not available. Running in memory mode:', err.message);
  }
};

startMongo(); 

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));