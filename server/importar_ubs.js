const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// A SUA LISTA EXATA E ATUALIZADA
const usfsReais = [
  // LESTE
  { id: 101, nome: "USF L-05", endereco: "Av. Batrum - Conj Novo Reino I, Manaus - AM", lat: -3.054596, lng: -59.942005, porte: "Porte 1", prioridade: "Baixa" },
  { id: 102, nome: "USF L-15", endereco: "R. José Romão, 74 - Conjunto Colina do Aleixo, Manaus - AM", lat: -3.063276, lng: -59.959584, porte: "Porte 1", prioridade: "Média" },
  { id: 103, nome: "USF L-32", endereco: "R. Vinícius de Morães - Coroado, Manaus - AM", lat: -3.087708, lng: -59.978534, porte: "Porte 1", prioridade: "Baixa" },
  { id: 104, nome: "USF L-42", endereco: "R. Airton Senna, S/N, Comunidade Bela Vista - Puraquequara, Manaus - AM", lat: -3.077856, lng: -59.884518, porte: "Porte 1", prioridade: "Alta" },
  { id: 105, nome: "USF L-44", endereco: "Rua 04, S/N, Jardim Mauá - Mauazinho, Manaus - AM", lat: -3.116807, lng: -59.940583, porte: "Porte 1", prioridade: "Média" },
  { id: 106, nome: "USF L-45", endereco: "R. Edmundo Soares - São José Operário, Manaus - AM", lat: -3.061436, lng: -59.952674, porte: "Porte 1", prioridade: "Baixa" },
  { id: 107, nome: "USF L-46", endereco: "R. Primeiro de Junho - Zumbi dos Palmares, Manaus - AM", lat: -3.073153, lng: -59.945751, porte: "Porte 1", prioridade: "Alta" },
  { id: 108, nome: "USF L-47", endereco: "Rua Beija Flor - próximo à Reserva Adolpho Duckrer - Jorge Teixeira, Manaus - AM", lat: -3.008558, lng: -59.939361, porte: "Porte 1", prioridade: "Baixa" },
  { id: 109, nome: "USF AGNALDO GOMES", endereco: "São José Operário, Manaus - AM", lat: -3.063874, lng: -59.961949, porte: "Porte 4", prioridade: "Média" },

  // NORTE
  { id: 201, nome: "USF N-01", endereco: "R. Nossa Senhora de Aparecida - Cidade de Deus, Manaus - AM", lat: -3.014706, lng: -59.940736, porte: "Porte 1", prioridade: "Alta" },
  { id: 202, nome: "USF N-02", endereco: "R. dos Curiós, S/N - Cidade de Deus, Manaus - AM", lat: -3.020036, lng: -59.955979, porte: "Porte 1", prioridade: "Baixa" },
  { id: 203, nome: "USF N-03", endereco: "Av. Omar Aziz, 38 - Alfredo Nascimento - Cidade de Deus, Manaus - AM", lat: -3.015836, lng: -59.952026, porte: "Porte 1", prioridade: "Média" },
  { id: 204, nome: "USF N-06", endereco: "R. Bias Fortes - Cidade de Deus, Manaus - AM", lat: -3.026708, lng: -59.952738, porte: "Porte 1", prioridade: "Baixa" },
  { id: 205, nome: "USF N-12", endereco: "R. Perimetral Norte - Novo Aleixo, Manaus - AM", lat: -3.050763, lng: -59.955782, porte: "Porte 1", prioridade: "Baixa" },
  { id: 206, nome: "USF N-13", endereco: "R. 26 DE Agosto - Cidade Nova, Manaus - AM", lat: -3.023814, lng: -59.972232, porte: "Porte 1", prioridade: "Média" },
  { id: 207, nome: "USF N-14", endereco: "R. Fábio Lucena, S/N - Nova Cidade, Manaus - AM", lat: -3.034654, lng: -59.974830, porte: "Porte 1", prioridade: "Baixa" },
  { id: 208, nome: "USF N-16", endereco: "AV. Amazonas, 31, Campo Dourado - Nova Cidade, Manaus - AM", lat: -3.018681, lng: -59.977963, porte: "Porte 1", prioridade: "Alta" },
  { id: 209, nome: "USF N-17", endereco: "R. Netuno, S/N, Campo Dourado II - Nova Cidade, Manaus - AM", lat: -3.020507, lng: -59.971117, porte: "Porte 1", prioridade: "Média" },
  { id: 210, nome: "USF N-19", endereco: "R. São Judas Tadeu, 15 - Col. Santo Antônio, Manaus - AM", lat: -3.028188, lng: -60.002438, porte: "Porte 1", prioridade: "Baixa" },
  { id: 211, nome: "USF N-21", endereco: "R. 32, Conjunto Amazonino Mendes - Novo Aleixo, Manaus - AM", lat: -3.043663, lng: -59.955743, porte: "Porte 1", prioridade: "Alta" },
  { id: 212, nome: "USF N-22", endereco: "R. 20 DE Novembro, 40 - Monte das Oliveiras, Manaus - AM", lat: -3.020732, lng: -59.993641, porte: "Porte 1", prioridade: "Baixa" },
  { id: 213, nome: "USF N-23", endereco: "R. Pio XII, 22 - Colônia Terra Nova, Manaus - AM", lat: -3.019679, lng: -59.997251, porte: "Porte 1", prioridade: "Média" },
  { id: 214, nome: "USF N-24", endereco: "Colônia Terra Nova, Manaus - AM", lat: -3.006680, lng: -60.004395, porte: "Porte 1", prioridade: "Baixa" },
  { id: 215, nome: "USF N-26", endereco: "Av. Preciosa, 262 - Monte das Oliveiras, Manaus - AM", lat: -3.005622, lng: -59.996004, porte: "Porte 1", prioridade: "Alta" },
  { id: 216, nome: "USF N-27", endereco: "R. São Nicolau, S/N, Monte Pascoal - Monte das Oliveiras, Manaus - AM", lat: -3.010847, lng: -59.994072, porte: "Porte 1", prioridade: "Baixa" },
  { id: 217, nome: "USF N-30", endereco: "R. Santa Helena, 30 - Colônia Terra Nova, Manaus - AM", lat: -3.010491, lng: -60.008098, porte: "Porte 1", prioridade: "Média" },
  { id: 218, nome: "USF N-31", endereco: "Av. Cristã - Colônia Terra Nova, Manaus - AM", lat: -3.019860, lng: -60.007745, porte: "Porte 1", prioridade: "Baixa" },
  { id: 219, nome: "USF N-35", endereco: "R. Maranhão, 1 - Cidade de Deus, Manaus - AM", lat: -3.022928, lng: -59.943840, porte: "Porte 1", prioridade: "Baixa" },
  { id: 220, nome: "USF N-36", endereco: "Rua Guarabira, 142 - Cidade de Deus, Manaus - AM", lat: -3.012421, lng: -59.946642, porte: "Porte 1", prioridade: "Alta" },
  { id: 221, nome: "USF N-39", endereco: "R. Toronto - Nova Cidade, Manaus - AM", lat: -3.015626, lng: -59.967615, porte: "Porte 1", prioridade: "Baixa" },
  { id: 222, nome: "USF N-40", endereco: "Rua Xxiv, S/N, Manôa I - Rua Prof. Manoel Belém - Nova Cidade, Manaus - AM", lat: -3.0233021, lng: -59.9964414, porte: "Porte 1", prioridade: "Média" },
  { id: 223, nome: "USF N-41", endereco: "Av. A - Nova Cidade, Manaus - AM", lat: -3.011915, lng: -59.979672, porte: "Porte 1", prioridade: "Baixa" },
  { id: 224, nome: "USF N-42", endereco: "R. 24, 624 - Cidade de Deus, Manaus - AM", lat: -3.011541, lng: -59.956698, porte: "Porte 1", prioridade: "Baixa" },
  { id: 225, nome: "USF N-43", endereco: "Rua das Jaçanãs, 33 - Alfredo Nascimento, Manaus - AM", lat: -3.021773, lng: -59.950034, porte: "Porte 1", prioridade: "Média" },
  { id: 226, nome: "USF N-46", endereco: "R. Abiu, S/N - Colônia Terra Nova, Manaus - AM", lat: -3.006109, lng: -60.027597, porte: "Porte 1", prioridade: "Baixa" },
  { id: 227, nome: "USF N-47", endereco: "Ramal Santa Marta, sn, Manaus - AM", lat: -3.045134, lng: -59.930606, porte: "Porte 1", prioridade: "Alta" },
  { id: 228, nome: "USF N-48", endereco: "Av. São João - Lago Azul, Manaus - AM", lat: -2.947848, lng: -60.031726, porte: "Porte 1", prioridade: "Baixa" },
  { id: 229, nome: "USF N-49", endereco: "Rua Campo Grande - Colônia Terra Nova, Manaus - AM", lat: -3.004290, lng: -60.015927, porte: "Porte 1", prioridade: "Baixa" },
  { id: 230, nome: "USF N-50", endereco: "R. Vasco de Ataíde, S/N - Cidade Nova, Manaus - AM", lat: -3.038537, lng: -59.988056, porte: "Porte 1", prioridade: "Média" },
  { id: 231, nome: "USF N-51", endereco: "Rua Tucano Street - Novo Aleixo, Manaus - AM", lat: -3.060353, lng: -59.967652, porte: "Porte 1", prioridade: "Baixa" },
  { id: 232, nome: "USF N-52", endereco: "R. Chade - Cidade Nova, Manaus - AM", lat: -3.002407, lng: -59.971212, porte: "Porte 1", prioridade: "Alta" },
  { id: 233, nome: "USF N-53", endereco: "R. 222-A, 3340 - Conj. Cidade V, Manaus - AM", lat: -2.990300, lng: -59.983095, porte: "Porte 1", prioridade: "Baixa" },
  { id: 234, nome: "USF N-54", endereco: "Santa Etelvina, Manaus - AM", lat: -2.979466, lng: -59.987782, porte: "Porte 1", prioridade: "Média" },
  { id: 235, nome: "USF N-55", endereco: "R. 25 - Nova Cidade, Manaus - AM", lat: -2.982654, lng: -59.985065, porte: "Porte 1", prioridade: "Baixa" },
  { id: 236, nome: "USF N-56", endereco: "Av. Acácia Negra - Lago Azul, Manaus - AM", lat: -2.968256, lng: -60.008707, porte: "Porte 1", prioridade: "Baixa" },
  { id: 237, nome: "USF N-57", endereco: "R. Otoniel Alencar - Colônia Terra Nova, Manaus - AM", lat: -2.968256, lng: -60.008707, porte: "Porte 1", prioridade: "Média" },
  { id: 238, nome: "USF N-58", endereco: "R. Capibaribe, 02 - Novo Aleixo, Manaus - AM", lat: -3.051224, lng: -59.973792, porte: "Porte 1", prioridade: "Baixa" },
  { id: 239, nome: "USF N-59", endereco: "R. Dom Jesus de Irineu - Santa Etelvina, Manaus - AM", lat: -2.983244, lng: -60.003631, porte: "Porte 1", prioridade: "Alta" },
  { id: 240, nome: "USF N-60", endereco: "KM.02 . BR-174 - Lago Azul, Manaus - AM", lat: -2.963654, lng: -60.024271, porte: "Porte 1", prioridade: "Baixa" },
  { id: 241, nome: "USF AMAZONINO MENDES", endereco: "Av. da Esperança, 550 - Lago Azul, Manaus - AM", lat: -2.967546, lng: -59.991613, porte: "Porte 4", prioridade: "Média" },
  { id: 242, nome: "USF FRANK ABRAHIM", endereco: "R. Abraham Benzion - Cidade Nova, Manaus - AM", lat: -3.060798, lng: -59.975489, porte: "Porte 4", prioridade: "Baixa" },
  { id: 243, nome: "USF MANOEL RIBEIRO", endereco: "R. Leblon - Cidade de Deus, Manaus - AM", lat: -3.031281, lng: -59.940388, porte: "Porte 4", prioridade: "Baixa" },

  // SUL
 
  { id: 302, nome: "USF S-05", endereco: "R. Projetada 4, 4 - Redenção, Manaus - AM", lat: -3.113336, lng: -60.028222, porte: "Porte 1", prioridade: "Média" },
  { id: 303, nome: "USF S-12", endereco: "R. Santa Isabel - Centro, Manaus - AM", lat: -3.130348, lng: -60.010771, porte: "Porte 1", prioridade: "Alta" },
  { id: 304, nome: "USF S-33", endereco: "R. 14, 250 - Japiim, Manaus - AM", lat: -3.116123, lng: -59.986766, porte: "Porte 1", prioridade: "Baixa" },
  { id: 305, nome: "USF S-43", endereco: "Rua Campos do Jordão, 115 - Petrópolis, Manaus - AM", lat: -3.100466, lng: -59.991420, porte: "Porte 1", prioridade: "Baixa" },
  { id: 306, nome: "USF BENEDITO DE ALMEIDA", endereco: "R. Girassol - São Francisco, Manaus - AM", lat: -3.109580, lng: -60.000393, porte: "Porte 4", prioridade: "Média" },

  // OESTE
  { id: 401, nome: "USF O-01", endereco: "Rua Peixe Cavalo, S/N - Tarumã, Manaus - AM", lat: -3.040000, lng: -60.050000, porte: "Porte 1", prioridade: "Baixa" }, 
  { id: 402, nome: "USF O-07", endereco: "R. Alvorada, 1 - Alvorada, Manaus - AM", lat: -3.080607, lng: -60.043065, porte: "Porte 1", prioridade: "Baixa" },
  { id: 403, nome: "USF O-10", endereco: "R. 3 - Nova Esperança, Manaus - AM", lat: -3.080018, lng: -60.060484, porte: "Porte 1", prioridade: "Média" },
  { id: 404, nome: "USF O-11", endereco: "R. Osvaldo Barbosa, 12 - Nova Esperança, Manaus - AM", lat: -3.087783, lng: -60.056836, porte: "Porte 1", prioridade: "Baixa" },
  { id: 405, nome: "USF O-18", endereco: "R. Vitor Meirelles, 33 - Compensa, Manaus - AM", lat: -3.098898, lng: -60.067373, porte: "Porte 1", prioridade: "Alta" },
  { id: 406, nome: "USF O-19", endereco: "R. Plínio Coelho, 182 - Compensa, Manaus - AM", lat: -3.111785, lng: -60.058320, porte: "Porte 1", prioridade: "Baixa" },
  { id: 407, nome: "USF O-22", endereco: "R. Manaus, s/n - Compensa 2, Manaus - AM", lat: -3.100896, lng: -60.060229, porte: "Porte 1", prioridade: "Baixa" },
  { id: 408, nome: "USF O-38", endereco: "Beco Pero de Ataide, 56 - Dom Pedro, Manaus - AM", lat: -3.081595, lng: -60.043966, porte: "Porte 1", prioridade: "Média" },
  { id: 409, nome: "USF O-43", endereco: "RUA Belo Horizonte, S/N - Compensa, Manaus - AM", lat: -3.099063, lng: -60.061854, porte: "Porte 1", prioridade: "Baixa" },
  { id: 410, nome: "USF O-45", endereco: "R. Praia do Futuro, 897 - Tarumã, Manaus - AM", lat: -3.001489, lng: -60.044725, porte: "Porte 1", prioridade: "Alta" },
  { id: 411, nome: "USF O-46", endereco: "Rua Raimundo Maia ,S/N - Tarumã, Manaus - AM", lat: -2.996367, lng: -60.035741, porte: "Porte 1", prioridade: "Baixa" },
  { id: 412, nome: "USF O-48", endereco: "Rua Sapucaia, S/N - Tarumã, Manaus - AM", lat: -3.012123, lng: -60.043812, porte: "Porte 1", prioridade: "Média" },
  { id: 413, nome: "USF O-53", endereco: "Rua Peter Drucker - Tarumã, Manaus - AM", lat: -3.021074, lng: -60.044475, porte: "Porte 1", prioridade: "Baixa" },
  { id: 414, nome: "USF PARQUE DAS TRIBOS", endereco: "R. Piratapuia, 19 - Tarumã Açu, Manaus - AM", lat: -2.988343, lng: -60.072033, porte: "Porte 4", prioridade: "Baixa" },
  { id: 415, nome: "USF WALID AZIZ", endereco: "Av. José Moacir Teberga de Toledo - Planalto, Manaus - AM", lat: -3.062768, lng: -60.066386, porte: "Porte 4", prioridade: "Média" },
  { id: 416, nome: "USF SILVIO SANTOS", endereco: "R. Vinte e três de Dezembro, 136 - Compensa, Manaus - AM", lat: -3.106002, lng: -60.062094, porte: "Porte 4", prioridade: "Baixa" }
];

async function importarUBS() {
  const db = await open({ filename: path.join(__dirname, 'banco_oficial.sqlite'), driver: sqlite3.Database });
  console.log('🚀 Atualizando a base de UBS com dados exatos...');

  // Limpa a tabela antiga
  await db.run('DELETE FROM unidades');

  // Injeta a lista atualizada
  for (const u of usfsReais) {
      await db.run('INSERT INTO unidades (id, nome, endereco, porte, prioridade, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [u.id, u.nome, u.endereco, u.porte, u.prioridade, u.lat, u.lng]);
  }

  console.log(`✅ PRONTO! ${usfsReais.length} UBSs foram atualizadas com sucesso e as cores dos portes vão bater 100%!`);
}

importarUBS();