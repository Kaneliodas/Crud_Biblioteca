const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  year: Number,
  available: Boolean,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
 }, 
 { 
  timestamps: { createdAt: 'data_criacao', updatedAt: 'data_alteracao' } 
}
);

module.exports = mongoose.model('Book', bookSchema);