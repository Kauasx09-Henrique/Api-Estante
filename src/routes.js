const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UserController = require('./controllers/UserController');
const EstanteController = require('./controllers/EstanteController');
const AmigosController = require('./controllers/AmigosController');
const DuoController = require('./controllers/DuoController');
const authMiddleware = require('./middlewares/auth');
const RankingController = require('./controllers/RankingController');
const routes = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const fileHash = crypto.randomBytes(10).toString('hex');
        const fileName = `${fileHash}-${file.originalname}`;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

routes.post('/register', UserController.register);
routes.post('/login', UserController.login);

routes.use(authMiddleware);

routes.get('/perfil', UserController.show);
routes.put('/usuarios/:id', UserController.update);
routes.patch('/usuarios/avatar', upload.single('avatar'), UserController.uploadAvatar);

routes.get('/estante', EstanteController.index);
routes.post('/estante', EstanteController.store);
routes.put('/estante/:id', EstanteController.update);
routes.delete('/estante/:id', EstanteController.delete);

routes.get('/amigos', AmigosController.index);
routes.post('/amigos', AmigosController.store);
routes.delete('/amigos/:id', AmigosController.delete);

routes.get('/duo', DuoController.index);
routes.get('/duo/:id', DuoController.show);
routes.post('/duo', DuoController.store);
routes.post('/duo/:id/comentarios', DuoController.addComment);
routes.put('/duo/:id/progress', DuoController.updateProgress);

console.log("--> ROTA DE RANKING FOI REGISTRADA!"); // <--- Adicione isso para testar
routes.get('/ranking', RankingController.index);
module.exports = routes;