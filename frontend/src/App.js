import React, { useState, useEffect } from 'react';
import axios from 'axios';
import bgImage from './seucofre-bg.jpg'; 

// --- CONFIGURAÇÃO DA URL DA API ---
// Centralizamos aqui para facilitar
const API_URL = "https://seucofre-api.onrender.com";

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [message, setMessage] = useState('');
  const [telaAtual, setTelaAtual] = useState('login'); 

  const [selectedFile, setSelectedFile] = useState(null);
  const [myFiles, setMyFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const LIMIT_2GB = 2 * 1024 * 1024 * 1024;

  useEffect(() => {
    const savedUser = localStorage.getItem('userData');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const fetchFiles = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      // AJUSTADO: Usando API_URL
      const res = await axios.get(`${API_URL}/files`, { headers: { 'x-auth-token': token } });
      setMyFiles(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (user) fetchFiles(); }, [user]);

  const totalUsed = myFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const usedPercentage = Math.min((totalUsed / LIMIT_2GB) * 100, 100).toFixed(2);

  const limpaFormularios = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setMessage('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // AJUSTADO: Usando API_URL
      const response = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      setUser(response.data.user);
      limpaFormularios();
    } catch (error) {
      setMessage("❌ " + (error.response?.data?.message || "Erro ao entrar"));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // AJUSTADO: Usando API_URL
      await axios.post(`${API_URL}/register`, { username, email, password });
      setMessage("✅ Usuário criado com sucesso! Faça login.");
      setTelaAtual('login');
      limpaFormularios();
    } catch (error) {
      setMessage("❌ " + (error.response?.data?.message || "Erro ao registrar"));
    }
  };

  const downloadFile = async (url, fileName) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert("Erro ao baixar arquivo.");
    }
  };

  const deleteFile = async (fileId) => {
    if (window.confirm("Tem certeza?")) {
      const token = localStorage.getItem('token');
      try {
        // AJUSTADO: Usando API_URL
        await axios.delete(`${API_URL}/files/${fileId}`, { headers: { 'x-auth-token': token } });
        alert("Arquivo removido!");
        fetchFiles();
      } catch (err) {
        alert("Erro ao excluir arquivo.");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("Selecione um arquivo!");
    setUploading(true);
    const formData = new FormData();
    formData.append('arquivo', selectedFile);
    const token = localStorage.getItem('token');
    try {
      // AJUSTADO: Usando API_URL
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-auth-token': token }
      });
      setSelectedFile(null);
      fetchFiles();
    } catch (err) {
      alert(err.response?.data?.error || "Erro no upload");
    } finally { setUploading(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    limpaFormularios();
  };

  if (user) {
    return (
      <div style={styles.painelContainer}>
        <div style={styles.glassCardPainel}>
          <header style={styles.header}>
            <h1 style={styles.logoPainel}>☁️ SeuCofre</h1>
            <div style={styles.userInfo}>
              <span>Olá, <b>{user.username}</b></span>
              <button onClick={handleLogout} style={styles.logoutBtn}>Sair</button>
            </div>
          </header>

          <div style={styles.storageSection}>
            <div style={styles.storageLabel}>
              <span>Uso: {(totalUsed / (1024*1024)).toFixed(2)} MB de 2GB</span>
              <span>{usedPercentage}%</span>
            </div>
            <div style={styles.progressBarBg}>
              <div style={{...styles.progressBarFill, width: `${usedPercentage}%`}}></div>
            </div>
          </div>

          <section style={styles.uploadBox}>
            <input type="file" id="fileInput" onChange={(e) => setSelectedFile(e.target.files[0])} style={{display: 'none'}} />
            <label htmlFor="fileInput" style={styles.fileLabel}>
              {selectedFile ? `📂 ${selectedFile.name}` : "Clique para selecionar um arquivo"}
            </label>
            <button onClick={handleUpload} disabled={uploading || !selectedFile} style={{...styles.uploadBtn, opacity: (!selectedFile || uploading) ? 0.6 : 1}}>
              {uploading ? "Enviando..." : "Fazer Upload"}
            </button>
          </section>

          <section style={styles.grid}>
            {myFiles.map(file => (
              <div key={file._id} style={styles.fileCard}>
                <div style={styles.fileIcon}>📄</div>
                <p title={file.name} style={styles.fileName}>{file.name}</p>
                <div style={styles.actionButtons}>
                  <a href={file.url} target="_blank" rel="noreferrer" style={styles.viewBtn}>Ver</a>
                  <button onClick={() => downloadFile(file.url, file.name)} style={styles.downloadBtn}>Baixar</button>
                </div>
                <button onClick={() => deleteFile(file._id)} style={styles.deleteBtn}>🗑️ Excluir</button>
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  }

  if (telaAtual === 'login') {
    return (
      <div style={styles.loginContainer}>
        <form onSubmit={handleLogin} style={styles.loginCard}>
          <h1 style={styles.logoLogin}>☁️ SeuCofre</h1>
          <p style={styles.subTituloLogin}>Seu drive pessoal e seguro</p>
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
          <button type="submit" style={styles.loginBtn}>Entrar no Cofre</button>
          <div style={styles.infoBox}>
            <p>Novo por aqui? <span onClick={() => {setTelaAtual('registro'); setMessage('');}} style={styles.linkAction}>Crie uma conta.</span></p>
          </div>
          {message && <p style={{color: '#ff8a8a', marginTop: '15px'}}>{message}</p>}
        </form>
      </div>
    );
  }

  if (telaAtual === 'registro') {
    return (
      <div style={styles.loginContainer}>
        <form onSubmit={handleRegister} style={styles.loginCard}>
          <h1 style={styles.logoLogin}>☁️ SeuCofre</h1>
          <p style={styles.subTituloLogin}>Criar nova conta</p>
          <input type="text" placeholder="Seu Nome" value={username} onChange={(e) => setUsername(e.target.value)} style={styles.input} required />
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
          <button type="submit" style={styles.loginBtn}>Registrar Conta</button>
          <div style={styles.infoBox}>
            <p>Já tem uma conta? <span onClick={() => {setTelaAtual('login'); setMessage('');}} style={styles.linkAction}>Faça login.</span></p>
          </div>
          {message && <p style={{color: '#ff8a8a', marginTop: '15px'}}>{message}</p>}
        </form>
      </div>
    );
  }
}

const styles = {
  painelContainer: { minHeight: '100vh', background: '#f7fafc', padding: '40px' },
  glassCardPainel: { background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '1100px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  logoPainel: { color: '#2d3748', margin: 0, fontSize: '28px', fontWeight: '800' },
  logoLogin: {color: '#ffffff', marginBottom: '10px'},
  subTituloLogin: {color: '#cbd5e0', marginBottom: '30px'},

  loginContainer: { 
    height: '100vh', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    // AJUSTADO: Usando a imagem importada para o background
    backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#1a202c', 
  },

  loginCard: { 
    background: 'rgba(26, 32, 44, 0.9)', 
    color: '#ffffff',
    padding: '50px', 
    borderRadius: '24px', 
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)', 
    textAlign: 'center', 
    width: '100%', 
    maxWidth: '400px',
    border: '1px solid #4a5568'
  },

  input: { 
    display: 'block', 
    width: '100%', 
    marginBottom: '20px', 
    padding: '14px', 
    borderRadius: '12px', 
    border: '1px solid #4a5568', 
    fontSize: '16px', 
    boxSizing: 'border-box',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
  },

  loginBtn: { 
    width: '100%', 
    padding: '14px', 
    background: '#4c51bf', 
    color: 'white', 
    border: 'none', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '16px',
  },
  
  infoBox: { marginTop: '20px', fontSize: '14px', color: '#a0aec0' },
  linkAction: { color: '#7f9cf5', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #edf2f7', paddingBottom: '20px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
  logoutBtn: { color: '#e53e3e', border: '1px solid #e53e3e', background: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  storageSection: { marginBottom: '40px' },
  storageLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px', color: '#4a5568', fontWeight: '600' },
  progressBarBg: { height: '12px', background: '#edf2f7', borderRadius: '6px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #4c51bf, #7f9cf5)', transition: 'width 0.5s ease-in-out' },
  uploadBox: { background: '#f8fafc', padding: '30px', borderRadius: '20px', textAlign: 'center', marginBottom: '40px', border: '2px dashed #cbd5e0' },
  fileLabel: { display: 'block', marginBottom: '20px', padding: '15px', color: '#4a5568', cursor: 'pointer', border: '1px solid #cbd5e0', borderRadius: '10px', background: 'white' },
  uploadBtn: { background: '#4c51bf', color: 'white', border: 'none', padding: '12px 40px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' },
  fileCard: { background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' },
  fileIcon: { fontSize: '40px', marginBottom: '15px' },
  fileName: { fontSize: '14px', fontWeight: '700', marginBottom: '20px', color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  actionButtons: { display: 'flex', gap: '12px', justifyContent: 'center' },
  viewBtn: { textDecoration: 'none', background: '#edf2f7', color: '#2d3748', padding: '8px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' },
  downloadBtn: { background: '#4c51bf', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  deleteBtn: { marginTop: '15px', background: 'none', border: 'none', color: '#e53e3e', fontSize: '12px', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline'}
};

export default App;