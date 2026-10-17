const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'banco_oficial.sqlite');

async function inicializarBanco() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('📦 Conectado ao banco de dados SQLite!');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'LEITURA'
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tecnicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT,
      lat REAL,
      lng REAL,
      status TEXT DEFAULT 'ATIVO'
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS unidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      endereco TEXT,
      porte TEXT NOT NULL,
      prioridade TEXT DEFAULT 'Baixa',
      lat REAL,
      lng REAL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS escalas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tecnico_id INTEGER,
      tecnico_nome TEXT,
      ubs_id INTEGER,
      ubs_nome TEXT,
      data_inicio TEXT,
      data_fim TEXT,
      is_chamado INTEGER DEFAULT 0, 
      status_checkin TEXT DEFAULT 'PENDENTE',
      FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id),
      FOREIGN KEY (ubs_id) REFERENCES unidades(id)
    );
  `);

  // 👇 TRUQUE MÁGICO: Adiciona a coluna observacao sem apagar o banco! 👇
  try {
    await db.exec(`ALTER TABLE escalas ADD COLUMN observacao TEXT`);
    console.log('✅ Coluna de Observações de Chamado adicionada com sucesso!');
  } catch (err) {
    // Se der erro, é porque a coluna já existe. Tudo certo!
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      acao TEXT NOT NULL,
      detalhes TEXT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Todas as tabelas foram verificadas/criadas com sucesso!');
  
  return db;
}

module.exports = { inicializarBanco };