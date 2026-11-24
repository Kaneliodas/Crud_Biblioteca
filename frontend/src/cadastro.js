import React, { useState } from 'react';
import axios from 'axios';
import './assets/css/cadastro.css';

function Cadastro() {
  const [form, setForm] = useState({ name: '', email: '', password: '', data_criacao: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


const Cadastro = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    data_criacao: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de envio do formulário
  };

  return (
    <div className="cadastro">
      <h2>Cadastro</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Nome:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="password">Senha:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
};
 };
export default Cadastro;