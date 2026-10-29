const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/Books');

// Array para armazenar livros em memória
let memoryUsers = [{id: '1'}]