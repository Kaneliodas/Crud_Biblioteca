const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const router = express.Router();
const User = require("../models/User");
const Book = require("../models/Books");
const bookRoutes = require("./book");

let memoryUsers = [
  {
    _id: "1",
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    role: "User",
    data_criacao: new Date(),
  },
];

const loginSessions = new Map();
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const MongoAvailable = () => mongoose.connection.readyState === 1;

const normalizeRole = (role) =>
  String(role || "User")
    .trim()
    .toLowerCase() === "admin"
    ? "Admin"
    : "User";

// Middleware de autenticação
const requireAuth = (req, res, next) => {
  const accessToken = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const session = accessToken && loginSessions.get(accessToken);

  if (!session || session.expiresAt <= Date.now()) {
    if (accessToken) loginSessions.delete(accessToken);
    return res.status(401).json({ message: "Sessão inválida ou expirada" });
  }

  req.session = session;
  next();
};

// Middleware de administrador
const requireAdmin = (req, res, next) => {
  if (req.session.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Apenas administradores podem acessar este recurso" });
  }
  next();
};

// Login com verificação de senha criptografada
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const mongoAvailable = MongoAvailable();
    let user = null;
    let isPasswordValid = false;

    if (mongoAvailable) {
      user = await User.findOne({ email: normalizedEmail }).select(
        "+password _id name email role data_criacao",
      );
      if (user) {
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
      return res.status(401).json({ message: "Email ou senha inválidos" });
    }

    const accessToken = randomBytes(32).toString("hex");
    const role = normalizeRole(user.role);

    loginSessions.set(accessToken, {
      userId: String(user._id),
      role,
      expiresAt: Date.now() + SESSION_DURATION_MS,
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
    console.error("Error logging in:", error.message);
    return res.status(500).json({ message: "Erro ao fazer login" });
  }
});

// Cadastro de usuário permitindo escolha de role ('User' ou 'Admin')
router.post("/", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Nome, email e senha são obrigatórios." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const validRole = normalizeRole(role);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (MongoAvailable()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Este e-mail já está cadastrado." });
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
      return res
        .status(409)
        .json({ message: "Este e-mail já está cadastrado." });
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
    console.error("Error creating user:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao criar usuário", error: error.message });
  }
});

// Logs gerais (Apenas Admin) - Retorna data_criacao e livros de cada usuário
router.get("/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (MongoAvailable()) {
      const users = await User.find().select("name email role data_criacao");
      const logs = await Promise.all(
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
        }),
      );
      return res.json(logs);
    }

    const logs = memoryUsers.map((user) => {
      const books = bookRoutes.getMemoryBooksByOwner(user._id);
      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: normalizeRole(user.role),
          data_criacao: user.data_criacao || new Date(),
        },
        books,
      };
    });
    return res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao buscar logs", error: error.message });
  }
});

// Listar todos os usuários (Apenas Admin, sem expor senhas)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (MongoAvailable()) {
      const users = await User.find().select("-password");
      return res.json(users);
    }
    const safeUsers = memoryUsers.map(({ password, ...rest }) => rest);
    return res.json(safeUsers);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao buscar usuários", error: error.message });
  }
});

// Buscar usuários com papel "User"
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (MongoAvailable()) {
      const users = await User.find({ role: "User" }).select("-password");
      return res.json(users);
    }
    const users = memoryUsers
      .filter((u) => normalizeRole(u.role) === "User")
      .map(({ password, ...rest }) => rest);
    return res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao buscar usuários", error: error.message });
  }
});

// Buscar usuários com papel "Admin"
router.get("/admins", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (MongoAvailable()) {
      const admins = await User.find({ role: "Admin" }).select("-password");
      return res.json(admins);
    }
    const admins = memoryUsers
      .filter((u) => normalizeRole(u.role) === "Admin")
      .map(({ password, ...rest }) => rest);
    return res.json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error.message);
    return res
      .status(500)
      .json({
        message: "Erro ao buscar administradores",
        error: error.message,
      });
  }
});

// Buscar usuário por ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    if (MongoAvailable()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const user = await User.findById(req.params.id).select("-password");
      if (!user)
        return res.status(404).json({ message: "Usuário não encontrado" });
      return res.json(user);
    }

    const user = memoryUsers.find((u) => u._id === req.params.id);
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado" });
    const { password, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    console.error("Error fetching user:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao buscar usuário", error: error.message });
  }
});

// Atualizar usuário
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userData = { ...req.body };
    if (userData.role) {
      userData.role = normalizeRole(userData.role);
    }
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    if (MongoAvailable()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        userData,
        { new: true },
      ).select("-password");
      if (!updatedUser)
        return res.status(404).json({ message: "Usuário não encontrado" });
      return res.json(updatedUser);
    }

    const userIndex = memoryUsers.findIndex((u) => u._id === req.params.id);
    if (userIndex === -1)
      return res.status(404).json({ message: "Usuário não encontrado" });

    memoryUsers[userIndex] = { ...memoryUsers[userIndex], ...userData };
    const { password, ...safeUser } = memoryUsers[userIndex];
    return res.json(safeUser);
  } catch (error) {
    console.error("Error updating user:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar usuário", error: error.message });
  }
});
// Deletar usuário (Apenas Admin)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (MongoAvailable()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const deletedUser = await User.findByIdAndDelete(req.params.id).select(
        "-password",
      );
      if (!deletedUser)
        return res.status(404).json({ message: "Usuário não encontrado" });
      return res.json({ message: "Usuário deletado com sucesso" });
    }
    const userIndex = memoryUsers.findIndex((u) => u._id === req.params.id);
    if (userIndex === -1)
      return res.status(404).json({ message: "Usuário não encontrado" });
    memoryUsers.splice(userIndex, 1);
    return res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao deletar usuário", error: error.message });
  }
});
module.exports = router;
