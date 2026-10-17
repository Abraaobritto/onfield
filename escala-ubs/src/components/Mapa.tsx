import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Calculator, Trash2, Search, Users, MapPin, AlertCircle, PhoneCall, History, Clock, Map as MapIcon } from 'lucide-react';
import type { Escala } from '../types';

import { iconTecnico } from '../utils/icons';
import { calcularDistanciaKm } from '../utils/geo';
import { RotaInteligente } from './RotaHelper';
import { ModalEscala } from './ModalEscala';
import { ModalRelatorio } from './ModalRelatorio';
import { ModalEditar } from './ModalEditar';

const centroManaus: [number, number] = [-3.1190, -60.0217];
const COR_MARCA = '#009ee3';
const RAIO_BUSCA_METROS = 1500; 

function FlyToLocation({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (coords) map.flyTo(coords, 16, { duration: 1.5 }); }, [coords]);
  return null;
}

function MapEvents({ onMapClick, onZoom }: { onMapClick: () => void, onZoom: (z: number) => void }) {
  const map = useMapEvents({ 
    click: onMapClick,
    zoomend: () => onZoom(map.getZoom()) 
  });
  
  useEffect(() => {
    onZoom(map.getZoom()); 
  }, [map, onZoom]);

  return null;
}

interface MapaProps { relatorioAberto: boolean; fecharRelatorio: () => void; perfilUsuario: string; }

const coordNum = (valor: any): number => {
  if (!valor) return NaN;
  return parseFloat(String(valor).replace(',', '.'));
};

const getRegiaoInfo = (id: number | string) => {
  const idNum = Number(id);
  if (idNum >= 100 && idNum < 200) return { nome: 'LESTE', cor: '#8b5cf6' }; 
  if (idNum >= 200 && idNum < 300) return { nome: 'NORTE', cor: '#3b82f6' }; 
  if (idNum >= 300 && idNum < 400) return { nome: 'SUL', cor: '#10b981' };   
  if (idNum >= 400 && idNum < 500) return { nome: 'OESTE', cor: '#f59e0b' }; 
  return { nome: 'OUTRAS', cor: '#64748b' }; 
};

