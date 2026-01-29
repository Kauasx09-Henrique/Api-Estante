const db = require('../config/db'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

module.exports = {
    async register(req, res) {
        const { nome_utilizador, email, senha } = req.body;
        try {
            const userExists = await db.query('SELECT * FROM utilizadores WHERE email = $1', [email]);
            if (userExists.rows.length > 0) {
                return res.status(400).json({ error: 'Email já cadastrado.' });
            }

            const hash = await bcrypt.hash(senha, 10);
            const defaultAvatar = `https://ui-avatars.com/api/?name=${nome_utilizador}&background=0F172A&color=fff`;

            const result = await db.query(
                'INSERT INTO utilizadores (nome_utilizador, email, senha_hash, url_avatar) VALUES ($1, $2, $3, $4) RETURNING *',
                [nome_utilizador, email, hash, defaultAvatar]
            );

            const user = result.rows[0];
            delete user.senha_hash; 

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

    async show(req, res) {
        
        const { userId } = req; 
        try {
            const result = await db.query('SELECT id, nome_utilizador, email, url_avatar FROM utilizadores WHERE id = $1', [userId]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
            
            return res.json(result.rows[0]);
        } catch (err) {
            return res.status(400).json({ error: 'Erro ao buscar perfil' });
        }
    },

    async update(req, res) {
        const { userId } = req; 
        const { nome_utilizador, email, senha } = req.body;

        try {
            const userQuery = await db.query('SELECT * FROM utilizadores WHERE id = $1', [userId]);
            const user = userQuery.rows[0];
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            let newHash = user.senha_hash;

            if (senha) {
                newHash = await bcrypt.hash(senha, 10);
            }

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
          
            const meuIp = '192.168.1.10'; 
            
            const avatarUrl = `http://${meuIp}:3000/uploads/${req.file.filename}`;

            console.log("Salvando Avatar com URL:", avatarUrl); 

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