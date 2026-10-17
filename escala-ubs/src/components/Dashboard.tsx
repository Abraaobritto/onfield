import { useState } from 'react';
import { 
  Users, Activity, Map as MapIcon, Briefcase, CheckCircle2, TrendingUp, 
  AlertCircle, BarChart2, ShieldCheck, CalendarDays, Award, Download, MapPin
} from 'lucide-react';

interface DashboardProps {
  usfs: any[];
  tecnicos: any[];
  escalas: any[];
}

export function Dashboard({ usfs, tecnicos, escalas }: DashboardProps) {
  // ============================================================================
  // 1. FILTRO DE TEMPO GLOBAL E PERSONALIZADO
  // ============================================================================
  const [filtroTempo, setFiltroTempo] = useState<'HOJE' | 'SEMANA' | 'MES' | 'CUSTOM'>('SEMANA');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');

  const getFiltroDatas = () => {
    const hojeObj = new Date();
    const tzOffset = hojeObj.getTimezoneOffset() * 60000;
    const localNow = new Date(hojeObj.getTime() - tzOffset);
    
    let dInicio = new Date(localNow);
    let dFim = new Date(localNow);

    if (filtroTempo === 'HOJE') {
      // Fica igual ao dia de hoje
    } else if (filtroTempo === 'SEMANA') {
      dInicio.setDate(localNow.getDate() - 7);
    } else if (filtroTempo === 'MES') {
      dInicio.setDate(localNow.getDate() - 30);
    } else if (filtroTempo === 'CUSTOM') {
      return {
        inicioIso: customInicio || localNow.toISOString().split('T')[0],
        fimIso: customFim || localNow.toISOString().split('T')[0],
        hojeIso: localNow.toISOString().split('T')[0]
      };
    }

    return {
      inicioIso: dInicio.toISOString().split('T')[0],
      fimIso: dFim.toISOString().split('T')[0],
      hojeIso: localNow.toISOString().split('T')[0]
    };
  };

  const { inicioIso, fimIso, hojeIso } = getFiltroDatas();

  // Filtra as escalas reais que acontecem/aconteceram dentro desse período
  const escalasFiltradas = escalas.filter(e => {
    return e.dataInicio <= fimIso && e.dataFim >= inicioIso;
  });

  // 👇 REGRA OPERACIONAL: Filtro para excluir PIV (Porte 4) dos gráficos de produtividade 👇
  const escalasProdutividadeDinamica = escalasFiltradas.filter(e => {
    const ubsRelacionada = usfs.find(u => String(u.id) === String(e.ubsId));
    if (ubsRelacionada && (ubsRelacionada.porte === 'Porte 4' || ubsRelacionada.porte === 'IV')) {
        return false; // Remove da contagem de produtividade
    }
    return true; // Mantém as outras (PI)
  });

  // ============================================================================
  // 2. PROCESSAMENTO DOS DADOS GERAIS DO PERÍODO
  // ============================================================================
  const chamados = escalasFiltradas.filter(e => e.isChamado);
  const escalasRegulares = escalasFiltradas.filter(e => !e.isChamado);

  // Considera ALL escalasFiltradas para o total de Alocados (técnico de PIV não pode parecer "Livre")
  const tecnicosAlocadosIds = new Set(escalasFiltradas.map(e => e.tecnicoId));
  const tecnicosAlocadosCount = tecnicosAlocadosIds.size;
  const tecnicosLivresCount = tecnicos.length - tecnicosAlocadosCount;

  const totalUnidades = usfs.length;
  const ubsCobertasIds = new Set(escalasRegulares.map(e => e.ubsId));
  const ubsCobertasCount = ubsCobertasIds.size;
  const coberturaPerc = totalUnidades > 0 ? Math.round((ubsCobertasCount / totalUnidades) * 100) : 0;

  const chamadosFinalizados = chamados.filter(c => c.dataFim < hojeIso).length;
  const chamadosEmAndamento = chamados.filter(c => c.dataFim >= hojeIso).length;
  const chamadosTotais = chamados.length;

  // ============================================================================
  // 3. RANKING DE ATENDIMENTOS POR TÉCNICO (MOSTRA TODOS OS 20)
  // ============================================================================
  const rankingTecnicos = tecnicos.map(t => {
    // Usa escalasProdutividadeDinamica (sem PIV) para contar os pontos
    const escalasDoTecnico = escalasProdutividadeDinamica.filter(e => Number(e.tecnicoId) === t.id);
    const regularesCount = escalasDoTecnico.filter(e => !e.isChamado).length;
    const chamadosCount = escalasDoTecnico.filter(e => e.isChamado).length;
    
    const ubsNomesArray = Array.from(new Set(escalasDoTecnico.map(e => e.ubsNome)));
    const ubsDistintas = ubsNomesArray.length;
    const totalAtendimentos = regularesCount + chamadosCount;

    return {
      id: t.id,
      nome: t.nome,
      regulares: regularesCount,
      chamados: chamadosCount,
      ubsDistintas: ubsDistintas,
      ubsNomes: ubsNomesArray.join(', '),
      total: totalAtendimentos
    };
  }).sort((a, b) => b.total - a.total); // Ordena quem trabalhou mais para cima. O .filter() foi removido para mostrar os zeros!

  // ============================================================================
  // 4. RANKING DE UBS MAIS DEMANDADAS (Sem PIV)
  // ============================================================================
  const rankingUbs = usfs.map(u => {
    // Ignora UBS Porte 4 no ranking dinâmico
    if (u.porte === 'Porte 4' || u.porte === 'IV') {
      return { id: u.id, nome: u.nome, totalVisitas: 0, chamados: 0, rotina: 0 };
    }

    const visitasNaUbs = escalasProdutividadeDinamica.filter(e => String(e.ubsId) === String(u.id));
    return {
      id: u.id,
      nome: u.nome,
      totalVisitas: visitasNaUbs.length,
      chamados: visitasNaUbs.filter(v => v.isChamado).length,
      rotina: visitasNaUbs.filter(v => !v.isChamado).length
    };
  }).filter(u => u.totalVisitas > 0).sort((a, b) => b.totalVisitas - a.totalVisitas).slice(0, 5);

  // ============================================================================
  // 5. AGRUPAMENTOS PARA OS GRÁFICOS (ZONA E PRIORIDADE)
  // ============================================================================
  const getZona = (id: number) => {
    if (id >= 100 && id < 200) return 'Leste';
    if (id >= 200 && id < 300) return 'Norte';
    if (id >= 300 && id < 400) return 'Sul';
    if (id >= 400 && id < 500) return 'Oeste';
    return 'Outras';
  };

  const ubsPorZona = { Norte: 0, Sul: 0, Leste: 0, Oeste: 0 };
  const cobPorZona = { Norte: 0, Sul: 0, Leste: 0, Oeste: 0 };
  
  usfs.forEach(u => { const z = getZona(Number(u.id)) as keyof typeof ubsPorZona; if (ubsPorZona[z] !== undefined) ubsPorZona[z]++; });
  escalasRegulares.forEach(e => { const z = getZona(Number(e.ubsId)) as keyof typeof cobPorZona; if (cobPorZona[z] !== undefined) cobPorZona[z]++; });

  const prioAtivos = { Baixa: 0, Média: 0, Alta: 0, Urgente: 0 };
  chamados.forEach(c => {
    const ubsRelacionada = usfs.find(u => String(u.id) === String(c.ubsId));
    if (ubsRelacionada) {
      if (ubsRelacionada.prioridade === 'Baixa') prioAtivos.Baixa++;
      else if (ubsRelacionada.prioridade === 'Média') prioAtivos.Média++;
      else if (ubsRelacionada.prioridade === 'Alta') prioAtivos.Alta++;
      else prioAtivos.Urgente++;
    } else {
      prioAtivos.Urgente++; 
    }
  });

  const totalTecs = tecnicos.length || 1; 
  const degCampo = (tecnicosAlocadosCount / totalTecs) * 360;
  const degDisp = (tecnicosLivresCount / totalTecs) * 360;
  const donutGradient = `conic-gradient(#009ee3 0deg ${degCampo}deg, #10b981 ${degCampo}deg ${degCampo + degDisp}deg, #cbd5e1 ${degCampo + degDisp}deg 360deg)`;

  const MiniCard = ({ titulo, valor, icone, cor, subtitulo }: any) => (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titulo}</span>
          <h3 style={{ margin: '5px 0 0 0', fontSize: '28px', color: '#0f172a', lineHeight: '1' }}>{valor}</h3>
        </div>
        <div style={{ background: `${cor}15`, padding: '10px', borderRadius: '10px', color: cor }}>
          {icone}
        </div>
      </div>
      {subtitulo && <p style={{ margin: 'auto 0 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>{subtitulo}</p>}
    </div>
  );

  return (
    <div style={{ padding: '30px', height: '100%', overflowY: 'auto', backgroundColor: '#f8fafc', fontFamily: 'inherit' }}>
      
      {/* ========================================== */}
      {/* CABEÇALHO E FILTROS DIRETORIA                */}
      {/* ========================================== */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '26px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800' }}>
            <BarChart2 size={28} color="#009ee3" /> Painel de Inteligência Executiva
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Monitoramento Operacional, Tickets e Produtividade baseados em dados reais.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '5px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '0 10px', color: '#64748b' }}><CalendarDays size={18}/></div>
            <button onClick={() => setFiltroTempo('HOJE')} style={{ border: 'none', background: filtroTempo === 'HOJE' ? '#009ee3' : 'transparent', color: filtroTempo === 'HOJE' ? 'white' : '#64748b', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Hoje</button>
            <button onClick={() => setFiltroTempo('SEMANA')} style={{ border: 'none', background: filtroTempo === 'SEMANA' ? '#009ee3' : 'transparent', color: filtroTempo === 'SEMANA' ? 'white' : '#64748b', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>7 Dias</button>
            <button onClick={() => setFiltroTempo('MES')} style={{ border: 'none', background: filtroTempo === 'MES' ? '#009ee3' : 'transparent', color: filtroTempo === 'MES' ? 'white' : '#64748b', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Mês</button>
            <button onClick={() => setFiltroTempo('CUSTOM')} style={{ border: 'none', background: filtroTempo === 'CUSTOM' ? '#f59e0b' : 'transparent', color: filtroTempo === 'CUSTOM' ? 'white' : '#64748b', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Personalizado</button>
          </div>

          {filtroTempo === 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '10px', background: 'white', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              <input type="date" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '12px', outline: 'none' }} />
              <span style={{ color: '#64748b', fontSize: '12px', alignSelf: 'center' }}>até</span>
              <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '12px', outline: 'none' }} />
            </div>
          )}

          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <Download size={14} /> Exportar Relatório (PDF)
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* LINHA 1: OPERAÇÃO GERAL E COBERTURA */}
      {/* ========================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <MiniCard titulo="Total Técnicos" valor={tecnicos.length} cor="#334155" icone={<Users size={20}/>} subtitulo="Base cadastrada" />
        <MiniCard titulo="Alocados" valor={tecnicosAlocadosCount} cor="#009ee3" icone={<Briefcase size={20}/>} subtitulo={`${Math.round((tecnicosAlocadosCount/totalTecs)*100)}% ativos no período`} />
        <MiniCard titulo="Livres / Base" valor={tecnicosLivresCount} cor="#10b981" icone={<CheckCircle2 size={20}/>} subtitulo="Sem escala neste período" />
        
        <MiniCard titulo="Total Unidades" valor={totalUnidades} cor="#64748b" icone={<MapIcon size={20}/>} subtitulo="USFs mapeadas" />
        <MiniCard titulo="Unid. Visitadas" valor={ubsCobertasCount} cor="#8b5cf6" icone={<ShieldCheck size={20}/>} subtitulo="Atendimentos regulares no período" />
        <MiniCard titulo="Taxa Cobertura" valor={`${coberturaPerc}%`} cor="#8b5cf6" icone={<TrendingUp size={20}/>} subtitulo={`${totalUnidades - ubsCobertasCount} unidades sem visita`} />
      </div>

      {/* ========================================== */}
      {/* LINHA 2: TICKETS E PRODUTIVIDADE REFEITA */}
      {/* ========================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        
        {/* Bloco Tickets */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#1e293b', textTransform: 'uppercase', fontWeight: 'bold' }}>Status de Chamados (Urgências no Período)</h3>
          <div style={{ display: 'flex', gap: '25px', flex: 1, alignItems: 'center' }}>
            <div style={{ flex: 1, borderRight: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', marginBottom: '8px' }}><AlertCircle size={14} /> <span style={{ fontSize: '11px', fontWeight: 'bold' }}>TOTAIS ABERTOS</span></div>
              <h3 style={{ margin: 0, fontSize: '32px', color: '#0f172a' }}>{chamadosTotais}</h3>
            </div>
            <div style={{ flex: 1, borderRight: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', marginBottom: '8px' }}><Activity size={14} /> <span style={{ fontSize: '11px', fontWeight: 'bold' }}>PENDENTES</span></div>
              <h3 style={{ margin: 0, fontSize: '32px', color: '#f59e0b' }}>{chamadosEmAndamento}</h3>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', marginBottom: '8px' }}><CheckCircle2 size={14} /> <span style={{ fontSize: '11px', fontWeight: 'bold' }}>FINALIZADOS</span></div>
              <h3 style={{ margin: 0, fontSize: '32px', color: '#10b981' }}>{chamadosFinalizados}</h3>
            </div>
          </div>
        </div>

        {/* Tabela Refinada: Atendimentos por Profissional */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', maxHeight: '250px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#1e293b', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#f59e0b"/> Produtividade: Atendimentos por Profissional (Dinâmico)
          </h3>
          
          <div style={{ overflowY: 'auto', paddingRight: '5px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', color: '#64748b', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <tr>
                  <th style={{ padding: '10px 5px', borderBottom: '1px solid #e2e8f0' }}>Técnico</th>
                  <th style={{ padding: '10px 5px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#ef4444' }}>Chamados</th>
                  <th style={{ padding: '10px 5px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Escalas</th>
                  <th style={{ padding: '10px 5px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Total</th>
                  <th style={{ padding: '10px 5px', borderBottom: '1px solid #e2e8f0' }}>Unidades Visitadas</th>
                </tr>
              </thead>
              <tbody>
                {rankingTecnicos.length > 0 ? rankingTecnicos.map((tec, idx) => (
                  <tr key={tec.id} style={{ background: tec.total === 0 ? '#f8fafc' : 'transparent', opacity: tec.total === 0 ? 0.6 : 1 }}>
                    <td style={{ padding: '10px 5px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: tec.total > 0 ? '#1e293b' : '#94a3b8' }}>
                      {idx + 1}. {tec.nome} {tec.total === 0 && <span style={{fontSize:'10px', fontWeight:'normal'}}>(PIV ou Livre)</span>}
                    </td>
                    <td style={{ padding: '10px 5px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{tec.chamados}</td>
                    <td style={{ padding: '10px 5px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#0369a1', fontWeight: 'bold' }}>{tec.regulares}</td>
                    <td style={{ padding: '10px 5px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#1e293b', fontWeight: '800' }}>{tec.total}</td>
                    <td style={{ padding: '10px 5px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '11px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tec.ubsNomes}>
                      {tec.total > 0 ? <span><strong style={{color:'#10b981'}}>{tec.ubsDistintas} UBS:</strong> {tec.ubsNomes}</span> : '-'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      Nenhum atendimento registrado neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* LINHA 3: GRÁFICOS ANALÍTICOS                 */}
      {/* ========================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        
        {/* WIDGET: TOP 5 UNIDADES MAIS DEMANDADAS */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#1e293b', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="#009ee3"/> Top 5: Unidades com Maior Demanda
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {rankingUbs.length > 0 ? rankingUbs.map((ubs, index) => (
              <div key={ubs.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#cbd5e1' }}>#{index + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>{ubs.nome}</div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#64748b' }}>
                    <span style={{color: '#ef4444'}}><b>{ubs.chamados}</b> urgências</span>
                    <span>•</span>
                    <span style={{color: '#0369a1'}}><b>{ubs.rotina}</b> rotinas</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  {ubs.totalVisitas}
                </div>
              </div>
            )) : (
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '20px' }}>Nenhuma visita registrada no período.</p>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: COBERTURA POR ZONA */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 25px 0', fontSize: '14px', color: '#1e293b', textTransform: 'uppercase', fontWeight: 'bold' }}>Visitas Regulares por Zona</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {[
              { nome: 'Zona Norte', cob: cobPorZona.Norte, total: ubsPorZona.Norte, cor: '#3b82f6' },
              { nome: 'Zona Leste', cob: cobPorZona.Leste, total: ubsPorZona.Leste, cor: '#8b5cf6' },
              { nome: 'Zona Sul', cob: cobPorZona.Sul, total: ubsPorZona.Sul, cor: '#10b981' },
              { nome: 'Zona Oeste', cob: cobPorZona.Oeste, total: ubsPorZona.Oeste, cor: '#f59e0b' }
            ].map(z => {
              const perc = z.total > 0 ? Math.round((z.cob / z.total) * 100) : 0;
              return (
                <div key={z.nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                    <span>{z.nome}</span>
                    <span style={{ color: '#64748b' }}>{z.cob} / {z.total} <span style={{ color: z.cor, marginLeft: '5px' }}>({perc}%)</span></span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: '14px', borderRadius: '7px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(perc, 2)}%`, background: z.cor, height: '100%', borderRadius: '7px', transition: 'width 1s ease' }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* GRÁFICO 3: STATUS DA EQUIPE E PRIORIDADE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Status Equipe Donut Compacto */}
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#1e293b', textTransform: 'uppercase', fontWeight: 'bold' }}>Força de Trabalho</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#009ee3' }}></div> Alocados ({tecnicosAlocadosCount})</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }}></div> Livres/Base ({tecnicosLivresCount})</div>
              </div>
            </div>
            <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: donutGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{tecnicos.length}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flex: 1 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#1e293b', textTransform: 'uppercase', fontWeight: 'bold' }}>Prioridade dos Chamados</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '80px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              {[
                { label: 'Baixa', val: prioAtivos.Baixa, cor: '#10b981' },
                { label: 'Média', val: prioAtivos.Média, cor: '#f59e0b' },
                { label: 'Alta', val: prioAtivos.Alta, cor: '#ef4444' },
                { label: 'Urgente', val: prioAtivos.Urgente, cor: '#7f1d1d' }
              ].map(item => {
                const max = Math.max(prioAtivos.Baixa, prioAtivos.Média, prioAtivos.Alta, prioAtivos.Urgente, 1);
                const heightStr = `${Math.max((item.val / max) * 60, 5)}px`; 
                return (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '20%' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: item.val > 0 ? '#1e293b' : '#94a3b8' }}>{item.val}</span>
                    <div style={{ width: '100%', maxWidth: '35px', background: item.cor, height: heightStr, borderRadius: '4px 4px 0 0', opacity: item.val > 0 ? 1 : 0.3, transition: 'height 0.5s ease' }}></div>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}