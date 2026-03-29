const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
require('dotenv').config();

// --- NOVAS BIBLIOTECAS PARA UPLOAD ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- CONFIGURAÇÃO DE CORS ATUALIZADA ---
// Isso permite que o seu frontend no Render consiga conversar com este backend
app.use(cors({
  origin: '*', // Em produção, você pode trocar '*' pelo link https://seucofrebr.onrender.com
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token']
}));

app.use(express.json());

// --- CONFIGURAÇÃO DO CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'meu-drive-uploads',
      public_id: Date.now() + '-' + file.originalname.split('.')[0],
      resource_type: 'auto',
    };
  },
});
const upload = multer({ storage: storage });

// --- CONEXÃO COM O MONGODB ---
// O Render vai usar a variável MONGO_URI que você configurou no painel
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

// --- MODELOS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const fileSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);
const User = mongoose.model('User', UserSchema);

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: "Acesso negado. Faça login." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        res.status(400).json({ message: "Token inválido." });
    }
};

// --- ROTAS ---

app.get('/', (req, res) => res.send("Servidor do Drive Online!"));

// ROTA DE CADASTRO
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "E-mail já em uso." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "Usuário criado com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROTA DE LOGIN
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "E-mail ou senha incorretos." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "E-mail ou senha incorretos." });

        const token = jwt.sign(
            { id: user._id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: "Erro no login: " + err.message });
    }
});

// --- ROTAS DE ARQUIVO ---

app.post('/upload', auth, upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

        const LIMIT_2GB = 2 * 1024 * 1024 * 1024; 

        const userFiles = await File.find({ owner: req.user.id });
        const totalUsed = userFiles.reduce((acc, file) => acc + (file.size || 0), 0);

        if (totalUsed + req.file.size > LIMIT_2GB) {
            await cloudinary.uploader.destroy(req.file.filename); 
            return res.status(400).json({ error: "Limite de 2GB atingido! Libere espaço." });
        }

        const newFile = new File({
            owner: req.user.id,
            name: req.file.originalname,
            url: req.file.path,
            size: req.file.size
        });

        await newFile.save();
        res.json({ message: "Upload concluído!", file: newFile });
    } catch (err) {
        res.status(500).json({ error: "Erro no upload: " + err.message });
    }
});

app.get('/files', auth, async (req, res) => {
    try {
        const files = await File.find({ owner: req.user.id }).sort({ createdAt: -1 });
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/files/:id', auth, async (req, res) => {
    try {
        const fileId = req.params.id;
        const file = await File.findOne({ _id: fileId, owner: req.user.id });
        if (!file) return res.status(404).json({ message: "Arquivo não encontrado." });

        const urlParts = file.url.split('/');
        const fileNameWithExtension = urlParts[urlParts.length - 1];
        const publicId = `meu-drive-uploads/${fileNameWithExtension.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId);
        await File.findByIdAndDelete(fileId);

        res.json({ message: "Arquivo excluído com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir: " + err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));