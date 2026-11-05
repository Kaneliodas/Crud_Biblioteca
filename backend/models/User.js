const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String},
  email: { type: String},
  password: { type: String},
  role: { type: String, default: 'User' },
});

const useradmSchema = new mongoose.Schema({
  name: { type: String},
  email: { type: String},
  password: { type: String},
  role: { type: String, default: 'Admin' },
});

module.exports = mongoose.model('User', userSchema);
module.exports = mongoose.model('UserAdmin', useradmSchema);