const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = {
    async register(req, res) {
        const { nome_utilizador, email, senha, url_avatar } = req.body;
        try {
            const hash = await bcrypt.hash(senha, 10);
            const result = await db.query(
                'INSERT INTO utilizadores (nome_utilizador, email, senha_hash, url_avatar) VALUES ($1, $2, $3, $4) RETURNING id',
                [nome_utilizador, email, hash, url_avatar]
            );
            const token = jwt.sign({ id: result.rows[0].id }, process.env.SECRET, { expiresIn: '7d' });
            return res.status(201).json({ user: result.rows[0], token });
        } catch (err) {
            return res.status(400).json({ error: 'Registration failed' });
        }
    },

    async login(req, res) {
        const { email, senha } = req.body;
        try {
            const userQuery = await db.query('SELECT * FROM utilizadores WHERE email = $1', [email]);
            const user = userQuery.rows[0];
            if (!user || !(await bcrypt.compare(senha, user.senha_hash))) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '7d' });
            delete user.senha_hash;
            return res.json({ user, token });
        } catch (err) {
            return res.status(400).json({ error: 'Login failed' });
        }
    }
};