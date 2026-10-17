import { useState, useEffect } from 'react';
import Mapa from './components/Mapa';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard'; // Importamos o novo Dashboard
import { Map as MapIcon, FileText, Menu, X, LogOut, BarChart2 } from 'lucide-react'; // Adicionado BarChart2
import './index.css';

function App() {
  // 👇 MODIFICADO: Agora ele inicia lendo a memória do navegador 👇
  const [usuarioLogado, setUsuarioLogado] = useState<any | null>(() => {
    const usuarioSalvo = localStorage.getItem('onfield_user');
    return usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
  });

  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuAberto, setMenuAberto] = useState(false);
  
  // Controla o que está na tela principal (Mapa ou Dashboard)
  const [telaAtiva, setTelaAtiva] = useState<'MAPA' | 'DASHBOARD'>('MAPA');

  // Estados globais para alimentar o Dashboard
  const [usfsGlobais, setUsfsGlobais] = useState<any[]>([]);
  const [tecnicosGlobais, setTecnicosGlobais] = useState<any[]>([]);
  const [escalasGlobais, setEscalasGlobais] = useState<any[]>([]);

  // 👇 NOVO: Salva ou remove o usuário do localStorage sempre que ele mudar 👇
  useEffect(() => {
    if (usuarioLogado) {
      localStorage.setItem('onfield_user', JSON.stringify(usuarioLogado));
    } else {
      localStorage.removeItem('onfield_user');
    }
  }, [usuarioLogado]);

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 768); if (window.innerWidth >= 768) setMenuAberto(false); };
    window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Busca dados globais para o Dashboard poder analisar a operação
  useEffect(() => {
    if (usuarioLogado) {
      const ts = new Date().getTime();
      fetch(`http://localhost:3001/api/usfs?t=${ts}`).then(r => r.json()).then(setUsfsGlobais).catch(console.error);
      fetch(`http://localhost:3001/api/tecnicos?t=${ts}`).then(r => r.json()).then(setTecnicosGlobais).catch(console.error);
      fetch(`http://localhost:3001/api/escalas?t=${ts}`).then(r => r.json()).then(setEscalasGlobais).catch(console.error);
    }
  }, [usuarioLogado, telaAtiva, relatorioAberto]); // Atualiza sempre que mudar de tela

  if (!usuarioLogado) return <Login onLoginSuccess={setUsuarioLogado} />;

  const abrirRelatorio = () => { setRelatorioAberto(true); if (isMobile) setMenuAberto(false); };
  
  // 👇 MODIFICADO: A função de logout continua limpando o estado (o que já aciona o useEffect para limpar o localStorage)
  const fazerLogout = () => { if (window.confirm('Deseja realmente sair?')) setUsuarioLogado(null); };

  const navegarPara = (tela: 'MAPA' | 'DASHBOARD') => {
    setTelaAtiva(tela);
    if (isMobile) setMenuAberto(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f1f5f9', position: 'relative' }}>
      
      {isMobile && ( <button onClick={() => setMenuAberto(true)} style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 2000, background: '#020817', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Menu size={24} /></button> )}
      {isMobile && menuAberto && ( <div onClick={() => setMenuAberto(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2999 }} /> )}

      <div style={{ width: '280px', background: '#020817', color: 'white', display: 'flex', flexDirection: 'column', zIndex: 3000, position: isMobile ? 'fixed' : 'relative', top: 0, bottom: 0, left: isMobile ? (menuAberto ? '0' : '-280px') : '0', transition: 'left 0.3s ease-in-out', boxShadow: '2px 0 10px rgba(0,0,0,0.1)' }}>
        
        <div style={{ padding: '25px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020817', position: 'relative' }}>
          <img src="/logo-onfield.png" alt="ONFIELD" style={{ width: '100%', maxWidth: '200px', objectFit: 'contain', filter: 'brightness(0) invert(1)', transform: 'scale(1.6)' }} />
          {isMobile && <button onClick={() => setMenuAberto(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8' }}><X size={24} /></button>}
        </div>

        <div style={{ padding: '20px', background: '#0a1128', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{usuarioLogado.nome}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Perfil: {usuarioLogado.perfil}</span>
          </div>
          <button onClick={fazerLogout} title="Sair" style={{ background: '#1e293b', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}><LogOut size={18} /></button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <nav style={{ padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <button onClick={() => navegarPara('MAPA')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 15px', borderRadius: '8px', border: 'none', background: telaAtiva === 'MAPA' ? '#004ce8' : 'transparent', color: 'white', cursor: 'pointer', textAlign: 'left', fontWeight: telaAtiva === 'MAPA' ? '600' : '400', transition: 'all 0.2s' }}>
              <MapIcon size={20} color={telaAtiva === 'MAPA' ? 'white' : '#94a3b8'} /> Mapa Operacional
            </button>
            
            <button onClick={() => navegarPara('DASHBOARD')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 15px', borderRadius: '8px', border: 'none', background: telaAtiva === 'DASHBOARD' ? '#004ce8' : 'transparent', color: 'white', cursor: 'pointer', textAlign: 'left', fontWeight: telaAtiva === 'DASHBOARD' ? '600' : '400', transition: 'all 0.2s' }}>
              <BarChart2 size={20} color={telaAtiva === 'DASHBOARD' ? 'white' : '#94a3b8'} /> Analytics (Dashboard)
            </button>

            <div style={{ height: '1px', background: '#1e293b', margin: '5px 0' }}></div>

            <button onClick={abrirRelatorio} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 15px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
              <FileText size={20} color="#94a3b8" /> Relatório de Escalas
            </button>
          </nav>

          <div style={{ marginTop: 'auto', padding: '25px 20px', borderTop: '1px solid #1e293b', background: '#0a1128' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Legenda do Mapa</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#cbd5e1' }}>
              <div style={{ background: '#e0f2fe', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>👷</div> Técnico em Campo
            </div>
          </div>
        </div>

      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {/* Controle de qual tela mostrar */}
        {telaAtiva === 'MAPA' ? (
          <Mapa relatorioAberto={relatorioAberto} fecharRelatorio={() => setRelatorioAberto(false)} perfilUsuario={usuarioLogado.perfil} />
        ) : (
          <Dashboard usfs={usfsGlobais} tecnicos={tecnicosGlobais} escalas={escalasGlobais} />
        )}
      </div>
    </div>
  );
}

export default App;