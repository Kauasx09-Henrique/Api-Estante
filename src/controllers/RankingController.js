const db = require('../config/db');

module.exports = {
    async index(req, res) {
        const { userId } = req;
        try {
            const query = `
                WITH MeusAmigos AS (
                    SELECT amigo_id AS id FROM amigos WHERE utilizador_id = $1
                    UNION
                    SELECT $1 AS id
                )
                SELECT 
                    u.id, 
                    u.nome_utilizador, 
                    u.url_avatar,
                    COALESCE(SUM(e.pagina_atual), 0) as total_paginas
                FROM MeusAmigos ma
                JOIN utilizadores u ON u.id = ma.id
                LEFT JOIN estante e ON e.utilizador_id = u.id
                GROUP BY u.id, u.nome_utilizador, u.url_avatar
                ORDER BY total_paginas DESC
                LIMIT 50;
            `;

            const result = await db.query(query, [userId]);
            return res.json(result.rows);
        } catch (err) {
            console.error("Erro Ranking:", err);
            return res.status(400).json({ error: 'Erro ao carregar ranking' });
        }
    }
};