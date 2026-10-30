//Login de usuário
import React, { useState } from 'react';
import axios from 'axios';
// Função de login ligado ao user e ao server do backend
function Login() {
    const [form, setForm] = useState({
       name: String,
       email: String,
       password: String
    });

     const fetchUsers = async () => {
    const res = await axios.get('http://localhost:5000/api/users');
    setUser(res.data);
  };

// Função de login ligado ao user e ao server do backend
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: value,
        });
    };
    
}