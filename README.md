# G-Livros

Aplicação de cadastro de livros com frontend em React e backend em Node.js + Express, usando MongoDB como banco de dados.

## Estrutura do projeto

```bash
.
├── backend/
│   ├── models/
│   ├── routes/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── README.md
└── README.md
```

## Pré-requisitos

Antes de rodar o projeto, você precisa ter instalado:

- Node.js (versão LTS recomendada)
- npm
- MongoDB rodando localmente

## 1) Instalar dependências

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## 2) Configurar o MongoDB

O backend está conectado ao MongoDB na URL:

```bash
mongodb://localhost:27017/bookstore
```

Certifique-se de que o MongoDB está instalado e em execução localmente.

Se estiver usando Ubuntu, pode ser necessário instalar e iniciar o MongoDB antes de rodar a API.

## 3) Rodar o backend

No diretório do backend:

```bash
cd backend
npm run dev
```

Ou, se preferir:

```bash
cd backend
node server.js
```

O backend será iniciado na porta:

```bash
http://localhost:5000
```

## 4) Rodar o frontend

Em outro terminal:

```bash
cd frontend
npm start
```

O frontend será iniciado em:

```bash
http://localhost:3000
```

## 5) Funcionalidades

- Listar livros
- Adicionar livro
- Verificar disponibilidade
- Comunicação entre frontend e backend via API REST

## 6) API

A API do backend fica em:

```bash
http://localhost:5000/api/books
```

Endpoints principais:

- GET `/api/books` - lista os livros
- POST `/api/books` - cria um livro

## Observação importante

Este projeto depende de um banco MongoDB para persistir os dados. Se o MongoDB não estiver rodando, a API pode falhar com erro 500.

Em uma máquina nova, além de instalar as dependências do Node, é necessário também preparar o banco de dados local.

## Dicas

- Não versionar a pasta `node_modules`
- Sempre executar `npm install` em cada projeto individualmente
- Manter o backend e o frontend abertos em terminais separados

## Licença

Este projeto está em desenvolvimento e foi criado para fins de estudo.