import React, { useState } from 'react';
import axios from 'axios';
import './assets/css/login.css'; // ajuste se o nome do seu css for diferente

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha o email e a senha.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/users/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { user, accessToken } = response.data;

      if (!user || !accessToken) {
        throw new Error('Resposta inválida do servidor.');
      }

      onLogin(user, accessToken);
    } catch (err) {
      console.error('Erro no login:', err);
      setError(
        err.response?.data?.message || err.message || 'Erro ao fazer login. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email">Email:</label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="login-password">Senha:</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default Login;
