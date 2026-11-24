const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Books');
const bookRoutes = require('./book');
const { recordLog, getAllLogs } = require('../utils/logger');

let memoryUsers = [
  {
    _id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'User',
    data_criacao: new Date(),
  },
];

const loginSessions = new Map();
const SESSION_DURATION_MS = 10 * 60 * 1000;

const MongoAvailable = () => mongoose.connection.readyState === 1;

const normalizeRole = (role) =>
  String(role || 'User').trim().toLowerCase() === 'admin' ? 'Admin' : 'User';

// Middleware: exige estar logado
const requireAuth = (req, res, next) => {
  const accessToken = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const session = accessToken && loginSessions.get(accessToken);

  if (!session || session.expiresAt <= Date.now()) {
    if (accessToken) loginSessions.delete(accessToken);
    return res.status(401).json({ message: 'Sessão inválida ou expirada' });
  }

  session.expiresAt = Date.now() + SESSION_DURATION_MS;
  req.session = session;
  next();
};

// Middleware: bloqueia qualquer usuário que NÃO seja Admin
const requireAdmin = (req, res, next) => {
  if (req.session.role !== 'Admin') {
    return res.status(403).json({ message: 'Acesso negado: apenas Admins podem visualizar os logs.' });
  }
  next();
};

// Login + Registro de entrada (LOGIN)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const mongoAvailable = MongoAvailable();
    let user = null;
    let isPasswordValid = false;

    if (mongoAvailable) {
      user = await User.findOne({ email: normalizedEmail });
      if (user && user.password) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      }
    } else {
      user = memoryUsers.find((u) => u.email === normalizedEmail);
      if (user) {
        isPasswordValid =
          user.password === password ||
          (await bcrypt.compare(password, user.password).catch(() => false));
      }
    }

    if (!user || !isPasswordValid) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    const accessToken = randomBytes(32).toString('hex');
    const role = normalizeRole(user.role);

    loginSessions.set(accessToken, {
      userId: String(user._id),
      userName: user.name,
      userEmail: user.email,
      role,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    await recordLog({
      userId: String(user._id),
      userName: user.name,
      userEmail: user.email,
      action: 'LOGIN',
      details: `Entrou no sistema (Perfil: ${role})`,
    });

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role,
        data_criacao: user.data_criacao,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Error logging in:', error.message);
    return res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Logout + Registro de saída (LOGOUT)
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const accessToken = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    const reason = req.body?.reason || 'Saiu do sistema';

    await recordLog({
      userId: req.session.userId,
      userName: req.session.userName,
      userEmail: req.session.userEmail,
      action: 'LOGOUT',
      details: reason,
    });

    if (accessToken) {
      loginSessions.delete(accessToken);
    }

    return res.json({ message: 'Logout registrado com sucesso' });
  } catch (error) {
    console.error('Error logging out:', error.message);
    return res.status(500).json({ message: 'Erro ao registrar logout' });
  }
});

// Cadastro de usuário permitindo escolha de role
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const validRole = normalizeRole(role);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (MongoAvailable()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
      }

      const newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: validRole,
      });

      await newUser.save();

      return res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        data_criacao: newUser.data_criacao,
      });
    }

    const existsInMemory = memoryUsers.some((u) => u.email === normalizedEmail);
    if (existsInMemory) {
      return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
    }

    const newUser = {
      _id: String(Date.now()),
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: validRole,
      data_criacao: new Date(),
    };
    memoryUsers.push(newUser);

    const { password: _, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  } catch (error) {
    console.error('Error creating user:', error.message);
    return res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
  }
});

// Logs completos (SOMENTE PARA ADMINS)
router.get('/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const activities = await getAllLogs();

    if (MongoAvailable()) {
      const users = await User.find().select('name email role data_criacao');
      const usersSummary = await Promise.all(
        users.map(async (user) => {
          const books = await Book.find({ owner: user._id });
          return {
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: normalizeRole(user.role),
              data_criacao: user.data_criacao,
            },
            books,
          };
        })
      );
      return res.json({ usersSummary, activities });
    }

    const usersSummary = memoryUsers.map((user) => ({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        data_criacao: user.data_criacao || new Date(),
      },
      books: bookRoutes.getMemoryBooksByOwner(user._id),
    }));
    return res.json({ usersSummary, activities });
  } catch (error) {
    console.error('Error fetching logs:', error.message);
    return res.status(500).json({ message: 'Erro ao buscar logs', error: error.message });
  }
});

module.exports = router;
