const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  year: Number,
  available: Boolean
});

module.exports = mongoose.model('Book', bookSchema);