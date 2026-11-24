const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Book = require('../models/Books');
const User = require('../models/User');
const { recordLog } = require('../utils/logger');

let memoryBooks = [
  { _id: '1', title: 'Livro em memória', author: 'Autor Desconhecido', year: 2023, available: true },
];

const isMongoAvailable = () => mongoose.connection.readyState === 1;

async function getOwnerInfo(ownerId) {
  if (isMongoAvailable() && mongoose.Types.ObjectId.isValid(ownerId)) {
    const user = await User.findById(ownerId).select('name email');
    if (user) return { userName: user.name, userEmail: user.email };
  }
  return { userName: 'Usuário', userEmail: '' };
}

// Listar livros do usuário
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

    return res.json(memoryBooks.filter((book) => book.owner === ownerId));
  } catch (error) {
    console.error('Error fetching books:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar livros', error: error.message });
  }
});

// Criar livro + Gravar Log
router.post('/', async (req, res) => {
  try {
    const { ownerId, ...bookData } = req.body;
    if (!ownerId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    const ownerInfo = await getOwnerInfo(ownerId);

    if (isMongoAvailable()) {
      const newBook = new Book({ ...bookData, owner: ownerId });
      await newBook.save();

      await recordLog({
        userId: ownerId,
        ...ownerInfo,
        action: 'CRIAR_LIVRO',
        details: `Criou o livro "${newBook.title}" de ${newBook.author} (${newBook.year})`,
      });

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

    await recordLog({
      userId: ownerId,
      ...ownerInfo,
      action: 'CRIAR_LIVRO',
      details: `Criou o livro "${newBook.title}" de ${newBook.author} (${newBook.year})`,
    });

    return res.status(201).json(newBook);
  } catch (error) {
    console.error('Error creating book:', error.message);
    return res.status(500).json({ message: 'Erro ao criar livro', error: error.message });
  }
});

// Editar livro + Gravar Log detalhado
router.put('/:id', async (req, res) => {
  try {
    const { ownerId, _id, owner, ...bookData } = req.body;
    if (!ownerId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    const ownerInfo = await getOwnerInfo(ownerId);

    if (isMongoAvailable()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'ID do livro inválido' });
      }

      const oldBook = await Book.findOne({ _id: req.params.id, owner: ownerId });
      if (!oldBook) {
        return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
      }

      const updated = await Book.findOneAndUpdate(
        { _id: req.params.id, owner: ownerId },
        bookData,
        { new: true }
      );

      await recordLog({
        userId: ownerId,
        ...ownerInfo,
        action: 'EDITAR_LIVRO',
        details: `Editou "${oldBook.title}" -> Título: "${updated.title}", Autor: "${updated.author}", Ano: ${updated.year}, Status: ${updated.available ? 'Disponível' : 'Indisponível'}`,
      });

      return res.json(updated);
    }

    const book = memoryBooks.find(
      (item) => item._id === req.params.id && item.owner === ownerId
    );
    if (!book) {
      return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
    }

    const oldTitle = book.title;
    Object.assign(book, bookData);

    await recordLog({
      userId: ownerId,
      ...ownerInfo,
      action: 'EDITAR_LIVRO',
      details: `Editou "${oldTitle}" -> Título: "${book.title}", Autor: "${book.author}", Ano: ${book.year}, Status: ${book.available ? 'Disponível' : 'Indisponível'}`,
    });

    return res.json(book);
  } catch (error) {
    console.error('Error updating book:', error.message);
    return res.status(500).json({ message: 'Erro ao atualizar livro', error: error.message });
  }
});

// Excluir livro + Gravar Log
router.delete('/:id', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    const ownerInfo = await getOwnerInfo(ownerId);
    let deletedTitle = req.params.id;

    if (isMongoAvailable()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'ID do livro inválido' });
      }

      const deleted = await Book.findOneAndDelete({ _id: req.params.id, owner: ownerId });
      if (!deleted) {
        return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
      }
      deletedTitle = deleted.title;
    } else {
      const bookIndex = memoryBooks.findIndex(
        (item) => item._id === req.params.id && item.owner === ownerId
      );
      if (bookIndex === -1) {
        return res.status(404).json({ message: 'Livro não encontrado para este usuário' });
      }
      deletedTitle = memoryBooks[bookIndex].title;
      memoryBooks.splice(bookIndex, 1);
    }

    await recordLog({
      userId: ownerId,
      ...ownerInfo,
      action: 'EXCLUIR_LIVRO',
      details: `Excluiu o livro "${deletedTitle}"`,
    });

    return res.json({ message: 'Livro excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting book:', error.message);
    return res.status(500).json({ message: 'Erro ao excluir livro', error: error.message });
  }
});

router.getMemoryBooksByOwner = (ownerId) => memoryBooks.filter((book) => book.owner === ownerId);

module.exports = router;
