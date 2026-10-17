const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { inicializarBanco } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// --- CONFIGURAÇÃO DO E-MAIL ---
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: { user: 'SEU_EMAIL_AQUI@gmail.com', pass: 'SUA_SENHA_AQUI' }
});

let db; 

async function iniciarServidor() {
  db = await inicializarBanco(); 

  // --- 👥 CRIAÇÃO DOS USUÁRIOS NO BANCO ---
  const checkUser = await db.get('SELECT COUNT(*) as count FROM usuarios');
  if (checkUser.count === 0) {
      await db.run(`INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ('Gestor Salux', 'admin@salux.com', '123456', 'ADMIN')`);
      await db.run(`INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ('Equipe InfoSaúde', 'INFOSAUDE', 'salux2026', 'PADRAO')`);
      console.log('👥 Usuários (Gestor e INFOSAUDE) verificados no banco de dados.');
  }

  // --- 🔐 ROTAS DE LOGIN E SENHA ---
  app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ? AND senha_hash = ?', [email, senha]);
    if (usuario) {
        res.json({ success: true, usuario: { nome: usuario.nome, email: usuario.email, perfil: usuario.perfil } });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
    }
  });

  app.post('/api/mudar-senha', async (req, res) => {
    const { email, novaSenha } = req.body;
    await db.run('UPDATE usuarios SET senha_hash = ? WHERE email = ?', [novaSenha, email]);
    res.json({ success: true, message: 'Senha atualizada com sucesso!' });
  });

  // --- 🗺️ ROTAS DE DADOS DO MAPA ---
  app.get('/api/usfs', async (req, res) => { res.json(await db.all('SELECT * FROM unidades')); });
  app.get('/api/tecnicos', async (req, res) => { res.json(await db.all('SELECT * FROM tecnicos WHERE status = "ATIVO"')); });
  
  // 👇 ATUALIZADO: Agora o servidor busca a 'observacao' no banco de dados 👇
  app.get('/api/escalas', async (req, res) => {
    const escalasRaw = await db.all('SELECT id, tecnico_id as tecnicoId, tecnico_nome as tecnicoNome, ubs_id as ubsId, ubs_nome as ubsNome, data_inicio as dataInicio, data_fim as dataFim, is_chamado, status_checkin as statusCheckin, observacao FROM escalas');
    res.json(escalasRaw.map(e => ({ ...e, isChamado: e.is_chamado === 1 })));
  });

  // --- ✏️ ROTAS DE AÇÕES DO MAPA ---
  app.put('/api/usfs/:id', async (req, res) => {
    await db.run('UPDATE unidades SET prioridade = ? WHERE id = ?', [req.body.prioridade, req.params.id]); res.json({ success: true });
  });
  
  // 👇 ATUALIZADO: Agora o servidor salva a 'observacao' no banco de dados 👇
  app.post('/api/escalas', async (req, res) => {
    const { tecnicoId, tecnicoNome, ubsId, ubsNome, dataInicio, dataFim, isChamado, observacao } = req.body;
    const result = await db.run('INSERT INTO escalas (tecnico_id, tecnico_nome, ubs_id, ubs_nome, data_inicio, data_fim, is_chamado, observacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [tecnicoId, tecnicoNome, ubsId, ubsNome, dataInicio, dataFim, isChamado ? 1 : 0, observacao || '']);
    res.json({ id: result.lastID, ...req.body });
  });
  
  app.put('/api/escalas/:id', async (req, res) => {
    await db.run('UPDATE escalas SET data_inicio = ?, data_fim = ? WHERE id = ?', [req.body.dataInicio, req.body.dataFim, req.params.id]); res.json({ success: true });
  });
  app.delete('/api/escalas/:id', async (req, res) => {
    await db.run('DELETE FROM escalas WHERE id = ?', [req.params.id]); res.json({ success: true });
  });

  // --- 📧 E-MAIL ---
  app.post('/api/enviar-email', async (req, res) => {
    const { destinatario, assunto, mensagem, tecnicosNomes } = req.body;
    let emailsParaEnviar = destinatario;
    if (tecnicosNomes && tecnicosNomes.length > 0) {
      const placeholders = tecnicosNomes.map(() => '?').join(',');
      const tecnicosData = await db.all(`SELECT email FROM tecnicos WHERE nome IN (${placeholders})`, tecnicosNomes);
      const emailsEncontrados = tecnicosData.map(t => t.email).filter(e => e);
      if (emailsEncontrados.length > 0) emailsParaEnviar = emailsEncontrados.join(', '); 
    }
    const mailOptions = { from: 'Gestão de Escalas', to: emailsParaEnviar, subject: assunto, html: mensagem };
    try {
      await transporter.sendMail(mailOptions); res.json({ success: true, message: 'E-mail enviado!' });
    } catch (error) { res.status(500).json({ error: 'Falha ao enviar e-mail' }); }
  });

  app.listen(PORT, () => { console.log(`🚀 Servidor rodando na porta ${PORT} com banco SQLite!`); });
}

iniciarServidor();