import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Login from './login';
import './assets/css/app.css';

function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]);
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
    const res = await axios.get(`http://localhost:5000/api/books?ownerId=${user._id}`);
    setBooks(res.data);
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
      ...form,
      year: Number(form.year),
      ownerId: user._id,
    };

    if (editingId) {
      await axios.put(`http://localhost:5000/api/books/${editingId}`, payload);
      setEditingId(null);
    } else {
      await axios.post(`http://localhost:5000/api/books`, payload);
    }

    setForm({ title: '', author: '', year: '', available: false });
    fetchBooks();
  };
    const handleEdit = (book) => {
      setForm(book);
      setEditingId(book._id);
    };

    const handleDelete = async (id) => {
     await axios.delete(`http://localhost:5000/api/books/${id}?ownerId=${user._id}`);
      fetchBooks();
    };

    const handleShowLogs = async () => {
      if (logsVisible) {
        setLogsVisible(false);
        return;
      }

      setLogsLoading(true);
      setLogsError('');
      try {
        const response = await axios.get('http://localhost:5000/api/users/logs', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!Array.isArray(response.data)) {
          throw new Error('A resposta da API de logs está em um formato inválido.');
        }
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

    return (
      user ? (
      <div className="app">
        <header className="app-header">
          <div>
            <h2>Lista de Livros</h2>
            <p>Olá, {user.name} · Perfil: {user.role || 'User'}</p>
          </div>
          {isAdmin ? (
            <button className="btn" type="button" onClick={handleShowLogs} disabled={logsLoading}>
              {logsLoading ? 'Carregando...' : logsVisible ? 'Ocultar visão geral' : 'Ver visão geral dos usuários'}
            </button>
          ) : (
            <p className="logs-permission">A visão geral está disponível apenas para administradores.</p>
          )}
        </header>

        {logsError && <p className="logs-error" role="alert">{logsError}</p>}

        {logsVisible && (
          <section className="logs-section" aria-label="Visão geral dos usuários">
            <h3>Usuários e seus livros</h3>
            {logs.length === 0 ? (
              <p>Nenhum usuário encontrado.</p>
            ) : (
              <div className="logs-list">
                {logs.map(({ user: loggedUser, books: userBooks }) => (
                  <article className="log-card" key={loggedUser._id}>
                    <h4>{loggedUser.name || 'Sem nome'}</h4>
                    <p>{loggedUser.email} · {loggedUser.role}</p>
                    {userBooks.length === 0 ? (
                      <p>Este usuário ainda não cadastrou livros.</p>
                    ) : (
                      <ul>
                        {userBooks.map(book => (
                          <li key={book._id}>
                            {book.title} — {book.author} ({book.year})
                            {' · '}{book.available ? 'Disponível' : 'Indisponível'}
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
        <input className="form-control" type="text" name="title" placeholder="Título" value={form.title} onChange={handleChange} />
        <input className="form-control" type="text" name="author" placeholder="Autor" value={form.author} onChange={handleChange} />
        <input className="form-control" type="number" name="year" placeholder="Ano" value={form.year} onChange={handleChange} />
        <label>
          <input className="form-control" type="checkbox" name="available" checked={form.available} onChange={handleChange} />
          Disponível
        </label>
        <button className="btn" type="submit">{editingId ? 'editar' : 'adicionar'}</button>
      </form>

      <ul className="book-list">
        {books.map((book) => (
          <li className="book-item" key={book._id}>
            {book.title} - {book.author} - {book.year} - {book.available ? 'Disponível' : 'Indisponível'}
            <button className="btn" onClick={() => handleEdit(book)}>Editar </button>
            <button className="btn" onClick={() => handleDelete(book._id)}>Excluir </button>
          </li>
        ))}
      </ul>
    </div>
    ) : <Login onLogin={(loggedInUser, token) => {
      setUser(loggedInUser);
      setAccessToken(token);
    }} />
  );
}

export default App;
