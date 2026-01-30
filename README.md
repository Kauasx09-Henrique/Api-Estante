<h1 align="center">
  🗄️ Marcador - API
</h1>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-v22-green?logo=nodedotjs&color=84CC16&labelColor=0F172A">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql&color=84CC16&labelColor=0F172A">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.18-white?logo=express&color=84CC16&labelColor=0F172A">
</p>

<p align="center">
  <strong>API RESTful robusta responsável por toda a lógica de negócio, persistência de dados e regras de gamificação do ecossistema Marcador.</strong>
</p>

<p align="center">
  <a href="#-projeto">Projeto</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#-tecnologias">Tecnologias</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#-arquitetura-e-recursos">Arquitetura</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#-banco-de-dados">Database</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#-como-executar">Como Executar</a>
</p>

<br>

## 💻 Projeto

Este repositório contém o **Back-end** do aplicativo Marcador. Ele serve como a espinha dorsal do sistema, gerenciando autenticação, relacionamentos entre usuários, lógica de leitura conjunta (Duo) e cálculos complexos de ranking em tempo real.

A API foi construída pensando em escalabilidade e performance, utilizando **PostgreSQL** para garantir a integridade dos dados relacionais (amizades, histórico de leitura, chats).

## 🚀 Tecnologias

- **[Node.js](https://nodejs.org/)** & **[Express](https://expressjs.com/)**: Base do servidor.
- **[PostgreSQL](https://www.postgresql.org/)**: Banco de dados relacional.
- **[PG (node-postgres)](https://node-postgres.com/)**: Driver de conexão.
- **[Multer](https://github.com/expressjs/multer)**: Upload de imagens (Avatares).
- **[JWT (JsonWebToken)](https://jwt.io/)**: Autenticação segura de usuários.
- **[Bcrypt](https://www.npmjs.com/package/bcrypt)**: Criptografia de senhas.
- **[Cors](https://www.npmjs.com/package/cors)**: Controle de acesso HTTP.

## 🏗 Arquitetura e Recursos

A API segue o padrão MVC (Model-View-Controller) adaptado para API REST:

- **Autenticação Segura:** Registro e Login com hash de senha e tokens JWT.
- **Gestão de Estante:** CRUD completo de livros (status: Lendo, Lido, Quero Ler).
- **Sistema de Amigos:** Envio e gestão de solicitações de amizade.
- **Lógica de Ranking:** Queries SQL otimizadas (CTEs e Joins) para calcular e ordenar leitores baseado no total de páginas lidas.
- **Duo Engine:** Lógica para criação de salas de leitura entre dois usuários, com persistência de mensagens de chat e sincronização de progresso.

## 🗄️ Banco de Dados

### 📐 Modelagem de Dados (DER)
Abaixo está o diagrama relacional que ilustra como as tabelas se conectam para permitir a gamificação e o sistema de leitura em dupla.

<div align="center">
  <img src="./assets/modelagem.png" alt="Diagrama Entidade Relacionamento do Marcador" width="100%">
</div>

### 📜 Scripts SQL
Para rodar o projeto, você precisa criar um banco de dados PostgreSQL e executar as seguintes queries para estruturar as tabelas:

```sql
-- 1. Usuários
CREATE TABLE utilizadores (
    id SERIAL PRIMARY KEY,
    nome_utilizador VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    url_avatar TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Estante de Livros
CREATE TABLE estante (
    id SERIAL PRIMARY KEY,
    utilizador_id INT REFERENCES utilizadores(id) ON DELETE CASCADE,
    livro_isbn VARCHAR(255),
    titulo VARCHAR(255),
    url_capa TEXT,
    autor VARCHAR(255),
    total_paginas INT,
    pagina_atual INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Quero Ler', -- 'Lendo', 'Lido', 'Abandonei'
    avaliacao INT DEFAULT 0,
    adicionado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sistema de Amigos
CREATE TABLE amigos (
    id SERIAL PRIMARY KEY,
    utilizador_id INT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
    amigo_id INT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'aceito',
    solicitado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_amizade UNIQUE (utilizador_id, amigo_id)
);

-- 4. Salas de Leitura Conjunta (Duo)
CREATE TABLE leituras_conjuntas (
    id SERIAL PRIMARY KEY,
    livro_isbn VARCHAR(255) NOT NULL,
    titulo VARCHAR(255),
    url_capa TEXT,
    total_paginas INT,
    usuario_id_1 INT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
    usuario_id_2 INT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Chat do Duo
CREATE TABLE comentarios_leitura (
    id SERIAL PRIMARY KEY,
    leitura_id INT NOT NULL REFERENCES leituras_conjuntas(id) ON DELETE CASCADE,
    usuario_id INT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
