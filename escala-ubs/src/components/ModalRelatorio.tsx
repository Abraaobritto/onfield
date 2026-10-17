import { useState, useEffect } from 'react';
import { X, Camera, Users, Pencil, Trash2, Mail, Send, PhoneCall, UserPlus, Settings, Calendar, MapPin, Check, Search, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  escalas: any[]; 
  onDelete: (id: string) => void | Promise<void>;
  onEdit: (ids: string[], inicio: string, fim: string, ubsNome: string) => void;
  listaUsfs: any[]; 
  perfilUsuario: string; 
  tecnicos: any[]; 
  onRefresh: () => void; 
}

export function ModalRelatorio({ isOpen, onClose, escalas, onDelete, onEdit, listaUsfs, perfilUsuario, tecnicos, onRefresh }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [abaAtual, setAbaAtual] = useState<'escalas' | 'chamados'>('escalas');

  const [modalEquipe, setModalEquipe] = useState(false);
  const [novoTecNome, setNovoTecNome] = useState('');
  const [novoTecLat, setNovoTecLat] = useState('');
  const [novoTecLng, setNovoTecLng] = useState('');
  const [salvandoTec, setSalvandoTec] = useState(false);

  const [modalNovaEscala, setModalNovaEscala] = useState(false);
  const [neUbsId, setNeUbsId] = useState('');
  const [neInicio, setNeInicio] = useState('');
  const [neFim, setNeFim] = useState('');
  const [neBuscaTec, setNeBuscaTec] = useState('');
  const [neTecnicos, setNeTecnicos] = useState<string[]>([]);
  const [salvandoEscala, setSalvandoEscala] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(''); 

  const [modalEdicaoMassa, setModalEdicaoMassa] = useState(false);
  const [emMassaInicio, setEmMassaInicio] = useState('');
  const [emMassaFim, setEmMassaFim] = useState('');

  useEffect(() => {
    if (modalNovaEscala) {
      setNeUbsId(''); setNeInicio(''); setNeFim(''); setNeBuscaTec(''); setNeTecnicos([]); setMsgSucesso('');
    }
  }, [modalNovaEscala]);

  if (!isOpen) return null;

  const escalasFiltradas = escalas.filter((e: any) => abaAtual === 'escalas' ? !e.isChamado : e.isChamado);
  const dadosAgrupados = escalasFiltradas.reduce((acc: any[], curr: any) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
    const dataInicioFormatada = new Date(curr.dataInicio).toLocaleDateString('pt-BR', options);
    const dataFimFormatada = new Date(curr.dataFim).toLocaleDateString('pt-BR', options);
    const ubsOriginal = listaUsfs.find(u => Number(u.id) === Number(curr.ubsId));
    
    let porteRomano = ubsOriginal?.porte === 'Porte 4' ? 'IV' : 'I';
    let distrito = '-';
    if (ubsOriginal) {
      const idNum = Number(ubsOriginal.id);
      if (idNum >= 100 && idNum < 200) distrito = 'LESTE';
      else if (idNum >= 200 && idNum < 300) distrito = 'NORTE';
      else if (idNum >= 300 && idNum < 400) distrito = 'SUL';
      else if (idNum >= 400 && idNum < 500) distrito = 'OESTE';
    }

    const chave = `${curr.ubsId}-${curr.dataInicio}-${curr.dataFim}`;
    const existente = acc.find((item: any) => item.chave === chave);

    if (existente) {
      existente.tecnicos.push({ id: curr.id, nome: curr.tecnicoNome });
      existente.ids.push(curr.id);
    } else {
      acc.push({
        chave, ubsNome: curr.ubsNome, distrito, porteRomano, isUrgente: ubsOriginal?.prioridade === 'Alta',
        dataInicioRaw: curr.dataInicio, dataFimRaw: curr.dataFim, dataInicioTexto: dataInicioFormatada,
        dataFimTexto: dataFimFormatada, tecnicos: [{ id: curr.id, nome: curr.tecnicoNome }], ids: [curr.id],
        observacao: curr.observacao
      });
    }
    return acc;
  }, []);

  const linhasOrdenadas = [...dadosAgrupados].sort((a, b) => {
    if (a.porteRomano === 'IV' && b.porteRomano !== 'IV') return -1;
    if (a.porteRomano !== 'IV' && b.porteRomano === 'IV') return 1;
    return 0;
  });

  const handleSalvarEdicaoMassa = async () => {
    if (!emMassaInicio || !emMassaFim) return alert("Por favor, preencha as duas datas!");
    if (!window.confirm("ATENÇÃO: Essa ação vai alterar as datas de Início e Fim para TODOS os técnicos escalados. Deseja continuar?")) return;
    
    setSalvandoEscala(true);
    try {
       const todosIdsDaEscala = escalas.filter(e => !e.isChamado).map(e => e.id);
       
       for (const id of todosIdsDaEscala) {
           await fetch(`http://localhost:3001/api/escalas/${id}`, { 
               method: 'PUT', 
               headers: {'Content-Type': 'application/json'}, 
               body: JSON.stringify({ dataInicio: emMassaInicio, dataFim: emMassaFim }) 
           });
       }
       alert("✅ Datas atualizadas com sucesso para toda a escala!");
       setModalEdicaoMassa(false);
       onRefresh();
    } catch (e) { 
       alert("Erro ao atualizar as datas em massa."); 
    } finally { 
       setSalvandoEscala(false); 
    }
  };

  const excluirLinha = (tecnicosLista: any[]) => {
    if (window.confirm(`Deseja remover ${tecnicosLista.length} profissional(is) desta escala?`)) {
      tecnicosLista.forEach(t => onDelete(t.id));
    }
  };

  const dispararEmailSilencioso = async (assunto: string, htmlMensagem: string, destinatario: string = '', tecnicosNomes: string[] = []) => {
    setEnviando(true);
    try {
      const response = await fetch('http://localhost:3001/api/enviar-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario, assunto, mensagem: htmlMensagem, tecnicosNomes })
      });
      if (response.ok) alert('✅ E-mail enviado com sucesso pelo sistema!');
      else alert(`❌ Erro de envio.`);
    } catch (error) { alert('❌ Erro de conexão com o servidor.'); } 
    finally { setEnviando(false); }
  };

  const enviarRelatorioCompleto = () => {
    let htmlCorpo = `<div style="font-family: Arial, sans-serif; color: #333;"><h2 style="color: #009ee3;">Programação Consolidada - Onfield Technology</h2><table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;"><tr style="background-color: #b4c6e7;"><th>UNIDADE</th><th>PERÍODO</th><th>PROFISSIONAIS</th></tr>`;
    linhasOrdenadas.forEach(linha => {
      const nomes = linha.tecnicos.map((t: any) => t.nome).join(', ');
      htmlCorpo += `<tr><td><strong>${linha.ubsNome}</strong><br/><small>Porte ${linha.porteRomano}</small></td><td style="text-align: center;">${linha.dataInicioTexto} até ${linha.dataFimTexto}</td><td>${nomes}</td></tr>`;
    });
    htmlCorpo += `</table></div>`;
    dispararEmailSilencioso('Relatório Geral de Escalas - Onfield', htmlCorpo, 'gestao@onfield.com.br');
  };

  const enviarEmailIndividual = (linha: any) => {
    const arrayNomes = linha.tecnicos.map((t: any) => t.nome);
    const htmlCorpo = `<div style="font-family: Arial, sans-serif; color: #333;"><h2 style="color: #009ee3;">Aviso de Escala - Onfield Technology</h2><div style="background: #f8fafc; padding: 15px; border-left: 4px solid #009ee3; margin: 10px 0;"><p>📍 <strong>Unidade:</strong> ${linha.ubsNome} (Porte ${linha.porteRomano})</p><p>📅 <strong>Período:</strong> ${linha.dataInicioTexto} até ${linha.dataFimTexto}</p><p>👷 <strong>Equipe Alocada:</strong><br/>${arrayNomes.join(', ')}</p></div></div>`;
    dispararEmailSilencioso(`Escala Confirmada: ${linha.ubsNome}`, htmlCorpo, '', arrayNomes);
  };

  const gerarPNG = () => {
    setIsExporting(true);
    setTimeout(() => {
      const elemento = document.getElementById('tabela-relatorio');
      if (elemento) {
        html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
          const link = document.createElement('a'); link.download = `Escala_Onfield.png`; link.href = canvas.toDataURL('image/png'); link.click(); setIsExporting(false);
        });
      }
    }, 150);
  };

  const exportarImagemMobile = async () => {
    const elementoMobile = document.getElementById('whatsapp-export-mobile');
    if (!elementoMobile) return;

    try {
      elementoMobile.style.left = '0';
      elementoMobile.style.top = '0';
      elementoMobile.style.zIndex = '-100';

      const canvas = await html2canvas(elementoMobile, {
        backgroundColor: '#ffffff', 
        scale: 4,
        logging: false,
        useCORS: true,
        width: elementoMobile.offsetWidth,
        height: elementoMobile.offsetHeight
      });

      elementoMobile.style.left = '-9999px';

      const link = document.createElement('a');
      link.download = `Escala_Onfield_WhatsApp.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      alert("Erro ao gerar imagem para o WhatsApp.");
    }
  };

  const handleSalvarNovoTecnico = async () => {
    if (!novoTecNome || !novoTecLat || !novoTecLng) return alert('Preencha todos os campos!');
    setSalvandoTec(true);
    try {
      const res = await fetch('http://localhost:3001/api/tecnicos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoTecNome.toUpperCase().trim(), lat: parseFloat(novoTecLat.replace(',', '.')), lng: parseFloat(novoTecLng.replace(',', '.')) })
      });
      if (res.ok) {
        alert('✅ Técnico cadastrado com sucesso!');
        setNovoTecNome(''); setNovoTecLat(''); setNovoTecLng('');
        onRefresh(); 
      } else alert('❌ Erro ao salvar.');
    } catch (e) { alert('❌ Erro de conexão com servidor.'); } 
    finally { setSalvandoTec(false); }
  };

  const handleExcluirTecnico = async (idTec: number, nomeTec: string) => {
    if(window.confirm(`ATENÇÃO: Deseja realmente excluir o técnico ${nomeTec} do sistema?`)) {
      try {
        await fetch(`http://localhost:3001/api/tecnicos/${idTec}`, { method: 'DELETE' });
        alert('Técnico removido com sucesso!');
        onRefresh(); 
      } catch (error) { alert('Erro ao excluir técnico.'); }
    }
  };

  const toggleNeTecnico = (tecId: string) => {
    if (neTecnicos.includes(tecId)) setNeTecnicos(neTecnicos.filter(id => id !== tecId));
    else setNeTecnicos([...neTecnicos, tecId]);
  };

  const handleSalvarNovaEscalaGeral = async () => {
    if (!neInicio || !neFim) return alert("Preencha as datas da programação primeiro!");
    if (!neUbsId) return alert("Selecione a Unidade (UBS)!");
    if (neTecnicos.length === 0) return alert("Selecione pelo menos um técnico!");
    
    const d1 = new Date(neInicio); const d2 = new Date(neFim);
    if (d2 < d1) return alert("A data final não pode ser antes da inicial!");

    const ubsSelecionadaGeral = listaUsfs.find(u => u.id.toString() === neUbsId);
    if (!ubsSelecionadaGeral) return;

    setSalvandoEscala(true);
    const diasCalculados = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;

    try {
      for (const tId of neTecnicos) {
        const tecnicoObj = tecnicos.find(t => t.id.toString() === tId);
        if (tecnicoObj) {
          await fetch('http://localhost:3001/api/escalas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tecnicoId: tecnicoObj.id, tecnicoNome: tecnicoObj.nome,
              ubsId: ubsSelecionadaGeral.id, ubsNome: ubsSelecionadaGeral.nome,
              dataInicio: neInicio, dataFim: neFim, dias: diasCalculados,
              isChamado: ubsSelecionadaGeral.prioridade === 'Alta'
            })
          });
        }
      }
      
      onRefresh(); 
      setMsgSucesso(`✅ Escala salva na ${ubsSelecionadaGeral.nome}! Pode escolher a próxima.`);
      setNeUbsId(''); setNeTecnicos([]); setNeBuscaTec('');
      setTimeout(() => setMsgSucesso(''), 4000);

    } catch (error) { alert("Erro ao criar escala."); }
    finally { setSalvandoEscala(false); }
  };

  const ubsOrdenadas = [...listaUsfs].sort((a,b) => a.nome.localeCompare(b.nome));
  const tecnicosNeFiltrados = tecnicos.filter(t => t.nome.toLowerCase().includes(neBuscaTec.toLowerCase())).sort((a,b) => a.nome.localeCompare(b.nome));

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '95%', height: '90%', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', fontFamily: 'inherit' }}>
        
        <div className="no-print" style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#009ee3"/> Painel Gerencial
          </h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {perfilUsuario === 'ADMIN' && (
              <>
                <button onClick={() => setModalNovaEscala(true)} style={{ background: '#009ee3', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}>
                  <Calendar size={14} /> Nova Escala (Em Lote)
                </button>
                <button onClick={() => setModalEquipe(true)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}>
                  <Settings size={14} /> Gerenciar Equipe
                </button>
              </>
            )}
            <button onClick={enviarRelatorioCompleto} disabled={enviando} style={{ background: enviando ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: enviando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}>
              <Send size={14} /> {enviando ? 'Enviando...' : 'Enviar Geral'}
            </button>
            <button onClick={gerarPNG} style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}>
              <Camera size={14} /> Salvar PNG
            </button>
            <button onClick={exportarImagemMobile} style={{ background: '#25D366', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}>
              <Send size={14} /> Salvar p/ WhatsApp
            </button>
            <button onClick={onClose} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 20px' }}>
          <button onClick={() => setAbaAtual('escalas')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px', background: 'none', border: 'none', borderBottom: abaAtual === 'escalas' ? '3px solid #009ee3' : '3px solid transparent', color: abaAtual === 'escalas' ? '#009ee3' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Users size={16} /> Escalas Regulares
          </button>
          <button onClick={() => setAbaAtual('chamados')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px', background: 'none', border: 'none', borderBottom: abaAtual === 'chamados' ? '3px solid #ef4444' : '3px solid transparent', color: abaAtual === 'chamados' ? '#ef4444' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
            <PhoneCall size={16} /> Relatório de Chamados
          </button>
        </div>

        <div id="tabela-relatorio" className="print-area" style={{ flex: 1, overflowY: 'auto', padding: '40px', background: 'white' }}>
          <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img src="/logo-onfield.png" alt="Onfield" style={{ height: '85px', objectFit: 'contain' }} />
            <h3 style={{ margin: 0, color: abaAtual === 'escalas' ? '#009ee3' : '#ef4444' }}>
              {abaAtual === 'escalas' ? '' : 'Registro de Chamados (Urgência)'}
            </h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'inherit', color: '#000' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th colSpan={3} style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>ESCALA OFICIAL</th>
                
                <th colSpan={2} style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    PROGRAMAÇÃO
                    {!isExporting && perfilUsuario === 'ADMIN' && abaAtual === 'escalas' && (
                      <button onClick={() => setModalEdicaoMassa(true)} style={{ marginTop: '6px', background: '#009ee3', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <Calendar size={12} /> Editar Datas de Todos
                      </button>
                    )}
                  </div>
                </th>
                
                <th style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px' }}></th>
                {!isExporting && perfilUsuario === 'ADMIN' && <th className="no-print" style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px' }}></th>}
              </tr>
              <tr>
                <th style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', width: '10%', color: '#000' }}>DISTRITO</th>
                <th style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', width: '25%', color: '#000' }}>UNIDADE</th>
                <th style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', width: '8%', color: '#000' }}>PORTE</th>
                <th style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', width: '12%', color: '#000' }}>Início</th>
                <th style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', width: '12%', color: '#000' }}>Fim</th>
                <th style={{ backgroundColor: '#b4c6e7', border: '1px solid black', padding: '8px', textAlign: 'center', width: '28%', color: '#000' }}>Técnicos Alocados</th>
                {!isExporting && perfilUsuario === 'ADMIN' && <th className="no-print" style={{ backgroundColor: '#f1f5f9', border: '1px solid black', padding: '8px', textAlign: 'center', width: '5%', color: '#000' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {linhasOrdenadas.map((linha, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', backgroundColor: '#e2efda', fontWeight: 'bold' }}>{linha.distrito}</td>
                  <td style={{ border: '1px solid black', padding: '10px', textAlign: 'left' }}><div style={{ fontWeight: 'bold' }}>{linha.ubsNome}</div></td>
                  <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center' }}>{linha.porteRomano}</td>
                  <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center' }}>{linha.dataInicioTexto}</td>
                  <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center' }}>{linha.dataFimTexto}</td>
                  <td style={{ border: '1px solid black', padding: '10px', textAlign: 'left', fontWeight: '500' }}>
                    {linha.tecnicos.map((t: any) => t.nome).join(' • ')}
                    
                    {abaAtual === 'chamados' && linha.observacao && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '11px', color: '#92400e' }}>
                        <strong>📝 Obs do Chamado:</strong> {linha.observacao}
                      </div>
                    )}
                  </td>
                  {!isExporting && perfilUsuario === 'ADMIN' && (
                    <td className="no-print" style={{ border: '1px solid black', padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => enviarEmailIndividual(linha)} disabled={enviando} title="Enviar E-mail" style={{ background: enviando ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Mail size={14} /></button>
                        <button onClick={() => onEdit(linha.ids, linha.dataInicioRaw, linha.dataFimRaw, linha.ubsNome)} title="Editar" style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Pencil size={14} /></button>
                        <button onClick={() => excluirLinha(linha.tecnicos)} title="Excluir" style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LAYOUT WHATSAPP */}
        <div 
          id="whatsapp-export-mobile" 
          style={{ 
            position: 'absolute', 
            left: '-9999px', 
            background: 'white', 
            padding: '15px', 
            width: 'max-content' 
          }}
        >
          <table style={{ borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '14px', color: 'black', width: 'max-content', whiteSpace: 'nowrap' }}>
            <tbody>
              <tr>
                <td colSpan={2} style={{ border: '1px solid black', padding: '5px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                  <img src="/logo-onfield.png" alt="Onfield" style={{ height: '60px', objectFit: 'contain' }} />
                </td>
                <td colSpan={4} style={{ border: '1px solid black', backgroundColor: '#e2e2e2' }}></td>
              </tr>
              
              <tr style={{ backgroundColor: '#c9daf8', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'left' }}>
                  RIO NEGRO E RIO SOLIMÕES: {abaAtual === 'escalas' ? 'Escala de Técnicos' : 'Chamados Urgentes'}
                </td>
                <td colSpan={2} style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center' }}>PROGRAMAÇÃO</td>
                <td style={{ border: '1px solid black', padding: '6px 8px' }}></td>
              </tr>
              
              <tr style={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }}>
                <td style={{ border: '1px solid black', padding: '6px 12px' }}>DISTRITO</td>
                <td style={{ border: '1px solid black', padding: '6px 12px' }}>UNIDADE</td>
                <td style={{ border: '1px solid black', padding: '6px 12px' }}>PORTE</td>
                <td style={{ border: '1px solid black', padding: '6px 12px' }}>Início</td>
                <td style={{ border: '1px solid black', padding: '6px 12px' }}>Fim</td>
                <td style={{ border: '1px solid black', padding: '6px 12px' }}>Técnicos Alocados</td>
              </tr>
              
              {linhasOrdenadas.map((linha, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid black', padding: '4px 12px', textAlign: 'center', backgroundColor: '#d9ead3', fontWeight: 'bold' }}>
                    {linha.distrito}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px 12px', textAlign: 'center' }}>
                    {linha.ubsNome}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px 12px', textAlign: 'center' }}>
                    {linha.porteRomano}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px 12px', textAlign: 'center' }}>
                    {linha.dataInicioTexto}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px 12px', textAlign: 'center' }}>
                    {linha.dataFimTexto}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px 12px', textAlign: 'left' }}>
                    {linha.tecnicos.map((t: any) => t.nome).join('/')}
                    {abaAtual === 'chamados' && linha.observacao && ` (Obs: ${linha.observacao})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* --- SUB-MODAL: ALTERAR DATAS EM MASSA --- */}
      {modalEdicaoMassa && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '8px', width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', fontFamily: 'inherit' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="#009ee3"/> Alterar Datas de Todos
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
              Defina a nova data de início e fim. Isso vai ser aplicado automaticamente para <strong>todos os técnicos da Escala Regular</strong> (não altera os chamados).
            </p>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>NOVO INÍCIO</label>
                <input type="date" value={emMassaInicio} onChange={e => setEmMassaInicio(e.target.value)} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>NOVO FIM</label>
                <input type="date" value={emMassaFim} onChange={e => setEmMassaFim(e.target.value)} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalEdicaoMassa(false)} style={{ padding: '10px 15px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={handleSalvarEdicaoMassa} disabled={salvandoEscala} style={{ padding: '10px 20px', borderRadius: '4px', border: 'none', background: '#009ee3', color: 'white', fontWeight: 'bold', cursor: salvandoEscala ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
                {salvandoEscala ? 'Atualizando...' : 'Atualizar Todas as Datas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-MODAL: GERENCIAR EQUIPE --- */}
      {modalEquipe && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#f8fafc', padding: '0', borderRadius: '8px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', fontFamily: 'inherit' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '8px 8px 0 0' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color="#f59e0b"/> Gerenciar Equipe Técnica</h3>
              <button onClick={() => setModalEquipe(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20}/></button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#009ee3', display: 'flex', alignItems: 'center', gap: '5px' }}><UserPlus size={14}/> ADICIONAR NOVO PROFISSIONAL</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" value={novoTecNome} onChange={e => setNovoTecNome(e.target.value)} placeholder="NOME COMPLETO (Ex: JOÃO SILVA)" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', textTransform: 'uppercase', fontSize: '12px', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={novoTecLat} onChange={e => setNovoTecLat(e.target.value)} placeholder="Latitude (Ex: -3.123)" style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '12px', fontFamily: 'inherit' }} />
                    <input type="text" value={novoTecLng} onChange={e => setNovoTecLng(e.target.value)} placeholder="Longitude (Ex: -60.123)" style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '12px', fontFamily: 'inherit' }} />
                  </div>
                  <button onClick={handleSalvarNovoTecnico} disabled={salvandoTec} style={{ background: '#009ee3', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: salvandoTec ? 'not-allowed' : 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>{salvandoTec ? 'Salvando...' : 'Cadastrar no Banco de Dados'}</button>
                </div>
              </div>

              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}><Trash2 size={14}/> EXCLUIR PROFISSIONAIS ({tecnicos.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                  {[...tecnicos].sort((a,b)=>a.nome.localeCompare(b.nome)).map(tec => (
                    <div key={tec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>{tec.nome}</span>
                      <button onClick={() => handleExcluirTecnico(tec.id, tec.nome)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'inherit' }}><Trash2 size={12}/> Excluir</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-MODAL: NOVA ESCALA EM LOTE --- */}
      {modalNovaEscala && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '0', borderRadius: '8px', width: '550px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', fontFamily: 'inherit' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderRadius: '8px 8px 0 0' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={20} color="#009ee3"/> Escala em Lote</h3>
              <button onClick={() => setModalNovaEscala(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20}/></button>
            </div>
            
            {msgSucesso && (
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '12px 20px', borderBottom: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                <CheckCircle2 size={18} /> {msgSucesso}
              </div>
            )}

            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DATA INICIAL DA SEMANA</label>
                  <input type="date" value={neInicio} onChange={e => setNeInicio(e.target.value)} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DATA FINAL DA SEMANA</label>
                  <input type="date" value={neFim} onChange={e => setNeFim(e.target.value)} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}><MapPin size={14}/> SELECIONE A UNIDADE (UBS)</label>
                <select value={neUbsId} onChange={e => setNeUbsId(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '13px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="">Escolha a UBS...</option>
                  {ubsOrdenadas.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>TÉCNICOS SELECIONADOS ({neTecnicos.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', minHeight: '40px', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                  {neTecnicos.length === 0 ? <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum selecionado.</span> : neTecnicos.map(id => {
                    const tec = tecnicos.find(t => t.id.toString() === id);
                    return tec ? (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {tec.nome} <button onClick={() => toggleNeTecnico(id)} style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', display: 'flex' }}><X size={12}/></button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>ESCOLHER EQUIPE</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', marginBottom: '10px', backgroundColor: '#ffffff' }}>
                  <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                  <input type="text" placeholder="Buscar profissional..." value={neBuscaTec} onChange={e => setNeBuscaTec(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', backgroundColor: '#ffffff', color: '#1e293b', fontFamily: 'inherit' }} />
                </div>
                
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {tecnicosNeFiltrados.map((tec: any) => {
                    const isSelected = neTecnicos.includes(tec.id.toString());
                    return (
                      <div key={tec.id} onClick={() => toggleNeTecnico(tec.id.toString())} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSelected ? '#f0fdf4' : '#ffffff' }}>
                        <span style={{ fontSize: '12px', color: isSelected ? '#166534' : '#334155', fontWeight: isSelected ? 'bold' : 'normal' }}>{tec.nome}</span>
                        {isSelected && <Check size={14} color="#16a34a" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 8px 8px', alignItems: 'center' }}>
              <button onClick={() => setModalNovaEscala(false)} style={{ padding: '10px 15px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Concluir / Fechar</button>
              <button onClick={handleSalvarNovaEscalaGeral} disabled={salvandoEscala} style={{ padding: '10px 20px', borderRadius: '4px', border: 'none', background: '#009ee3', color: 'white', fontWeight: 'bold', cursor: salvandoEscala ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
                <CheckCircle2 size={16} /> {salvandoEscala ? 'Salvando...' : 'Salvar e Próxima UBS'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}