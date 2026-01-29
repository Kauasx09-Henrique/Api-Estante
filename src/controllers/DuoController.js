const db = require('../config/db');

module.exports = {
    async index(req, res) {
        const { userId } = req;
        try {
            const result = await db.query(
                `SELECT lc.*, 
                        u1.nome_utilizador as nome1, u1.url_avatar as avatar1,
                        u2.nome_utilizador as nome2, u2.url_avatar as avatar2
                 FROM leituras_conjuntas lc
                 JOIN utilizadores u1 ON lc.usuario_id_1 = u1.id
                 JOIN utilizadores u2 ON lc.usuario_id_2 = u2.id
                 WHERE lc.usuario_id_1 = $1 OR lc.usuario_id_2 = $1`,
                [userId]
            );
            return res.json(result.rows);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Erro ao buscar leituras' });
        }
    },

    async show(req, res) {
        const { id } = req.params;
        try {
            const leituraQuery = await db.query('SELECT * FROM leituras_conjuntas WHERE id = $1', [id]);
            const leitura = leituraQuery.rows[0];

            if (!leitura) return res.status(404).json({ error: 'Leitura não encontrada' });

            const progresso1 = await db.query(
                'SELECT pagina_atual FROM estante WHERE utilizador_id = $1 AND livro_isbn = $2',
                [leitura.usuario_id_1, leitura.livro_isbn]
            );

            const progresso2 = await db.query(
                'SELECT pagina_atual FROM estante WHERE utilizador_id = $1 AND livro_isbn = $2',
                [leitura.usuario_id_2, leitura.livro_isbn]
            );

            const comentarios = await db.query(
                `SELECT c.*, u.nome_utilizador, u.url_avatar 
                 FROM comentarios_leitura c
                 JOIN utilizadores u ON c.usuario_id = u.id
                 WHERE c.leitura_id = $1 ORDER BY c.enviado_em ASC`,
                [id]
            );

            return res.json({
                ...leitura,
                paginas_user_1: progresso1.rows[0]?.pagina_atual || 0,
                paginas_user_2: progresso2.rows[0]?.pagina_atual || 0,
                comentarios: comentarios.rows
            });

        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Erro ao carregar detalhes' });
        }
    },

    async store(req, res) {
        const { userId } = req;
        const { amigo_id, livro_isbn, titulo, url_capa, total_paginas } = req.body;

        try {
            const existingDuo = await db.query(
                `SELECT * FROM leituras_conjuntas 
                 WHERE livro_isbn = $1 
                 AND (
                    (usuario_id_1 = $2 AND usuario_id_2 = $3) 
                    OR 
                    (usuario_id_1 = $3 AND usuario_id_2 = $2)
                 )`,
                [livro_isbn, userId, amigo_id]
            );

            if (existingDuo.rows.length > 0) {
                return res.json(existingDuo.rows[0]);
            }

            const checkFriend = await db.query(
                'SELECT * FROM estante WHERE utilizador_id = $1 AND livro_isbn = $2',
                [amigo_id, livro_isbn]
            );

            if (checkFriend.rows.length === 0) {
                await db.query(
                    `INSERT INTO estante (utilizador_id, livro_isbn, status, avaliacao, pagina_atual) 
                     VALUES ($1, $2, 'Quero Ler', 0, 0)`,
                    [amigo_id, livro_isbn]
                );
            }

            const result = await db.query(
                `INSERT INTO leituras_conjuntas 
                (usuario_id_1, usuario_id_2, livro_isbn, titulo, url_capa, total_paginas)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [userId, amigo_id, livro_isbn, titulo, url_capa, total_paginas]
            );

            return res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Erro ao criar leitura conjunta' });
        }
    },

    async addComment(req, res) {
        const { userId } = req;
        const { id } = req.params;
        const { texto } = req.body;

        try {
            const result = await db.query(
                `INSERT INTO comentarios_leitura (leitura_id, usuario_id, texto) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [id, userId, texto]
            );
            return res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Erro ao comentar' });
        }
    },

    async updateProgress(req, res) {
        const { userId } = req;
        const { id } = req.params;
        const { pagina_atual } = req.body;

        try {
            const duoQuery = await db.query('SELECT livro_isbn FROM leituras_conjuntas WHERE id = $1', [id]);
            if (duoQuery.rows.length === 0) return res.status(404).json({ error: 'Leitura não encontrada' });

            const isbn = duoQuery.rows[0].livro_isbn;

            await db.query(
                'UPDATE estante SET pagina_atual = $1 WHERE utilizador_id = $2 AND livro_isbn = $3',
                [pagina_atual, userId, isbn]
            );

            return res.status(200).send();
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Erro ao atualizar progresso' });
        }
    }
};