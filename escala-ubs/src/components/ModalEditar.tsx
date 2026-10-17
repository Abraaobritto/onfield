import { useState, useEffect } from 'react';
import { X, Calendar, Search, Users, Save, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dadosIniciais: { ids: string[]; inicio: string; fim: string; ubsNome: string } | null;
  onSave: (ids: string[], inicio: string, fim: string) => void | Promise<void>;
}

export function ModalEditar({ isOpen, onClose, dadosIniciais, onSave }: Props) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [busca, setBusca] = useState('');
  
  const [tecnicosBanco, setTecnicosBanco] = useState<any[]>([]);
  const [escalasAntigas, setEscalasAntigas] = useState<any[]>([]);
  const [ubsIdAtual, setUbsIdAtual] = useState<number | null>(null);

  const [tecnicosSelecionados, setTecnicosSelecionados] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen && dadosIniciais) {
      setInicio(dadosIniciais.inicio);
      setFim(dadosIniciais.fim);
      setBusca('');

      Promise.all([
        fetch('http://localhost:3001/api/tecnicos').then(r => r.json()),
        fetch('http://localhost:3001/api/escalas').then(r => r.json())
      ]).then(([tecsData, escalasData]) => {
        setTecnicosBanco(tecsData);

        const escalasDestaEdicao = escalasData.filter((e: any) => dadosIniciais.ids.includes(e.id));
        setEscalasAntigas(escalasDestaEdicao);

        if (escalasDestaEdicao.length > 0) {
          setUbsIdAtual(escalasDestaEdicao[0].ubsId);
          const idsTecnicos = escalasDestaEdicao.map((e: any) => Number(e.tecnicoId));
          setTecnicosSelecionados(idsTecnicos);
        }
      });
    }
  }, [isOpen, dadosIniciais]);

  if (!isOpen || !dadosIniciais) return null;

  const toggleTecnico = (tecId: number) => {
    if (tecnicosSelecionados.includes(tecId)) {
      setTecnicosSelecionados(tecnicosSelecionados.filter(id => id !== tecId));
    } else {
      setTecnicosSelecionados([...tecnicosSelecionados, tecId]);
    }
  };

  const handleSalvarTudo = async () => {
    if (!inicio || !fim) return alert("Preencha as datas corretamente!");
    if (tecnicosSelecionados.length === 0) return alert("Selecione pelo menos um técnico!");
    if (!ubsIdAtual) return alert("Erro ao identificar a UBS. Feche e tente novamente.");

    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    if (d2 < d1) return alert("A data final não pode ser antes da inicial!");
    const diasCalculados = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000*3600*24)) + 1;

    const idsTecsOriginais = escalasAntigas.map(e => Number(e.tecnicoId));

    const removidos = escalasAntigas.filter(e => !tecnicosSelecionados.includes(Number(e.tecnicoId)));
    for (const esc of removidos) {
      await fetch(`http://localhost:3001/api/escalas/${esc.id}`, { method: 'DELETE' });
    }

    const novosAdicionados = tecnicosSelecionados.filter(id => !idsTecsOriginais.includes(id));
    for (const idTec of novosAdicionados) {
      const tecnicoObj = tecnicosBanco.find(t => t.id === idTec);
      if (tecnicoObj) {
        await fetch('http://localhost:3001/api/escalas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tecnicoId: idTec,
            tecnicoNome: tecnicoObj.nome,
            ubsId: ubsIdAtual,
            ubsNome: dadosIniciais.ubsNome,
            dataInicio: inicio,
            dataFim: fim,
            dias: diasCalculados
          })
        });
      }
    }

    const mantidosIds = escalasAntigas
      .filter(e => tecnicosSelecionados.includes(Number(e.tecnicoId)))
      .map(e => e.id);

    onSave(mantidosIds, inicio, fim); 
  };

  const tecnicosFiltrados = tecnicosBanco.filter(t => t.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', width: '500px', maxWidth: '95%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px 8px 0 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Editar Programação</h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#009ee3', fontWeight: 'bold' }}>{dadosIniciais.ubsNome}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DATA INICIAL</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#ffffff' }}>
                <Calendar size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', color: '#334155', backgroundColor: 'transparent', colorScheme: 'light' }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DATA FINAL</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#ffffff' }}>
                <Calendar size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', color: '#334155', backgroundColor: 'transparent', colorScheme: 'light' }} />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>
              PROFISSIONAIS ALOCADOS ({tecnicosSelecionados.length})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
              {tecnicosSelecionados.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum técnico selecionado.</span>
              ) : (
                tecnicosSelecionados.map(id => {
                  const tec = tecnicosBanco.find(t => t.id === id);
                  return tec ? (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      <Users size={12} /> {tec.nome}
                      <button onClick={() => toggleTecnico(id)} style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginLeft: '5px' }}>
                        <X size={10} strokeWidth={3} />
                      </button>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>ALTERAR EQUIPE</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px', backgroundColor: '#ffffff' }}>
              <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
              <input type="text" placeholder="Buscar profissional pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', backgroundColor: 'transparent', color: '#334155' }} />
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {tecnicosFiltrados.map((tec: any) => {
                const isSelected = tecnicosSelecionados.includes(tec.id);
                return (
                  <div key={tec.id} onClick={() => toggleTecnico(tec.id)} style={{ padding: '10px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSelected ? '#f0fdf4' : 'white', transition: 'background 0.2s' }}>
                    <span style={{ fontSize: '13px', color: isSelected ? '#166534' : '#334155', fontWeight: isSelected ? '600' : '400' }}>{tec.nome}</span>
                    {isSelected && <Check size={16} color="#16a34a" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc', borderRadius: '0 0 8px 8px' }}>
          <button onClick={onClose} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSalvarTudo} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#009ee3', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <Save size={16} /> Salvar Edição
          </button>
        </div>

      </div>
    </div>
  );
}