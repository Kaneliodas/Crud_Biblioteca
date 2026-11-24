const mongoose = require('mongoose');
const Log = require('../models/Log');

let memoryLogs = [];

const isMongoAvailable = () => mongoose.connection.readyState === 1;

async function recordLog({ userId, userName, userEmail, action, details }) {
  try {
    if (isMongoAvailable() && mongoose.Types.ObjectId.isValid(userId)) {
      await Log.create({
        user: userId,
        userName: userName || 'Desconhecido',
        userEmail: userEmail || '',
        action,
        details,
      });
    } else {
      memoryLogs.unshift({
        _id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
        user: userId,
        userName: userName || 'Desconhecido',
        userEmail: userEmail || '',
        action,
        details,
        timestamp: new Date(),
      });
    }
  } catch (err) {
    console.error('Erro ao gravar log:', err.message);
  }
}

async function getAllLogs() {
  if (isMongoAvailable()) {
    return await Log.find().sort({ timestamp: -1 }).limit(100);
  }
  return memoryLogs;
}

module.exports = { recordLog, getAllLogs };
