import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Login from './login';
import './assets/css/app.css';

function App() {
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({
    title: '',
    author: '',
    year: '',
    available: false,
  });
  const [editingId, setEditingId] = useState(null);

  const fetchBooks = async () => {
    const res = await axios.get('http://localhost:5000/api/books');
    setBooks(res.data);
  };

  useEffect(() => {
    if (user) fetchBooks();
  }, [user]);

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
     await axios.delete(`http://localhost:5000/api/books/${id}`);
      fetchBooks();
    };

  return (
    user ? (
    <div className="app">
      <h2>Lista de Livros</h2>

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
    ) : <Login onLogin={setUser} />
  );
}

export default App;
