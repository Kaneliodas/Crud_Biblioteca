const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Book = require('../models/Books');

// Array para armazenar livros em memória
let memoryBooks = [{ id: '1', title: 'Livro em memória', author: 'Autor Desconhecido', year: 2023, available: true }];

// Função para verificar se o MongoDB está disponível
const isMongoAvailable = () => mongoose.connection.readyState === 1;

// Pegando todos os livros
router.get('/', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    if (isMongoAvailable()) {
      const books = await Book.find({ owner: ownerId });
      return res.json(books);
    }

    return res.json(memoryBooks.filter(book => book.owner === ownerId));
  } catch (error) {
    console.error('Error fetching books:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar livros', error: error.message });
  }
});

// Criando um livro - C do crud
router.post('/', async (req, res) => {
  try {
    const { ownerId, ...bookData } = req.body;
    if (!ownerId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    if (isMongoAvailable()) {
      const newBook = new Book({ ...bookData, owner: ownerId });
      await newBook.save();
      return res.status(201).json(newBook);
    }

    const newBook = {
      ...bookData,
      _id: String(Date.now()),
      owner: ownerId,
      year: Number(bookData.year || 0),
      available: Boolean(bookData.available),
    };

    memoryBooks.push(newBook);
    return res.status(201).json(newBook);
  } catch (error) {
    console.error('Error creating book:', error.message);
    return res.status(500).json({ message: 'Erro ao criar livro, é osso :(', error: error.message });
  }
});

//Update de algum livro - U do Crud
router.put('/:id', async (req, res) => {
  try {
    const { ownerId, ...bookData } = req.body;
    if (!ownerId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    if (isMongoAvailable()) {
      const updated = await Book.findOneAndUpdate(
        { _id: req.params.id, owner: ownerId },
        bookData,
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
      }
      return res.json(updated);
    }

    const book = memoryBooks.find(
      item => item._id === req.params.id && item.owner === ownerId
    );
    if (!book) {
      return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
    }
    Object.assign(book, bookData);
    return res.json(book);
  } catch (error) {
    console.error('Error updating book:', error.message);
    return res.status(500).json({ message: 'Erro ao atualizar livro', error: error.message });
  }
});
//Deletando algum livro - D do Crud
router.delete('/:id', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    if (isMongoAvailable()) {
      const deleted = await Book.findOneAndDelete({ _id: req.params.id, owner: ownerId });
      if (!deleted) {
        return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
      }
    } else {
      const bookIndex = memoryBooks.findIndex(
        item => item._id === req.params.id && item.owner === ownerId
      );
      if (bookIndex === -1) {
        return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
      }
      memoryBooks.splice(bookIndex, 1);
    }

    return res.json({ message: 'Livro excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting book:', error.message);
    return res.status(500).json({ message: 'Erro ao excluir livro', error: error.message });
  }
});

router.getMemoryBooksByOwner = ownerId => memoryBooks.filter(book => book.owner === ownerId);

module.exports = router;