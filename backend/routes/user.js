const express = require('express');
const mongoose = require('mongoose');
const { randomBytes } = require('crypto');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Books');
const bookRoutes = require('./book');

// Array para armazenar usuários em memória
let memoryUsers = [{ id: '1', name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'User'}];
const loginSessions = new Map();
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const normalizeRole = role =>
  String(role || 'User').trim().toLowerCase() === 'admin' ? 'Admin' : 'User';

// user routes
router.get('/', async (req, res) => {
  try {
    res.json(MongoAvailable() ? await User.find() : memoryUsers);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
  }
}
);

// Função para verificar se o MongoDB está disponível
const MongoAvailable = () => mongoose.connection.readyState === 1;

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const mongoAvailable = MongoAvailable();
    const user = mongoAvailable
      ? await User.findOne({ email, password }).select('_id name email role')
      : memoryUsers.find(user => user.email === email && user.password === password);

    if (!user) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    const accessToken = randomBytes(32).toString('hex');
    const role = normalizeRole(user.role);
    console.info(`Login autenticado via ${mongoAvailable ? 'MongoDB' : 'memória'}; perfil=${role}`);
    loginSessions.set(accessToken, {
      userId: String(user._id || user.id),
      role,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return res.json({
      user: {
        _id: user._id || user.id,
        name: user.name,
        email: user.email,
        role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Error logging in:', error.message);
    return res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Criando um usuário - C do crud
router.post('/', async (req, res) => {
  try {
    if (MongoAvailable()) {
      const newUser = new User({ ...req.body, role: 'User' });
      await newUser.save();
      return res.status(201).json(newUser);
    }

    const newUser = {
      ...req.body,
      _id: String(Date.now()),
      role: 'User',
    };
    memoryUsers.push(newUser);
    return res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error.message);
    return res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
  }
});
// Read de algum usuário - R do Crud
router.get('/:id', async (req, res, next) => {
  if (['admins', 'logs', 'users'].includes(req.params.id)) {
    return next();
  }

  try {
    if (MongoAvailable()) {
      const user = await User.findById(req.params.id);
      return res.json(user);
    }

    const user = memoryUsers.find(user => user.id === req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
  }
});

// Update de algum usuário - U do Crud
router.put('/:id', async (req, res) => {
  try {
    const userData = { ...req.body };
    delete userData.role;
    if (MongoAvailable()) {
      const updatedUser = await User.findByIdAndUpdate(req.params.id, userData, { new: true });
      return res.json(updatedUser);
    }

    const userIndex = memoryUsers.findIndex(user => user.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    memoryUsers[userIndex] = { ...memoryUsers[userIndex], ...userData };
    return res.json(memoryUsers[userIndex]);
  } catch (error) {
    console.error('Error updating user:', error.message);
    return res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
});

// Delete de algum usuário - D do Crud
router.delete('/:id', async (req, res) => {
  try {
    if (MongoAvailable()) {
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      return res.json(deletedUser);
    }

    const userIndex = memoryUsers.findIndex(user => user.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    memoryUsers.splice(userIndex, 1);
    return res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    return res.status(500).json({ message: 'Erro ao deletar usuário', error: error.message });
  }
});

//Individualizar os livros de cada usuário
router.get('/:id/books', async (req, res) => {
  try {
    if (MongoAvailable()) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      return res.json(await Book.find({ owner: user._id }));
    }

    const user = memoryUsers.find(
      item => (item._id || item.id) === req.params.id
    );
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    return res.json(bookRoutes.getMemoryBooksByOwner(req.params.id));
  } catch (error) {
    console.error('Error fetching user books:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar livros do usuário', error: error.message });
  }
});

// Rota para buscar todos os usuários com o papel "Admin"
router.get('/admins', async (req, res) => {
  try {
    if (MongoAvailable()) {
      const admins = await User.find({ role: 'Admin' });
      return res.json(admins);
    }
    const admins = memoryUsers.filter(user => user.role === 'Admin');
    return res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar administradores', error: error.message });
  }
});

// Ligar um livro a um usuário específico a partir do login/ID
router.post('/:id/books', async (req, res) => {
  try {
    if (MongoAvailable()) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      const book = await Book.create({ ...req.body, owner: user._id });
      return res.status(201).json(book);
    }

    const user = memoryUsers.find(
      item => (item._id || item.id) === req.params.id
    );
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const book = { ...req.body, owner: user._id };
    memoryBooks.push(book);
    return res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error.message);
    return res.status(500).json({ message: 'Erro ao criar livro', error: error.message });
  }
});

// Rota para buscar todos os usuários com o papel "User"
router.get('/users', async (req, res) => {
  try {
    if (MongoAvailable()) {
      const users = await User.find({ role: 'User' });
      return res.json(users);
    }
    const users = memoryUsers.filter(user => user.role === 'User');
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return res.status(500).json({message: 'Erro ao buscar usuários', error: error.message});
  }
});

// Rota para buscar todos os usuários com o papel "Admin"
router.get('/admins', async (req, res) => {
  try {
    if (MongoAvailable()) {
      const users = await User.find({ role: 'Admin' });
      return res.json(users);
    }
    const users = memoryUsers.filter(user => user.role === 'Admin');
    return res.json(users);
  } catch (error) {
    console.error('Error fetching admins:', error.message);
    return res.status(500).json({message: 'Erro ao buscar administradores', error: error.message});
  }
});

// Rota para os admins, saberem e verem os LOGS de todos os usuários, e poderem deletar ou atualizar qualquer usuário, e também poderem ver os livros de cada usuário
router.get('/logs', async (req, res) => {
  try {
    const accessToken = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    const session = accessToken && loginSessions.get(accessToken);
    if (!session || session.expiresAt <= Date.now()) {
      if (accessToken) loginSessions.delete(accessToken);
      return res.status(401).json({ message: 'Sessão inválida ou expirada' });
    }
    if (session.role !== 'Admin') {
      return res.status(403).json({ message: 'Apenas administradores podem consultar os logs' });
    }

    if (MongoAvailable()) {
      const users = await User.find().select('name email role');
      const logs = await Promise.all(users.map(async user => {
        const books = await Book.find({ owner: user._id });
        return {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: normalizeRole(user.role),
          },
          books,
        };
      }));
      return res.json(logs);
    }
    const logs = memoryUsers.map(user => {
      const books = bookRoutes.getMemoryBooksByOwner(user._id || user.id);
      return {
        user: {
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: normalizeRole(user.role),
        },
        books,
      };
    });
    return res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error.message);
    return res.status(500).json({message: 'Erro ao buscar logs', error: error.message});
  }
});

module.exports = router;