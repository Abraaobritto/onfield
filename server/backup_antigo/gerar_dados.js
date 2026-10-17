const axios = require('axios');
const fs = require('fs');
const lista = require('./lista_usfs');

// Função de pausa para não bloquear a API (1.5 segundos)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processar() {
  console.log(`🚀 Iniciando geocodificação de ${lista.length} unidades...`);
  console.log('Isso pode levar cerca de 2 minutos. Por favor, aguarde.');
  
  const usfsFinal = [];
  let idContador = 1;

  for (const item of lista) {
    // Monta a busca: "Rua X, Bairro Y, Manaus, Amazonas"
    const busca = `${item.endereco}, ${item.bairro}, Manaus, Amazonas`;
    
    try {
      console.log(`🔍 Buscando: ${item.unidade}...`);
      
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busca)}&limit=1`;
      
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'SistemaEscalaUBS/1.0' }
      });

      if (res.data && res.data.length > 0) {
        usfsFinal.push({
          id: idContador++,
          nome: item.unidade,
          porte: item.porte,
          endereco: `${item.endereco}, ${item.bairro}`,
          lat: parseFloat(res.data[0].lat),
          lng: parseFloat(res.data[0].lon)
        });
        console.log(`✅ Encontrado!`);
      } else {
        console.log(`❌ Não encontrado exato (usando centro de Manaus como fallback): ${item.unidade}`);
        // Fallback para não quebrar o mapa (Aponta pro centro, user edita depois)
        usfsFinal.push({
          id: idContador++,
          nome: item.unidade + " (Endereço não exato)",
          porte: item.porte,
          endereco: item.endereco,
          lat: -3.1190,
          lng: -60.0217
        });
      }

    } catch (error) {
      console.error(`Erro ao buscar ${item.unidade}`);
    }

    // Espera 1.5s entre cada busca
    await delay(1500);
  }

  // Salva no arquivo JSON
  fs.writeFileSync('banco_usfs.json', JSON.stringify(usfsFinal, null, 2));
  console.log('-------------------------------------------');
  console.log('🎉 SUCESSO! Arquivo banco_usfs.json criado.');
  console.log('Agora reinicie o servidor principal (index.js).');
}

processar();