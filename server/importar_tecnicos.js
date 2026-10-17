const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// A SUA LISTA REAL COM AS COORDENADAS EXATAS!
const tecnicosReais = [
  { id: 1, nome: 'ABRAAO BRITO OLIVEIRA', lat: -3.022160, lng: -59.994367 },
  { id: 2, nome: 'KLISMAN MATHEUS TRINDADE', lat: -3.132647, lng: -59.983439 },
  { id: 4, nome: 'ALEF RISHARD MIGUEL DA SILVA', lat: -3.058148, lng: -60.065373 },
  { id: 5, nome: 'ALICE CANDIDA OLIMPIO', lat: -3.034795, lng: -59.975820 },
  { id: 6, nome: 'ALINE SILVA SOUZA', lat: -3.045302, lng: -59.934213 },
  { id: 7, nome: 'EDER RAFAEL OLIVEIRA LOPES', lat: -3.017230, lng: -59.947272 },
  { id: 9, nome: 'ELTON QUEIROZ PEIXOTO', lat: -3.090583, lng: -59.944737 },
  { id: 10, nome: 'FILIPE CAINÃ MATOS DA SILVA', lat: -3.066649, lng: -60.064269 },
  { id: 11, nome: 'HENDRIO MATOS MAUÉS', lat: -3.061457, lng: -59.939837 },
  { id: 12, nome: 'JEDIAEL DE SOUSA E SOUSA', lat: -3.052061, lng: -59.948396 },
  { id: 13, nome: 'JORDAN IAGO MARTINS LIMA', lat: -3.054282, lng: -60.037566 },
  { id: 14, nome: 'JOSE DE ALENCAR BATISTA JUNIOR', lat: -3.049800, lng: -59.967146 },
  { id: 15, nome: 'LEANDRO COSTA DE SOUZA', lat: -3.116520, lng: -59.998240 },
  { id: 16, nome: 'LUIS EDUARDO MAIA OBANDO', lat: -3.113881, lng: -59.999529 },
  { id: 17, nome: 'LUIZ CARLOS MOTA SILVESTRE', lat: -3.040575, lng: -60.003440 },
  { id: 19, nome: 'MATEUS GARCIA PINHEIRO', lat: -3.102484, lng: -59.963528 },
  { id: 20, nome: 'MATHEUS GONZALEZ GALVÃO', lat: -3.074391, lng: -60.006969 },
  { id: 21, nome: 'PAULO YGOR ANDRADE OLIVEIRA', lat: -3.029392, lng: -59.977977 },
  { id: 22, nome: 'RODRIGO SIQUEIRA XAVIER', lat: -3.053709, lng: -59.964054 },
  { id: 23, nome: 'VICTOR GABRIEL SOARES DE SOUZA E RAMOS CORRÊA', lat: -3.093324, lng: -60.067310 },
];

async function importarDireto() {
  const db = await open({ 
    filename: path.join(__dirname, 'banco_oficial.sqlite'), 
    driver: sqlite3.Database 
  });
  
  console.log('🚀 Iniciando injeção exata de técnicos no banco...');

  // Limpa a tabela para não duplicar e garantir a organização
  await db.run('DELETE FROM tecnicos');

  // Injeta cada técnico com suas coordenadas verdadeiras
  for (const t of tecnicosReais) {
      await db.run('INSERT INTO tecnicos (id, nome, lat, lng, status) VALUES (?, ?, ?, ?, ?)', 
        [t.id, t.nome, t.lat, t.lng, 'ATIVO']);
  }

  console.log(`✅ SUCESSO ABSOLUTO! ${tecnicosReais.length} técnicos foram salvos com suas posições exatas no mapa!`);
}

importarDireto();