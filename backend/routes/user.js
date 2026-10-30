const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');

// Array para armazenar usuários em memória
let memoryUsers = [{id: '1', name: 'John Doe', email: 'john@example.com'}];

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

// Criando um usuário - C do crud
router.post('/', async (req, res) => {
    try {
        if (MongoAvailable()) {
            const newUser = new User(req.body);
            await newUser.save();
            return res.status(201).json(newUser);
        }

        const newUser = {
            ...req.body,
            _id: String(Date.now()),
        };
        memoryUsers.push(newUser);
        return res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error.message);
        return res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
    }
});
// Read de algum usuário - R do Crud
router.get('/:id', async (req, res) => {
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
        if (MongoAvailable()) {
            const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
            return res.json(updatedUser);
        }

        const userIndex = memoryUsers.findIndex(user => user.id === req.params.id);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        memoryUsers[userIndex] = { ...memoryUsers[userIndex], ...req.body };
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
