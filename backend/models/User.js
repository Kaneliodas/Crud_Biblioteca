const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String},
  email: { type: String},
  password: { type: String},
  role: { type: String, enum: ['User', 'Admin'], default: 'User' },
  data_criacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);