const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Book = require('../models/Books');

let memoryBooks = [
  

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
    return res.status(500).json({ message: 'Erro ao criar livro, é osso :(', error: error.message });
  }
});
//Update de algum livro - U do Crud
router.put('/:id',async (req, res) => {
  const updated = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true});
  res.json(updated);
});
//Deletando algum livro - D do Crud
router.delete('/:id', async (req, res) => {
  await Book.findByIdAndDelete(req.params.id);
  res.json({message: 'Livro incinerado com sucesso! Parabéns seu lixo!'});
});

module.exports = router;