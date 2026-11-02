//Login de usuário
import React, { useState } from 'react';
import axios from 'axios';
import './assets/css/login.css';

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/users/login', form);
      onLogin(response.data.user);
    } catch {
      setError('Email ou senha inválidos');
    }
  };

  return (
    <main className="login">
      <h2>Login</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          className="form-control"
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          className="form-control"
          type="password"
          name="password"
          placeholder="Senha"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button className="btn" type="submit">Entrar</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}

export default Login;