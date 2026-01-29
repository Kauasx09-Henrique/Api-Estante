const db = require('../config/db');

module.exports = {
    async index(req, res) {
        const { userId } = req;
        try {
            const result = await db.query(
                `SELECT u.id, u.nome_utilizador, u.url_avatar, u.email 
                 FROM amigos a
                 JOIN utilizadores u ON u.id = a.amigo_id
                 WHERE a.utilizador_id = $1`,
                [userId]
            );
            return res.json(result.rows);
        } catch (err) {
            return res.status(400).json({ error: 'Erro ao buscar amigos' });
        }
    },

    async store(req, res) {
        const { userId } = req;
        const { email } = req.body;

        try {
            const userQuery = await db.query('SELECT id FROM utilizadores WHERE email = $1', [email]);
            const friend = userQuery.rows[0];

            if (!friend) return res.status(404).json({ error: 'Usuário não encontrado' });
            if (friend.id === userId) return res.status(400).json({ error: 'Não pode adicionar a si mesmo' });

            const check = await db.query(
                'SELECT * FROM amigos WHERE utilizador_id = $1 AND amigo_id = $2',
                [userId, friend.id]
            );

            if (check.rows.length > 0) return res.status(400).json({ error: 'Vocês já são amigos!' });


            await db.query(
                `INSERT INTO amigos (utilizador_id, amigo_id, status, solicitado_em) 
                 VALUES ($1, $2, 'aceito', CURRENT_TIMESTAMP)`,
                [userId, friend.id]
            );

            await db.query(
                `INSERT INTO amigos (utilizador_id, amigo_id, status, solicitado_em) 
                 VALUES ($1, $2, 'aceito', CURRENT_TIMESTAMP)
                 ON CONFLICT DO NOTHING`,
                [friend.id, userId]
            );

            const friendData = await db.query(
                'SELECT id, nome_utilizador, url_avatar, email FROM utilizadores WHERE id = $1',
                [friend.id]
            );

            return res.json(friendData.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Erro ao adicionar amigo' });
        }
    },

    async delete(req, res) {
        const { userId } = req;
        const { id } = req.params;

        try {

            await db.query(
                'DELETE FROM amigos WHERE utilizador_id = $1 AND amigo_id = $2',
                [userId, id]
            );

            // Remove: AMIGO -> VOCÊ
            await db.query(
                'DELETE FROM amigos WHERE utilizador_id = $1 AND amigo_id = $2',
                [id, userId]
            );

            return res.status(200).send();
        } catch (err) {
            return res.status(400).json({ error: 'Erro ao remover amigo' });
        }
    }
};