const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  action: {
    type: String,
    enum: ['LOGIN', 'LOGOUT', 'CRIAR_LIVRO', 'EDITAR_LIVRO', 'EXCLUIR_LIVRO'],
    required: true,
  },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', logSchema);