const getColoredPin = (regiaoCor: string, porte: string, zoom: number) => {
  const isPorte4 = porte === 'Porte 4';
  const label = isPorte4 ? 'PIV' : 'PI';
  const corPino = isPorte4 ? '#ef4444' : regiaoCor; 

  const scale = Math.max(0.4, Math.min(1.5, 1 - (12 - zoom) * 0.2));

  const baseW = isPorte4 ? 32 : 28;
  const baseH = isPorte4 ? 42 : 38;
  const w = baseW * scale;
  const h = baseH * scale;

  const svg = `
    <svg width="${w}" height="${h}" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11.42 15.116 25.438 15.534 25.903a.624.624 0 0 0 .932 0C16.884 41.438 32 27.42 32 16 32 7.163 24.837 0 16 0z" fill="${corPino}" stroke="white" stroke-width="1.5" />
      <circle cx="16" cy="15" r="10" fill="white" />
      <text x="16" y="18.5" font-size="${isPorte4 ? '9' : '11'}" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="${corPino}">${label}</text>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-svg-pin',
    html: svg,
    iconSize: [w, h],
    iconAnchor: [w / 2, h], 
    popupAnchor: [0, -h + 4] 
  });
};

export default function Mapa({ relatorioAberto, fecharRelatorio, perfilUsuario }: MapaProps) {
  const [usfs, setUsfs] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  
  const [zoomAtual, setZoomAtual] = useState<number>(12);

  const [analiseRaio, setAnaliseRaio] = useState<{ubsId: number, lista: any[]} | null>(null);
  const [rotaPontos, setRotaPontos] = useState<[number, number][]>([]);
  const [zoomCoords, setZoomCoords] = useState<[number, number] | null>(null);
  const [pontoA, setPontoA] = useState("");
  const [pontoB, setPontoB] = useState("");
  const [distanciaEstimada, setDistanciaEstimada] = useState<string | null>(null);
  
  const [modalEscalaOpen, setModalEscalaOpen] = useState(false);
  const [ubsSelecionada, setUbsSelecionada] = useState<any | null>(null);
  const [tecnicosParaEscala, setTecnicosParaEscala] = useState<string[]>([]);
  
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState<{ids: string[], inicio: string, fim: string, ubsNome: string} | null>(null);

  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<any[]>([]);

  const [idDeslocamentoAberto, setIdDeslocamentoAberto] = useState<number | string | null>(null);
  const [alvoDeslocamento, setAlvoDeslocamento] = useState("");
  const [obsChamado, setObsChamado] = useState("");

  const [focoA, setFocoA] = useState(false);
  const [focoB, setFocoB] = useState(false);

  const [filtroRegiao, setFiltroRegiao] = useState<string>('TODAS');

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = () => {
    const ts = new Date().getTime();
    fetch(`http://localhost:3001/api/usfs?t=${ts}`).then(r => r.json()).then(setUsfs).catch(console.error);
    fetch(`http://localhost:3001/api/tecnicos?t=${ts}`).then(r => r.json()).then(setTecnicos).catch(console.error);
    fetch(`http://localhost:3001/api/escalas?t=${ts}`).then(r => r.json()).then(setEscalas).catch(console.error);
  }

  const mudarPrioridade = async (ubsId: number, novaPrioridade: string) => {
    const novasUsfs = usfs.map(u => u.id === ubsId ? {...u, prioridade: novaPrioridade} : u);
    setUsfs(novasUsfs);
    try {
      await fetch(`http://localhost:3001/api/usfs/${ubsId}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ prioridade: novaPrioridade })
      });
      carregarDados();
    } catch (e) {
      alert("Erro ao alterar prioridade. Verifique o servidor.");
    }
  };

  const statusTecnicos = new Map(); 
  escalas.forEach(e => { 
    const hoje = new Date().toISOString().split('T')[0];
    if (hoje >= e.dataInicio && hoje <= e.dataFim) {
      statusTecnicos.set(Number(e.tecnicoId), e.ubsNome); 
    }
  });

  // 👇 LÓGICA DE ZONA FIXA DO TÉCNICO APLICADA AQUI 👇
  const getRegiaoTecnico = (tec: any) => {
    const lat = coordNum(tec.lat);
    const lng = coordNum(tec.lng);
    if (isNaN(lat) || isNaN(lng) || usfs.length === 0) return 'OUTRAS';

    let menorDistancia = Infinity;
    let regiaoEncontrada = 'OUTRAS';

    usfs.forEach(u => {
      const dist = calcularDistanciaKm(lat, lng, coordNum(u.lat), coordNum(u.lng));
      if (dist < menorDistancia) {
        menorDistancia = dist;
        regiaoEncontrada = getRegiaoInfo(u.id).nome;
      }
    });

    return regiaoEncontrada;
  };

  const locaisObjList = [
    ...tecnicos.map(t => ({ nome: t.nome, tipo: 'tec', id: t.id, ubsAlocada: statusTecnicos.get(t.id), regiao: getRegiaoTecnico(t) })),
    ...usfs.map(u => ({ nome: u.nome, tipo: 'ubs', id: u.id, ubsAlocada: null, regiao: getRegiaoInfo(u.id).nome }))
  ].sort((a, b) => a.nome.localeCompare(b.nome));

  const handleDigitacao = (texto: string) => {
    setBusca(texto);
    if (texto.trim().length > 0) { 
      const txt = texto.toLowerCase();
      const matchesUbs = usfs.filter(u => u.nome.toLowerCase().includes(txt)).map(u => ({ ...u, tipoBusca: 'ubs' }));
      const matchesTec = tecnicos.filter(t => t.nome.toLowerCase().includes(txt)).map(t => {
          const ubsAlocada = statusTecnicos.get(t.id);
          return { ...t, tipoBusca: 'tec', ubsAlocada };
      });
      setSugestoes([...matchesTec, ...matchesUbs].slice(0, 6)); 
    } else { 
      setSugestoes([]); 
    }
  };

  const selecionarSugestao = (item: any) => {
    setZoomCoords([coordNum(item.lat), coordNum(item.lng)]);
    if (item.tipoBusca === 'ubs') {
      const regiao = getRegiaoInfo(item.id).nome;
      if (filtroRegiao !== 'TODAS' && regiao !== filtroRegiao) setFiltroRegiao(regiao);
    } else if (item.tipoBusca === 'tec') {
      const regiao = getRegiaoTecnico(item);
      if (filtroRegiao !== 'TODAS' && regiao !== filtroRegiao) setFiltroRegiao(regiao);
    }
    setBusca(item.nome);
    setSugestoes([]);
  };

  const limparMapa = () => { setAnaliseRaio(null); setRotaPontos([]); setDistanciaEstimada(null); setPontoA(""); setPontoB(""); setZoomCoords(null); setSugestoes([]); setBusca(""); setFiltroRegiao('TODAS'); };

  const ativarRaioBusca = (ubs: any) => {
    setRotaPontos([]); 
    const uLat = coordNum(ubs.lat);
    const uLng = coordNum(ubs.lng);

    const prox = tecnicos
      .filter(t => {
        const tLat = coordNum(t.lat);
        const tLng = coordNum(t.lng);
        if (isNaN(tLat) || isNaN(tLng)) return false;
        return calcularDistanciaKm(uLat, uLng, tLat, tLng) <= (RAIO_BUSCA_METROS / 1000);
      }) 
      .map(t => {
         const isOcupado = statusTecnicos.has(t.id);
         return {
           ...t, distancia: calcularDistanciaKm(uLat, uLng, coordNum(t.lat), coordNum(t.lng)), ocupado: isOcupado, ubsAlocada: isOcupado ? statusTecnicos.get(t.id) : null
         };
      });
    prox.sort((a, b) => a.distancia - b.distancia);
    setAnaliseRaio({ ubsId: ubs.id, lista: prox });
  };

  const calcularRotaReal = () => {
    setAnaliseRaio(null); 
    if (!pontoA || !pontoB) return alert("Selecione Origem e Destino.");

    const todasEntidades = [
      ...tecnicos.map(t => ({ lat: coordNum(t.lat), lng: coordNum(t.lng), nome: t.nome })),
      ...usfs.map(u => ({ lat: coordNum(u.lat), lng: coordNum(u.lng), nome: u.nome }))
    ];

    const objA = todasEntidades.find(i => i.nome.toLowerCase() === pontoA.toLowerCase());
    const objB = todasEntidades.find(i => i.nome.toLowerCase() === pontoB.toLowerCase());
    
    if (objA && objB) {
      if (!isNaN(objA.lat) && !isNaN(objA.lng) && !isNaN(objB.lat) && !isNaN(objB.lng)) {
        setDistanciaEstimada(`${calcularDistanciaKm(objA.lat, objA.lng, objB.lat, objB.lng).toFixed(2)} km`);
        setRotaPontos([[objA.lat, objA.lng], [objB.lat, objB.lng]]);
        setZoomCoords([(objA.lat + objB.lat)/2, (objA.lng + objB.lng)/2]);
      } else {
        alert("As coordenadas de um destes pontos são inválidas no banco de dados.");
      }
    } else {
      alert("Local não encontrado. Por favor, selecione um nome válido na lista.");
    }
  };

  const handleSalvarEscala = async (tecnicosIds: string[], inicio: string, fim: string, ubsFinal: any) => {
    if(tecnicosIds.length === 0 || !inicio || !fim) return alert("Preencha as datas e selecione os técnicos!");
    if(!ubsFinal || !ubsFinal.id) return alert("Atenção: Você precisa selecionar uma UBS no mapa para enviar a escala!");
    
    const d1 = new Date(inicio); const d2 = new Date(fim);
    if (d2 < d1) return alert("Data final inválida!");
    const dias = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000*3600*24)) + 1;

    for (const id of tecnicosIds) {
        const tec = tecnicos.find(t => t.id === Number(id));
        if (tec) {
            await fetch('http://localhost:3001/api/escalas', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ tecnicoId: Number(id), tecnicoNome: tec.nome, ubsId: ubsFinal.id, ubsNome: ubsFinal.nome, dataInicio: inicio, dataFim: fim, dias })
            });
        }
    }
    alert(`✅ ${tecnicosIds.length} Técnico(s) Escalado(s) para ${ubsFinal.nome}!`); 
    setModalEscalaOpen(false);
    setTimeout(() => { carregarDados(); }, 500);
  };

  const efetuarDeslocamento = async (tecnicoId: string | number, ubsId: string | number) => {
    if (!tecnicoId || !ubsId) return alert("Selecione o destino e o profissional corretamente.");
    const tec = tecnicos.find(t => String(t.id) === String(tecnicoId));
    const ubs = usfs.find(u => String(u.id) === String(ubsId));
    
    if (!tec || !ubs) return;
    const hoje = new Date().toISOString().split('T')[0]; 
    
    try {
      await fetch('http://localhost:3001/api/escalas', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
            tecnicoId: tec.id, 
            tecnicoNome: tec.nome, 
            ubsId: ubs.id, 
            ubsNome: ubs.nome, 
            dataInicio: hoje, 
            dataFim: hoje, 
            dias: 1, 
            isChamado: true, 
            observacao: obsChamado 
          })
      });
      alert(`🚨 SUCESSO! Chamado aberto para ${tec.nome} em ${ubs.nome}!`);
      setIdDeslocamentoAberto(null); setAlvoDeslocamento(""); setObsChamado("");
      carregarDados();
    } catch (e) {
      alert("Erro de conexão com o servidor ao abrir chamado.");
    }
  };

  const abrirModalEdicao = (ids: string[], inicio: string, fim: string, ubsNome: string) => { setDadosEdicao({ ids, inicio, fim, ubsNome }); setModalEditarOpen(true); };

  const handleSalvarEdicao = async (ids: string[], inicio: string, fim: string) => {
    if (!inicio || !fim) return alert("Datas inválidas");
    for (const id of ids) {
        await fetch(`http://localhost:3001/api/escalas/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ dataInicio: inicio, dataFim: fim }) });
    }
    alert("✅ Datas atualizadas!");
    setModalEditarOpen(false); carregarDados();
  };

  const handleDeleteEscala = async (id: string) => { if(window.confirm("Excluir?")) { await fetch(`http://localhost:3001/api/escalas/${id}`, { method: 'DELETE' }); carregarDados(); } };
  
  const getEscalasDaUbs = (id: number) => escalas.filter((e: any) => e.ubsId === id && !e.isChamado); 
  const getCorPrioridade = (p: string) => { if (p === 'Alta') return '#ef4444'; if (p === 'Média') return '#f59e0b'; return '#10b981'; };

  const formatarData = (data: string | undefined) => {
    if (!data) return 'Sem registro';
    try {
        const d = new Date(data); if (isNaN(d.getTime())) return 'Data inválida';
        const userTimezoneOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() + userTimezoneOffset + (12 * 60 * 60 * 1000)).toLocaleDateString('pt-BR');
    } catch { return 'Erro data'; }
  };

  const usfsFiltradas = usfs.filter(usf => filtroRegiao === 'TODAS' || getRegiaoInfo(usf.id).nome === filtroRegiao);
  const qtdPI = usfsFiltradas.filter(u => u.porte !== 'Porte 4').length;
  const qtdPIV = usfsFiltradas.filter(u => u.porte === 'Porte 4').length;
  
  const tecnicosDaRegiao = tecnicos.filter(t => filtroRegiao === 'TODAS' || getRegiaoTecnico(t) === filtroRegiao);
  const tecsLivresRegiao = tecnicosDaRegiao.filter(t => !statusTecnicos.has(t.id)).length;
  const tecsMissaoRegiao = tecnicosDaRegiao.length - tecsLivresRegiao;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      
      <div style={{ position: 'absolute', top: 10, left: 60, zIndex: 1000, display: 'flex', flexDirection: 'column', width: '320px', fontFamily: 'inherit' }}>
        
        <div style={{ display: 'flex', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', background: 'white' }}>
          <input type="text" placeholder="Buscar UBS ou Profissional..." value={busca} onChange={e => handleDigitacao(e.target.value)} style={{ padding: '12px', borderRadius: '8px 0 0 8px', border: 'none', width: '100%', outline: 'none', backgroundColor: '#ffffff', color: '#334155', fontFamily: 'inherit' }} />
          <button style={{ background: COR_MARCA, color: 'white', border: 'none', padding: '0 15px', borderRadius: '0 8px 8px 0', cursor: 'pointer' }}><Search size={20}/></button>
        </div>
        
        {sugestoes.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '5px 0 0 0', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', width: '100%', maxHeight: '250px', overflowY: 'auto' }}>
            {sugestoes.map(s => (
              <li key={s.tipoBusca + s.id} onClick={() => selecionarSugestao(s)} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#333' }}>
                {s.tipoBusca === 'ubs' ? (
                  <div style={{width:'16px', height:'16px', borderRadius:'50%', background: s.porte === 'Porte 4' ? '#ef4444' : getRegiaoInfo(s.id).cor}}></div>
                ) : (
                  <div style={{background:'#e0f2fe', padding:'4px', borderRadius:'50%', fontSize: '12px', minWidth: '20px', textAlign: 'center'}}>👷</div>
                )}
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <strong>{s.nome}</strong>
                  {s.tipoBusca === 'tec' && (
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: s.ubsAlocada ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                      {s.ubsAlocada ? `Em missão: ${s.ubsAlocada}` : 'LIVRE ✅'}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap' }}>
          {['TODAS', 'NORTE', 'SUL', 'LESTE', 'OESTE'].map(regiao => {
             const corBase = regiao === 'TODAS' ? COR_MARCA : getRegiaoInfo(regiao === 'NORTE' ? 200 : regiao === 'SUL' ? 300 : regiao === 'LESTE' ? 100 : 400).cor;
             return (
              <button 
                key={regiao}
                onClick={() => setFiltroRegiao(regiao)}
                style={{
                  background: filtroRegiao === regiao ? corBase : 'white',
                  color: filtroRegiao === regiao ? 'white' : '#475569',
                  border: `1px solid ${filtroRegiao === regiao ? corBase : '#cbd5e1'}`,
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: filtroRegiao === regiao ? `0 2px 6px ${corBase}60` : '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                {regiao}
              </button>
             );
          })}
        </div>

        <div style={{ marginTop: '10px', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '12px', color: '#334155' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#1e293b', fontSize: '13px' }}>
            <MapIcon size={16} color={COR_MARCA} /> 
            {filtroRegiao === 'TODAS' ? 'MANAUS (VISÃO GERAL)' : `ZONA ${filtroRegiao}`}
          </strong>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
            <span style={{fontWeight: '500'}}>📍 Unidades (USF):</span>
            <span style={{background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'}}>{usfsFiltradas.length} total</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', paddingLeft: '18px', marginBottom: '12px', fontSize: '11px' }}>
            <span>• Porte I: <strong style={{color:'#333'}}>{qtdPI}</strong></span>
            <span>• Porte IV: <strong style={{color:'#333'}}>{qtdPIV}</strong></span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', alignItems: 'center' }}>
            <span style={{fontWeight: '500'}}>👷 Técnicos na Zona:</span>
            <span style={{background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'}}>{tecnicosDaRegiao.length} de {tecnicos.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', paddingLeft: '18px', marginTop: '5px', fontSize: '11px' }}>
            <span>• Em missão: <strong style={{color:'#ef4444'}}>{tecsMissaoRegiao}</strong></span>
            <span>• Livres: <strong style={{color:'#10b981'}}>{tecsLivresRegiao}</strong></span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: '#64748b', fontSize: '10px', marginTop: '15px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
            <span style={{display: 'flex', alignItems: 'center', gap:'4px'}}><div style={{width:'8px',height:'8px',background:'#ef4444',borderRadius:'50%'}}></div> PIV (Maior Porte)</span>
            <span style={{display: 'flex', alignItems: 'center', gap:'4px'}}><div style={{width:'8px',height:'8px',background:'#3b82f6',borderRadius:'50%'}}></div> Norte</span>
            <span style={{display: 'flex', alignItems: 'center', gap:'4px'}}><div style={{width:'8px',height:'8px',background:'#10b981',borderRadius:'50%'}}></div> Sul</span>
            <span style={{display: 'flex', alignItems: 'center', gap:'4px'}}><div style={{width:'8px',height:'8px',background:'#8b5cf6',borderRadius:'50%'}}></div> Leste</span>
            <span style={{display: 'flex', alignItems: 'center', gap:'4px'}}><div style={{width:'8px',height:'8px',background:'#f59e0b',borderRadius:'50%'}}></div> Oeste</span>
          </div>
        </div>

      </div>

      <ModalEscala 
        isOpen={modalEscalaOpen} 
        onClose={() => setModalEscalaOpen(false)} 
        ubsSelecionada={ubsSelecionada} 
        listaUsfs={usfs} 
        tecnicos={tecnicos} 
        escalas={escalas} 
        tecnicosPreSelecionados={tecnicosParaEscala} 
        onSave={handleSalvarEscala} 
      />
      
      <ModalRelatorio 
        isOpen={relatorioAberto} 
        onClose={fecharRelatorio} 
        escalas={escalas} 
        onDelete={handleDeleteEscala} 
        onEdit={abrirModalEdicao} 
        listaUsfs={usfs} 
        perfilUsuario={perfilUsuario} 
        tecnicos={tecnicos} 
        onRefresh={carregarDados} 
      />
      
      <ModalEditar isOpen={modalEditarOpen} onClose={() => setModalEditarOpen(false)} dadosIniciais={dadosEdicao} onSave={handleSalvarEdicao} />

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'white', padding: '15px', borderRadius: '8px', color: '#333', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', width: '280px', maxHeight: '80vh', overflowY: 'visible', fontFamily: 'inherit' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{display:'flex', gap:'5px', alignItems:'center'}}><Calculator size={16} color={COR_MARCA}/> Roteirizador</span>
          <button onClick={limparMapa} style={{background:'#fee2e2', color:'#ef4444', border:'none', padding:'4px', borderRadius:'4px', cursor:'pointer'}}><Trash2 size={12}/></button>
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          <div style={{ position: 'relative' }}>
            <input 
              value={pontoA} 
              onChange={e => setPontoA(e.target.value)} 
              onFocus={() => setFocoA(true)}
              onBlur={() => setTimeout(() => setFocoA(false), 200)}
              placeholder="Origem (Digite para buscar)..."
              style={{padding:'8px', border:'1px solid #cbd5e1', borderRadius:'4px', backgroundColor: '#ffffff', color: '#334155', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', fontSize: '12px'}}
            />
            {focoA && pontoA && (
              <ul style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 2000, padding: 0, margin: '2px 0 0 0', listStyle: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
                {locaisObjList.filter(l => l.nome.toLowerCase().includes(pontoA.toLowerCase())).map(l => (
                  <li key={'a-'+l.tipo+'-'+l.id} onClick={() => setPontoA(l.nome)} style={{padding: '8px', fontSize: '11px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', color: '#333'}}>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <strong>{l.nome} {l.tipo === 'ubs' ? '(UBS)' : ''}</strong>
                      {l.tipo === 'tec' && (
                        <span style={{fontSize: '10px', color: l.ubsAlocada ? '#ef4444' : '#10b981'}}>
                          {l.ubsAlocada ? `Em missão: ${l.ubsAlocada}` : 'LIVRE ✅'}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              value={pontoB} 
              onChange={e => setPontoB(e.target.value)} 
              onFocus={() => setFocoB(true)}
              onBlur={() => setTimeout(() => setFocoB(false), 200)}
              placeholder="Destino (Digite para buscar)..."
              style={{padding:'8px', border:'1px solid #cbd5e1', borderRadius:'4px', backgroundColor: '#ffffff', color: '#334155', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', fontSize: '12px'}}
            />
            {focoB && pontoB && (
              <ul style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 2000, padding: 0, margin: '2px 0 0 0', listStyle: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
                {locaisObjList.filter(l => l.nome.toLowerCase().includes(pontoB.toLowerCase())).map(l => (
                  <li key={'b-'+l.tipo+'-'+l.id} onClick={() => setPontoB(l.nome)} style={{padding: '8px', fontSize: '11px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', color: '#333'}}>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <strong>{l.nome} {l.tipo === 'ubs' ? '(UBS)' : ''}</strong>
                      {l.tipo === 'tec' && (
                        <span style={{fontSize: '10px', color: l.ubsAlocada ? '#ef4444' : '#10b981'}}>
                          {l.ubsAlocada ? `Em missão: ${l.ubsAlocada}` : 'LIVRE ✅'}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={calcularRotaReal} style={{background: COR_MARCA, color:'white', border:'none', padding:'8px', borderRadius:'4px', fontWeight:'bold', cursor:'pointer', marginTop:'5px'}}>Traçar Rota</button>
          {distanciaEstimada && <div style={{background:'#eff6ff', color:'#1e40af', padding:'10px', textAlign:'center', marginTop:'5px', borderRadius:'4px', fontWeight:'bold'}}>{distanciaEstimada}</div>}
        </div>
      </div>

      <MapContainer center={centroManaus} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyToLocation coords={zoomCoords} />
        
        <MapEvents onMapClick={() => { 
          setAnaliseRaio(null); 
          setIdDeslocamentoAberto(null); 
          setObsChamado(""); 
        }} onZoom={setZoomAtual} />
        
        {rotaPontos.length > 0 && <RotaInteligente pontos={rotaPontos} />}
        
        {analiseRaio && usfs.find(u => u.id === analiseRaio.ubsId) && (
          <Circle 
            center={[coordNum(usfs.find(u => u.id === analiseRaio.ubsId).lat), coordNum(usfs.find(u => u.id === analiseRaio.ubsId).lng)]} 
            radius={RAIO_BUSCA_METROS} 
            pathOptions={{ color: COR_MARCA, fillColor: COR_MARCA, fillOpacity: 0.15, weight: 2 }} 
          />
        )}
        
        {usfs
          .filter(usf => filtroRegiao === 'TODAS' || getRegiaoInfo(usf.id).nome === filtroRegiao)
          .map((usf: any) => {
          
          const lat = coordNum(usf.lat);
          const lng = coordNum(usf.lng);
          if (isNaN(lat) || isNaN(lng)) return null;

          const alocados = getEscalasDaUbs(usf.id);
          const escalasOrdenadas = [...alocados].sort((a, b) => new Date(b.dataFim).getTime() - new Date(a.dataFim).getTime());
          const ultimaVisitaObj = escalasOrdenadas.length > 0 ? escalasOrdenadas[0] : null;
          
          const infoRegiao = getRegiaoInfo(usf.id);

          return (
            <Marker key={`usf-${usf.id}`} position={[lat, lng]} icon={getColoredPin(infoRegiao.cor, usf.porte, zoomAtual)}>
              <Popup minWidth={300}>
                <div style={{color: '#333', fontFamily: 'inherit'}}>
                  
                  <div style={{display: 'inline-block', background: usf.porte === 'Porte 4' ? '#ef4444' : infoRegiao.cor, color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px'}}>ZONA {infoRegiao.nome}</div>
                  <br/>
                  
                  <strong style={{fontSize:'14px', color: '#1a1a1a'}}>{usf.nome}</strong><br/>
                  <span style={{fontSize:'11px', color:'#666'}}>{usf.endereco}</span>
                  
                  <div style={{marginTop:'10px', marginBottom:'5px'}}>
                    <div style={{display:'flex', gap:'5px', alignItems:'center', fontSize:'11px', color:'#64748b', fontWeight:'bold', marginBottom:'4px'}}><AlertCircle size={12}/> PRIORIDADE:</div>
                    <div style={{display: 'flex', gap: '3px', width: '100%'}}>
                      {['Baixa', 'Média', 'Alta'].map(p => (
                        <button key={p} 
                          onClick={() => perfilUsuario === 'ADMIN' && mudarPrioridade(usf.id, p)} 
                          disabled={perfilUsuario !== 'ADMIN'}
                          style={{flex: 1, padding: '6px 0', fontSize: '11px', fontWeight: 'bold', border: '1px solid', borderColor: usf.prioridade === p ? (p==='Alta'?'#ef4444':p==='Média'?'#f59e0b':'#10b981') : '#e2e8f0', backgroundColor: usf.prioridade === p ? (p==='Alta'?'#ef4444':p==='Média'?'#f59e0b':'#10b981') : 'white', color: usf.prioridade === p ? 'white' : '#64748b', borderRadius: '4px', cursor: perfilUsuario === 'ADMIN' ? 'pointer' : 'not-allowed', transition: 'all 0.2s', opacity: perfilUsuario === 'ADMIN' ? 1 : 0.7}}
                        >{p}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{background: '#f8fafc', padding:'8px', borderRadius:'4px', border:'1px solid #e2e8f0', fontSize:'11px', marginTop:'8px'}}>
                    <div style={{color:'#64748b', fontWeight:'bold', display:'flex', alignItems:'center', gap:'4px', marginBottom:'4px'}}><History size={12}/> Histórico / Última Visita</div>
                    <div style={{color:'#334155', fontWeight:'600'}}>📅 {ultimaVisitaObj ? formatarData(ultimaVisitaObj.dataFim) : formatarData(usf.ultimaVisita)}</div>
                    <div style={{color: COR_MARCA, fontWeight:'600', marginTop:'3px', display:'flex', alignItems:'center', gap:'4px'}}><Users size={12}/> {ultimaVisitaObj ? ultimaVisitaObj.tecnicoNome : 'Sem registro de profissional'}</div>
                  </div>

                  <div style={{background:'#f9f9f9', padding:'8px', marginTop:'8px', border:'1px solid #eee', borderRadius: '6px'}}>
                    <div style={{fontSize:'11px', fontWeight:'bold', color: COR_MARCA, display:'flex', gap:'4px', alignItems:'center'}}><Users size={12}/> ESCALA ATUAL:</div>
                    {alocados.length > 0 ? (
                      <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'5px'}}>
                        {alocados.map(e => <span key={e.id} style={{fontSize:'11px', background:'#e0f2fe', color:'#0369a1', padding:'2px 6px', borderRadius:'12px', fontWeight:'bold', border:'1px solid #bae6fd'}}>{e.tecnicoNome}</span>)}
                      </div>
                    ) : <div style={{fontSize:'11px', color:'#999', marginTop:'5px'}}>Sem profissionais.</div>}
                  </div>
                  
                  <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
                    <button onClick={(e) => { e.stopPropagation(); ativarRaioBusca(usf); }} style={{flex:1, background:'white', color: COR_MARCA, border:`1px solid ${COR_MARCA}`, padding:'6px', borderRadius:'4px', cursor:'pointer', fontSize:'11px', fontWeight:'bold'}}>📡 Raio (1.5km)</button>
                    {perfilUsuario === 'ADMIN' && (
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setUbsSelecionada(usf); 
                        setTecnicosParaEscala([]); 
                        setModalEscalaOpen(true); 
                      }} style={{flex:1, background: COR_MARCA, color:'white', border:'none', padding:'6px', borderRadius:'4px', cursor:'pointer', fontSize:'11px', fontWeight:'bold'}}>📅 Escalar Equipe</button>
                    )}
                  </div>

                  {perfilUsuario === 'ADMIN' && (
                    <div style={{marginTop: '5px'}}>
                      {idDeslocamentoAberto === `ubs-${usf.id}` ? (
                        <div style={{background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px', borderRadius: '4px'}} onClick={(e) => e.stopPropagation()}>
                          <div style={{fontSize: '11px', color: '#b91c1c', fontWeight: 'bold', marginBottom: '4px'}}>Gerar Chamado para: {usf.nome}</div>
                          
                          <select value={alvoDeslocamento} onChange={e => { e.stopPropagation(); setAlvoDeslocamento(e.target.value); }} style={{width: '100%', padding: '6px', fontSize: '11px', marginBottom: '6px', backgroundColor: 'white', color: '#333', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none'}}>
                            <option value="">Puxar qual técnico?...</option>
                            {[...tecnicos].sort((a,b)=>a.nome.localeCompare(b.nome)).map(t => {
                               const local = statusTecnicos.get(t.id);
                               const txt = local ? `(Em: ${local})` : `(LIVRE ✅)`;
                               return <option key={t.id} value={t.id}>{t.nome} {txt}</option>
                            })}
                          </select>

                          <textarea 
                            placeholder="Motivo / Chamado. Ex: TKT-123 Sem rede..."
                            value={obsChamado}
                            onChange={e => { e.stopPropagation(); setObsChamado(e.target.value); }}
                            style={{width: '100%', padding: '6px', fontSize: '11px', marginBottom: '6px', backgroundColor: 'white', color: '#333', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', resize: 'vertical', minHeight: '40px', fontFamily: 'inherit'}}
                            onClick={(e) => e.stopPropagation()}
                          />

                          <div style={{display: 'flex', gap: '5px'}}>
                            <button onClick={(e) => { e.stopPropagation(); efetuarDeslocamento(alvoDeslocamento, usf.id); }} style={{flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'}}>Deslocar Agora</button>
                            <button onClick={(e) => { e.stopPropagation(); setIdDeslocamentoAberto(null); setObsChamado(""); }} style={{background: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer'}}>X</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setIdDeslocamentoAberto(`ubs-${usf.id}`); }} style={{width: '100%', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}>
                          <PhoneCall size={12}/> Gerar Chamado para esta Unidade
                        </button>
                      )}
                    </div>
                  )}

                  {analiseRaio && analiseRaio.ubsId === usf.id && (
                    <div style={{marginTop:'12px', maxHeight:'220px', overflowY:'auto', borderTop:'1px solid #eee', paddingTop: '10px'}} onClick={(e) => e.stopPropagation()}>
                      <strong style={{fontSize:'12px', color: COR_MARCA}}>Profissionais no Raio:</strong>
                      {analiseRaio.lista.length > 0 ? (
                        <ul style={{listStyle:'none', padding:0, margin:'5px 0 0 0', fontSize:'12px'}}>
                          {analiseRaio.lista.map((t, i) => (
                            <li key={i} style={{padding:'8px 0', borderBottom: '1px dashed #eee'}}>
                              <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                  <div style={{width: '8px', height: '8px', borderRadius: '50%', background: t.ocupado ? '#ef4444' : '#10b981', flexShrink: 0}}></div>
                                  <strong style={{color: '#1e293b'}}>{t.nome}</strong> 
                                  <span style={{color: '#94a3b8', fontSize: '11px'}}>({t.distancia.toFixed(1)} km)</span>
                                </div>
                                
                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: '14px', marginTop: '4px', gap: '4px'}}>
                                  <span style={{fontSize: '10px', fontWeight: 'bold', color: t.ocupado ? '#ef4444' : '#10b981'}}>
                                    {t.ocupado ? `↳ Em missão: ${t.ubsAlocada}` : '↳ LIVRE ✅'}
                                  </span>
                                  
                                  {perfilUsuario === 'ADMIN' && (
                                    <div style={{display: 'flex', gap: '4px', width: '100%', marginTop: '2px'}}>
                                      <button onClick={(e) => { e.stopPropagation(); setUbsSelecionada(usf); setTecnicosParaEscala([String(t.id)]); setModalEscalaOpen(true); }} style={{flex: 1, background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'}}>
                                        📅 Escalar
                                      </button>

                                      {idDeslocamentoAberto !== `raio-${t.id}` && (
                                         <button onClick={(e) => { e.stopPropagation(); setIdDeslocamentoAberto(`raio-${t.id}`); }} style={{flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'}}>
                                            🚨 Deslocar
                                         </button>
                                      )}
                                    </div>
                                  )}

                                  {idDeslocamentoAberto === `raio-${t.id}` && (
                                    <div style={{marginTop: '4px', width: '100%'}} onClick={(e) => e.stopPropagation()}>
                                       <textarea 
                                          placeholder="Motivo / Chamado. Ex: TKT-123..."
                                          value={obsChamado}
                                          onChange={e => { e.stopPropagation(); setObsChamado(e.target.value); }}
                                          style={{width: '100%', padding: '6px', fontSize: '10px', marginBottom: '4px', backgroundColor: 'white', color: '#333', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', resize: 'vertical', minHeight: '35px', fontFamily: 'inherit', boxSizing: 'border-box'}}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <div style={{display: 'flex', gap: '4px'}}>
                                          <button onClick={(e) => { e.stopPropagation(); efetuarDeslocamento(t.id, usf.id); }} style={{flex: 1, background: COR_MARCA, color: 'white', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'}}>Confirmar</button>
                                          <button onClick={(e) => { e.stopPropagation(); setIdDeslocamentoAberto(null); setObsChamado(""); }} style={{background: '#e2e8f0', color: '#475569', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer'}}>X</button>
                                        </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : <div style={{fontSize:'11px', color:'#ef4444', fontStyle:'italic', marginTop:'5px'}}>Nenhum técnico neste raio.</div>}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {tecnicos.map((tec: any) => {
          const lat = coordNum(tec.lat);
          const lng = coordNum(tec.lng);
          if (isNaN(lat) || isNaN(lng)) return null;

          if (filtroRegiao !== 'TODAS' && getRegiaoTecnico(tec) !== filtroRegiao) {
             return null; 
          }

          const historico = escalas.filter(e => Number(e.tecnicoId) === tec.id).sort((a,b) => new Date(b.dataFim).getTime() - new Date(a.dataFim).getTime());
          const alocacaoAtual = historico.find(e => {
             const hoje = new Date().toISOString().split('T')[0];
             return hoje >= e.dataInicio && hoje <= e.dataFim;
          }) || historico[0]; 

          return (
            <Marker key={`tec-${tec.id}`} position={[lat, lng]} icon={iconTecnico}>
              <Popup minWidth={280} className="custom-popup">
                <div style={{color: '#334155', fontFamily: 'inherit', padding: '4px'}}>
                  
                  <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px'}}>
                    <div style={{background:'#f1f5f9', padding:'8px', borderRadius:'8px', color: '#009ee3'}}>
                      <Users size={20} />
                    </div>
                    <div>
                      <strong style={{fontSize:'13px', color: '#0f172a', display: 'block'}}>{tec.nome}</strong>
                      {alocacaoAtual ? (
                        <span style={{fontSize:'10px', color:'#ef4444', fontWeight:'600'}}>📍 Em missão</span>
                      ) : (
                        <span style={{fontSize:'10px', color:'#10b981', fontWeight:'600'}}>✅ Disponível</span>
                      )}
                    </div>
                  </div>
                  
                  {alocacaoAtual && (
                    <div style={{background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', marginBottom: '12px'}}>
                        <div style={{fontSize:'10px', color:'#64748b', fontWeight:'bold', marginBottom:'4px'}}>ALOCAÇÃO ATUAL</div>
                        <div style={{fontSize:'12px', color:'#1e293b', fontWeight:'600'}}>{alocacaoAtual.ubsNome}</div>
                        <div style={{fontSize:'11px', color:'#64748b', marginTop:'2px'}}><Clock size={10} style={{display:'inline', marginRight:'2px'}}/> {formatarData(alocacaoAtual.dataInicio)} - {formatarData(alocacaoAtual.dataFim)}</div>
                    </div>
                  )}

                  {perfilUsuario === 'ADMIN' && (
                    <div style={{display:'flex', gap:'8px', marginBottom:'15px', position: 'relative'}}>
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setUbsSelecionada(null); 
                        setTecnicosParaEscala([String(tec.id)]); 
                        setModalEscalaOpen(true); 
                      }} style={{flex:1, background: 'white', color: COR_MARCA, border:`1px solid ${COR_MARCA}`, padding:'6px', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:'600', transition: 'all 0.2s'}}>
                        📅 Escalar
                      </button>

                      {idDeslocamentoAberto === `tec-${tec.id}` ? (
                        <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px', borderRadius: '6px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: '8px'}} onClick={(e) => e.stopPropagation()}>
                          <div style={{fontSize: '11px', color: '#b91c1c', fontWeight: 'bold', marginBottom: '6px'}}>Enviar para:</div>
                          
                          <select value={alvoDeslocamento} onChange={e => { e.stopPropagation(); setAlvoDeslocamento(e.target.value); }} style={{width: '100%', padding: '8px', fontSize: '11px', marginBottom: '8px', backgroundColor: 'white', color: '#333', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', cursor: 'pointer'}}>
                            <option value="">Escolha a UBS de destino...</option>
                            {[...usfs].sort((a,b)=>a.nome.localeCompare(b.nome)).map(u => (
                               <option key={u.id} value={u.id}>{u.nome}</option>
                            ))}
                          </select>

                          <textarea 
                            placeholder="Motivo / Chamado. Ex: TKT-123..."
                            value={obsChamado}
                            onChange={e => { e.stopPropagation(); setObsChamado(e.target.value); }}
                            style={{width: '100%', padding: '8px', fontSize: '11px', marginBottom: '8px', backgroundColor: 'white', color: '#333', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', resize: 'vertical', minHeight: '45px', fontFamily: 'inherit', boxSizing: 'border-box'}}
                            onClick={(e) => e.stopPropagation()}
                          />

                          <div style={{display: 'flex', gap: '6px'}}>
                            <button onClick={(e) => { e.stopPropagation(); efetuarDeslocamento(tec.id, alvoDeslocamento); }} style={{flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'}}>Deslocar</button>
                            <button onClick={(e) => { e.stopPropagation(); setIdDeslocamentoAberto(null); setObsChamado(""); }} style={{background: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'}}>X</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setIdDeslocamentoAberto(`tec-${tec.id}`); }} style={{flex:1, background: 'white', color: '#ef4444', border:'1px solid #ef4444', padding:'6px', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:'600', transition: 'all 0.2s'}}>
                          🚨 Deslocar
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{fontSize:'10px', color:'#94a3b8', fontWeight:'bold', marginBottom:'6px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase'}}><History size={12}/> HISTÓRICO RECENTE:</div>
                  <div style={{maxHeight: '110px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '6px', padding: '4px', background: '#f8fafc'}}>
                      {historico.length > 0 ? historico.slice(0,5).map((h, i) => (
                          <div key={i} style={{fontSize:'11px', padding:'6px 8px', borderBottom: i !== historico.slice(0,5).length - 1 ? '1px solid #f1f5f9' : 'none'}}>
                              <strong style={{color: '#334155'}}>{h.ubsNome}</strong><br/>
                              <span style={{color:'#64748b', fontSize: '10px'}}>{formatarData(h.dataInicio)} até {formatarData(h.dataFim)}</span>
                          </div>
                      )) : <div style={{fontSize:'11px', color:'#94a3b8', padding:'8px', textAlign: 'center'}}>Nenhum registo.</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}