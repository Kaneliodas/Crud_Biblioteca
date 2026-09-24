const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Book = require('../models/Books');

let memoryBooks = [
  { _id: '1', title: 'O príncipe', author: 'Maquiavel', year: 1900, available: true },
  { _id: '2', title: 'A Divina Comédia', author: 'Dante Alighieri', year: 1321, available: false },
];

const isMongoAvailable = () => mongoose.connection.readyState === 1;

// Pegando todos os livros
router.get('/', async (req, res) => {
  try {
    if (isMongoAvailable()) {
      const books = await Book.find();
      return res.json(books);
    }

    return res.json(memoryBooks);
  } catch (error) {
    console.error('Error fetching books:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar livros', error: error.message });
  }
});

// Criando um livro - C do crud
router.post('/', async (req, res) => {
  try {
    if (isMongoAvailable()) {
      const newBook = new Book(req.body);
      await newBook.save();
      return res.status(201).json(newBook);
    }

    const newBook = {
      ...req.body,
      _id: String(Date.now()),
      year: Number(req.body.year || 0),
      available: Boolean(req.body.available),
    };

    memoryBooks.push(newBook);
    return res.status(201).json(newBook);
  } catch (error) {
    console.error('Error creating book:', error.message);
    return res.status(500).json({ message: 'Erro ao criar livro', error: error.message });
  }
});

module.exports = router;