const db = require('../config/db');

module.exports = {
    async index(req, res) {
        const { userId } = req;
        try {
            // Busca quem O USUÁRIO adicionou
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
        const { userId } = req; // Quem está enviando (VOCÊ)
        const { email } = req.body; // Email de quem vai receber (AMIGO)

        try {
            // 1. Acha o amigo pelo email
            const userQuery = await db.query('SELECT id FROM utilizadores WHERE email = $1', [email]);
            const friend = userQuery.rows[0];

            if (!friend) return res.status(404).json({ error: 'Usuário não encontrado' });
            if (friend.id === userId) return res.status(400).json({ error: 'Não pode adicionar a si mesmo' });

            // 2. Verifica se já são amigos (de um lado ou do outro)
            const check = await db.query(
                'SELECT * FROM amigos WHERE utilizador_id = $1 AND amigo_id = $2',
                [userId, friend.id]
            );
            
            if (check.rows.length > 0) return res.status(400).json({ error: 'Vocês já são amigos!' });

            // 3. CRIA A AMIZADE MÚTUA (Aqui está o segredo!)
            
            // Cria: VOCÊ -> AMIGO
            await db.query(
                `INSERT INTO amigos (utilizador_id, amigo_id, status, solicitado_em) 
                 VALUES ($1, $2, 'aceito', CURRENT_TIMESTAMP)`,
                [userId, friend.id]
            );

            // Cria: AMIGO -> VOCÊ (Para você aparecer na lista dele também)
            await db.query(
                `INSERT INTO amigos (utilizador_id, amigo_id, status, solicitado_em) 
                 VALUES ($1, $2, 'aceito', CURRENT_TIMESTAMP)
                 ON CONFLICT DO NOTHING`, // Evita erro se já existir
                [friend.id, userId]
            );

            // Retorna os dados do amigo para adicionar na sua lista visualmente
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
        const { id } = req.params; // ID do amigo que você quer remover

        try {
            // Remove a amizade DOS DOIS LADOS
            // Remove: VOCÊ -> AMIGO
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