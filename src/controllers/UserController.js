const db = require('../config/db'); // Sua conexão com o banco
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

module.exports = {
    // --- LOGIN E REGISTRO (Mantidos) ---
    async register(req, res) {
        const { nome_utilizador, email, senha } = req.body;
        try {
            // Verifica se email já existe
            const userExists = await db.query('SELECT * FROM utilizadores WHERE email = $1', [email]);
            if (userExists.rows.length > 0) {
                return res.status(400).json({ error: 'Email já cadastrado.' });
            }

            const hash = await bcrypt.hash(senha, 10);
            // URL de avatar padrão (iniciais) se não for enviado
            const defaultAvatar = `https://ui-avatars.com/api/?name=${nome_utilizador}&background=0F172A&color=fff`;

            const result = await db.query(
                'INSERT INTO utilizadores (nome_utilizador, email, senha_hash, url_avatar) VALUES ($1, $2, $3, $4) RETURNING *',
                [nome_utilizador, email, hash, defaultAvatar]
            );

            const user = result.rows[0];
            delete user.senha_hash; // Não devolva a senha

            const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '7d' });
            return res.status(201).json({ user, token });
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Falha no registro' });
        }
    },

    async login(req, res) {
        const { email, senha } = req.body;
        try {
            const userQuery = await db.query('SELECT * FROM utilizadores WHERE email = $1', [email]);
            const user = userQuery.rows[0];

            if (!user || !(await bcrypt.compare(senha, user.senha_hash))) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '7d' });
            delete user.senha_hash;
            return res.json({ user, token });
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Falha no login' });
        }
    },

    // --- NOVO: PEGAR DADOS DO PERFIL (SHOW) ---
    async show(req, res) {
        // req.userId vem do seu middleware de autenticação
        const { userId } = req; 
        try {
            const result = await db.query('SELECT id, nome_utilizador, email, url_avatar FROM utilizadores WHERE id = $1', [userId]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
            
            return res.json(result.rows[0]);
        } catch (err) {
            return res.status(400).json({ error: 'Erro ao buscar perfil' });
        }
    },

    // --- NOVO: ATUALIZAR DADOS (UPDATE) ---
    async update(req, res) {
        const { userId } = req; // ID vindo do token JWT
        const { nome_utilizador, email, senha } = req.body;

        try {
            // Busca usuário atual
            const userQuery = await db.query('SELECT * FROM utilizadores WHERE id = $1', [userId]);
            const user = userQuery.rows[0];
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            let newHash = user.senha_hash;

            // Se o usuário mandou uma nova senha, criptografa ela
            if (senha) {
                newHash = await bcrypt.hash(senha, 10);
            }

            // Atualiza no banco
            const updateQuery = await db.query(
                `UPDATE utilizadores 
                 SET nome_utilizador = $1, email = $2, senha_hash = $3 
                 WHERE id = $4 
                 RETURNING id, nome_utilizador, email, url_avatar`,
                [nome_utilizador || user.nome_utilizador, email || user.email, newHash, userId]
            );

            return res.json(updateQuery.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Erro ao atualizar perfil' });
        }
    },

   async uploadAvatar(req, res) {
        const { userId } = req;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        try {
            // --- ATENÇÃO AQUI ---
            // Troque '192.168.X.X' pelo SEU IP que você pegou no ipconfig
            // Mantenha o :3000 (ou a porta que seu servidor usa)
            const meuIp = '192.168.1.10'; // <--- COLOQUE SEU IP AQUI (Ex: 192.168.0.15)
            
            const avatarUrl = `http://${meuIp}:3000/uploads/${req.file.filename}`;

            console.log("Salvando Avatar com URL:", avatarUrl); // Log para conferir

            // Atualiza no banco
            const result = await db.query(
                'UPDATE utilizadores SET url_avatar = $1 WHERE id = $2 RETURNING *',
                [avatarUrl, userId]
            );

            const user = result.rows[0];
            delete user.senha_hash;
            
            return res.json(user);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao salvar avatar' });
        }
    }
};