import React, { useState } from 'react';
import axios from 'axios';
import './assets/css/cadastro.css';

function Cadastro({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'User', // Valor padrão
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/users', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role, // Envia 'User' ou 'Admin' escolhido
      });

      setSuccess('Cadastro realizado com sucesso! Redirecionando para o login...');
      setFormData({ name: '', email: '', password: '', role: 'User' });

      if (onSwitchToLogin) {
        setTimeout(() => {
          onSwitchToLogin();
        }, 1500);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Erro ao cadastrar usuário. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro">
      <h2>Cadastro</h2>

      {error && <p className="error-message" role="alert">{error}</p>}
      {success && <p className="success-message" role="status">{success}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Nome:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
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
            required
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
            required
          />
        </div>
        <div>
          <label htmlFor="role">Tipo de Perfil:</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="User">Usuário (User)</option>
            <option value="Admin">Administrador (Admin)</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>

      {onSwitchToLogin && (
        <p>
          Já tem uma conta?{' '}
          <button type="button" onClick={onSwitchToLogin}>
            Fazer login
          </button>
        </p>
      )}
    </div>
  );
}

export default Cadastro;
