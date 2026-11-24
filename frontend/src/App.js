import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Cadastro from './cadastro';
import Login from './login';
import './assets/css/app.css';

function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [showRegister, setShowRegister] = useState(true); // Abre no Cadastro primeiro

  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState({ usersSummary: [], activities: [] });
  const [logsVisible, setLogsVisible] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const [form, setForm] = useState({
    title: '',
    author: '',
    year: '',
    available: false,
  });

  const [editingId, setEditingId] = useState(null);
  const isAdmin = user?.role?.trim().toLowerCase() === 'admin';

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/books?ownerId=${user._id}`);
      setBooks(res.data);
    } catch (err) {
      console.error('Erro ao buscar livros:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchBooks();
  }, [user, fetchBooks]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title,
      author: form.author,
      year: Number(form.year),
      available: form.available,
      ownerId: user._id,
    };

    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/books/${editingId}`, payload);
        setEditingId(null);
      } else {
        await axios.post('http://localhost:5000/api/books', payload);
      }

      setForm({ title: '', author: '', year: '', available: false });
      fetchBooks();
      if (logsVisible && isAdmin) {
        refreshLogs();
      }
    } catch (err) {
      console.error('Erro ao salvar livro:', err);
    }
  };

  const handleEdit = (book) => {
    setForm({
      title: book.title,
      author: book.author,
      year: book.year,
      available: book.available,
    });
    setEditingId(book._id);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/books/${id}?ownerId=${user._id}`);
      fetchBooks();
      if (logsVisible && isAdmin) {
        refreshLogs();
      }
    } catch (err) {
      console.error('Erro ao excluir livro:', err);
    }
  };

  const refreshLogs = async () => {
    if (!isAdmin) return;
    setLogsLoading(true);
    setLogsError('');
    try {
      const response = await axios.get('http://localhost:5000/api/users/logs', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLogs(response.data);
      setLogsVisible(true);
    } catch (error) {
      setLogsError(
        error.response?.data?.message || error.message || 'Não foi possível carregar os logs.'
      );
    } finally {
      setLogsLoading(false);
    }
  };

  const handleShowLogs = async () => {
    if (!isAdmin) return;
    if (logsVisible) {
      setLogsVisible(false);
      return;
    }
    await refreshLogs();
  };

  const handleLogout = async () => {
    try {
      if (accessToken) {
        await axios.post(
          'http://localhost:5000/api/users/logout',
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }
    } catch (err) {
      console.error('Erro ao registrar logout:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
      setBooks([]);
      setLogs({ usersSummary: [], activities: [] });
      setLogsVisible(false);
    }
  };

  if (!user) {
    return showRegister ? (
      <Cadastro onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <div>
        <Login
          onLogin={(loggedInUser, token) => {
            setUser(loggedInUser);
            setAccessToken(token);
          }}
        />
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Não tem uma conta?{' '}
          <button type="button" className="btn" onClick={() => setShowRegister(true)}>
            Cadastre-se
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h2>Lista de Livros</h2>
          <p>
            Olá, {user.name} · Perfil: {user.role || 'User'}
          </p>
        </div>
        <div>
          {isAdmin && (
            <button className="btn" type="button" onClick={handleShowLogs} disabled={logsLoading}>
              {logsLoading
                ? 'Carregando...'
                : logsVisible
                ? 'Ocultar visão geral e logs'
                : 'Ver logs e visão geral (Admin)'}
            </button>
          )}
          <button className="btn" type="button" onClick={handleLogout} style={{ marginLeft: '8px' }}>
            Sair
          </button>
        </div>
      </header>

      {logsError && isAdmin && (
        <p className="logs-error" role="alert">
          {logsError}
        </p>
      )}

      {logsVisible && isAdmin && (
        <section className="logs-section" aria-label="Logs e visão geral dos usuários">
          <h3>Histórico de Entradas, Saídas e Modificações nos Livros</h3>
          {logs.activities?.length === 0 ? (
            <p>Nenhuma atividade registrada ainda.</p>
          ) : (
            <ul className="activity-list">
              {logs.activities.map((act) => (
                <li key={act._id}>
                  <strong>[{act.action}]</strong> {act.userName} ({act.userEmail}) — {act.details} ·{' '}
                  <em>{new Date(act.timestamp).toLocaleString('pt-BR')}</em>
                </li>
              ))}
            </ul>
          )}

          <h3>Usuários e seus livros</h3>
          {logs.usersSummary?.length === 0 ? (
            <p>Nenhum usuário encontrado.</p>
          ) : (
            <div className="logs-list">
              {logs.usersSummary.map(({ user: loggedUser, books: userBooks }) => (
                <article className="log-card" key={loggedUser._id}>
                  <h4>{loggedUser.name || 'Sem nome'}</h4>
                  <p>
                    {loggedUser.email} · {loggedUser.role}
                  </p>
                  <p>
                    Data de criação:{' '}
                    {loggedUser.data_criacao
                      ? new Date(loggedUser.data_criacao).toLocaleDateString('pt-BR')
                      : 'Não informada'}
                  </p>
                  {userBooks.length === 0 ? (
                    <p>Este usuário ainda não cadastrou livros.</p>
                  ) : (
                    <ul>
                      {userBooks.map((book) => (
                        <li key={book._id}>
                          {book.title} — {book.author} ({book.year}) ·{' '}
                          {book.available ? 'Disponível' : 'Indisponível'}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <form className="book-form" onSubmit={handleSubmit}>
        <input
          className="form-control"
          type="text"
          name="title"
          placeholder="Título"
          value={form.title}
          onChange={handleChange}
          required
        />
        <input
          className="form-control"
          type="text"
          name="author"
          placeholder="Autor"
          value={form.author}
          onChange={handleChange}
          required
        />
        <input
          className="form-control"
          type="number"
          name="year"
          placeholder="Ano"
          value={form.year}
          onChange={handleChange}
          required
        />
        <label>
          <input
            className="form-control"
            type="checkbox"
            name="available"
            checked={form.available}
            onChange={handleChange}
          />
          Disponível
        </label>
        <button className="btn" type="submit">
          {editingId ? 'Editar' : 'Adicionar'}
        </button>
      </form>

      <ul className="book-list">
        {books.map((book) => (
          <li className="book-item" key={book._id}>
            {book.title} - {book.author} - {book.year} -{' '}
            {book.available ? 'Disponível' : 'Indisponível'}
            <button className="btn" onClick={() => handleEdit(book)}>
              Editar
            </button>
            <button className="btn" onClick={() => handleDelete(book._id)}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
