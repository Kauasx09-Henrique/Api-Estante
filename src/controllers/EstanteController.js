const db = require('../config/db');

module.exports = {
    async index(req, res) {
        try {
            // AJUSTE AQUI: Adicionei "AS livro_isbn" para bater com o frontend
            const result = await db.query(
                `SELECT e.id, e.pagina_atual, e.status, e.avaliacao, 
                        l.isbn AS livro_isbn, l.titulo, l.url_capa, l.total_paginas 
                 FROM estante e 
                 JOIN livros l ON e.livro_isbn = l.isbn 
                 WHERE e.utilizador_id = $1 ORDER BY e.id DESC`,
                [req.userId]
            );
            return res.json(result.rows);
        } catch (err) {
            return res.status(400).json({ error: 'Erro ao buscar estante' });
        }
    },

    async store(req, res) {
        const { livro_isbn, status, avaliacao, titulo, url_capa, total_paginas } = req.body;
        try {
            // Salva ou atualiza o livro no catálogo global
            await db.query(
                `INSERT INTO livros (isbn, titulo, url_capa, total_paginas) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (isbn) DO UPDATE SET titulo = $2, url_capa = $3, total_paginas = $4`,
                [livro_isbn, titulo, url_capa, total_paginas]
            );

            // Vincula ao usuário
            const result = await db.query(
                `INSERT INTO estante (utilizador_id, livro_isbn, status, avaliacao) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [req.userId, livro_isbn, status, avaliacao]
            );

            return res.status(201).json({ ...result.rows[0], titulo, url_capa, total_paginas });
        } catch (err) {
            return res.status(400).json({ error: 'Erro ao salvar' });
        }
    },

    // AQUI ESTÁ A MÁGICA QUE FALTAVA PARA O BOTÃO SALVAR:
    async update(req, res) {
        const { id } = req.params;
        const { pagina_atual, status, avaliacao } = req.body;

        try {
            const result = await db.query(
                `UPDATE estante 
                 SET pagina_atual = $1, status = $2, avaliacao = $3 
                 WHERE id = $4 AND utilizador_id = $5 RETURNING *`,
                [pagina_atual, status, avaliacao, id, req.userId]
            );
            
            // Se não encontrou o registro (result.rows vazio), é porque não pertence ao usuário ou ID errado
            if (result.rows.length === 0) {
                 return res.status(404).json({ error: 'Livro não encontrado na sua estante.' });
            }

            return res.json(result.rows[0]);
        } catch (err) {
            console.error(err); // Importante para debug
            return res.status(400).json({ error: 'Erro ao atualizar' });
        }
    },

    async delete(req, res) {
        const { id } = req.params;
        try {
            await db.query('DELETE FROM estante WHERE id = $1 AND utilizador_id = $2', [id, req.userId]);
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(400).json({ error: 'Erro ao deletar' });
        }
    }
};