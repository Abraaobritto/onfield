import { useState, useEffect } from 'react';
import { X, Calendar, Search, Users, Save, Check, MapPin } from 'lucide-react';

interface ModalEscalaProps {
  isOpen: boolean;
  onClose: () => void;
  ubsSelecionada: any;
  listaUsfs?: any[]; 
  tecnicos: any[];
  escalas?: any[]; 
  tecnicosPreSelecionados?: string[]; 
  onSave: (tecnicosIds: string[], inicio: string, fim: string, ubsFinal: any) => void | Promise<void>;
}

export function ModalEscala({ isOpen, onClose, ubsSelecionada, listaUsfs, tecnicos, escalas = [], tecnicosPreSelecionados = [], onSave }: ModalEscalaProps) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [busca, setBusca] = useState('');
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState<string[]>([]);
  const [ubsLocal, setUbsLocal] = useState<any>(null); // Estado para controlar a UBS na tela

  useEffect(() => {
    if (isOpen) {
      setInicio('');
      setFim('');
      setBusca('');
      setTecnicosSelecionados(tecnicosPreSelecionados || []); 
      setUbsLocal(ubsSelecionada && ubsSelecionada.id ? ubsSelecionada : null);
    }
  }, [isOpen, tecnicosPreSelecionados, ubsSelecionada]);

  if (!isOpen) return null;

  const statusTecnicos = new Map(); 
  escalas.forEach((e: any) => { 
    const hoje = new Date().toISOString().split('T')[0];
    if (hoje >= e.dataInicio && hoje <= e.dataFim) {
      statusTecnicos.set(Number(e.tecnicoId), e.ubsNome); 
    }
  });

  const toggleTecnico = (tecId: string) => {
    if (tecnicosSelecionados.includes(tecId)) {
      setTecnicosSelecionados(tecnicosSelecionados.filter(id => id !== tecId));
    } else {
      setTecnicosSelecionados([...tecnicosSelecionados, tecId]);
    }
  };

  const handleSalvar = () => {
    if (!inicio || !fim) return alert("Preencha as datas corretamente!");
    if (tecnicosSelecionados.length === 0) return alert("Selecione pelo menos um profissional!");
    if (!ubsLocal || !ubsLocal.id) return alert("Selecione a Unidade (UBS) de destino!");
    
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    if (d2 < d1) return alert("A data final não pode ser antes da inicial!");

    onSave(tecnicosSelecionados, inicio, fim, ubsLocal);
  };

  const tecnicosFiltrados = tecnicos.filter(t => t.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', width: '500px', maxWidth: '95%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', fontFamily: 'inherit' }}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', borderRadius: '8px 8px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: '85%' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Nova Programação</h2>
              
              {/* 👇 CAIXA DE UBS SEMPRE VISÍVEL 👇 */}
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', backgroundColor: '#f8fafc' }}>
                <MapPin size={16} color="#009ee3" style={{ marginRight: '8px' }} />
                <select 
                  value={ubsLocal?.id || ""}
                  onChange={(e) => setUbsLocal(listaUsfs?.find(u => String(u.id) === e.target.value))}
                  disabled={!!(ubsSelecionada && ubsSelecionada.id)} // Trava se abriu direto do mapa da UBS
                  style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent', color: '#1e293b', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  <option value="">Selecione a Unidade (UBS) de destino...</option>
                  {listaUsfs?.sort((a,b)=>a.nome.localeCompare(b.nome)).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
          </div>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase' }}>DATA INICIAL</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#ffffff' }}>
                <Calendar size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ border: 'none', outline: 'none', width: '100%', color: '#334155', backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase' }}>DATA FINAL</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#ffffff' }}>
                <Calendar size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ border: 'none', outline: 'none', width: '100%', color: '#334155', backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>
              PROFISSIONAIS SELECIONADOS ({tecnicosSelecionados.length})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '45px', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
              {tecnicosSelecionados.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>Nenhum técnico selecionado.</span>
              ) : (
                tecnicosSelecionados.map(id => {
                  const tec = tecnicos.find(t => t.id.toString() === id);
                  return tec ? (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      <Users size={12} /> {tec.nome}
                      <button onClick={() => toggleTecnico(id)} style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginLeft: '5px' }}><X size={10} strokeWidth={3} /></button>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>ESCOLHER EQUIPE</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px', backgroundColor: '#ffffff' }}>
              <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
              <input type="text" placeholder="Buscar profissional pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', backgroundColor: 'transparent', color: '#334155', fontFamily: 'inherit' }} />
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {tecnicosFiltrados.map((tec: any) => {
                const isSelected = tecnicosSelecionados.includes(tec.id.toString());
                const ubsAlocada = statusTecnicos.get(tec.id); 
                
                return (
                  <div key={tec.id} onClick={() => toggleTecnico(tec.id.toString())} style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSelected ? '#f0fdf4' : 'white', transition: 'background 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontSize: '13px', color: isSelected ? '#166534' : '#334155', fontWeight: isSelected ? '600' : '500' }}>{tec.nome}</span>
                       <span style={{ fontSize: '10px', fontWeight: 'bold', color: ubsAlocada ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                          {ubsAlocada ? `Em missão: ${ubsAlocada}` : 'LIVRE ✅'}
                       </span>
                    </div>
                    {isSelected && <Check size={16} color="#16a34a" />}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
          <button onClick={onClose} style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSalvar} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#009ee3', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
            <Save size={16} /> Confirmar Escala
          </button>
        </div>

      </div>
    </div>
  );
}