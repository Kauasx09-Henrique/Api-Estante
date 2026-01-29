const multer = require('multer');
const path = require('path');
const crypto = require('crypto'); // Para gerar nome aleatório

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Garante que salva na pasta uploads
        cb(null, path.resolve(__dirname, '..', 'uploads')); // Ajuste os '..' conforme sua estrutura de pastas
        // Se a pasta 'uploads' estiver na raiz e o routes.js na src, use '..', 'uploads'
    },
    filename: (req, file, cb) => {
        // Gera um hash aleatório para não repetir nomes
        const fileHash = crypto.randomBytes(10).toString('hex');
        
        // Pega a extensão original do arquivo (.jpg, .png)
        const fileName = `${fileHash}-${file.originalname}`;

        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });