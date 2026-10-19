'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Materia,
  TopicoComMateria,
  SessaoEstudo,
  Revisao,
  DificuldadeMateria,
  calcularIndicadorRitmo,
  executarReplanejamento,
  gerarCronogramaAutomatico,
} from '@atlas/core';
import {
  carregarDadosCompletos,
  salvarNovaMateria,
  salvarNovoTopico,
  salvarCronogramaGerado,
  marcarSessaoConcluida,
  persistirReplanejamento,
  marcarRevisaoConcluida,
  excluirContaDefinitiva,
} from '@/lib/api';

export default function AtlasApp() {
  const { user, perfil, signOut, atualizarPerfil, isModoDemo } = useAuth();

  const [dataAtual] = useState(() => new Date().toISOString().split('T')[0]);
  const [dataProva, setDataProva] = useState('2026-11-30');
  const [activeTab, setActiveTab] = useState<'student' | 'subjects' | 'timeline' | 'admin'>('student');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Estados persistidos
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [topicos, setTopicos] = useState<TopicoComMateria[]>([]);
  const [sessoes, setSessoes] = useState<SessaoEstudo[]>([]);
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);

  // Modais de criação
  const [modalMateriaAberto, setModalMateriaAberto] = useState(false);
  const [modalTopicoAberto, setModalTopicoAberto] = useState(false);
  const [materiaSelecionadaParaTopico, setMateriaSelecionadaParaTopico] = useState<string>('');

  // Formulário Nova Matéria
  const [novoNomeMateria, setNovoNomeMateria] = useState('');
  const [novaDificuldadeMateria, setNovaDificuldadeMateria] = useState<DificuldadeMateria>('medio');

  // Formulário Novo Tópico
  const [novoNomeTopico, setNovoNomeTopico] = useState('');

  // 1. Carregar dados ao inicializar
  useEffect(() => {
    if (!user) return;
    async function inicializar() {
      setCarregando(true);
      try {
        const dados = await carregarDadosCompletos(user!.id);
        setMaterias(dados.materias);
        setTopicos(dados.topicos);
        setSessoes(dados.sessoes);
        setRevisoes(dados.revisoes);

        if (perfil?.dataProva) {
          setDataProva(perfil.dataProva);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setCarregando(false);
      }
    }
    inicializar();
  }, [user, perfil]);

  const topicosMap = useMemo(() => new Map(topicos.map((t) => [t.id, t])), [topicos]);

  // Indicador de Ritmo Calculado (RF12)
  const ritmo = useMemo(() => {
    return calcularIndicadorRitmo({
      sessoes,
      dataAtual,
      dataProva,
    });
  }, [sessoes, dataAtual, dataProva]);

  // Sessões e Revisões de Hoje (RF08, RF11)
  const sessoesHoje = useMemo(() => {
    return sessoes.filter((s) => s.dataPlanejada === dataAtual && s.status === 'pendente');
  }, [sessoes, dataAtual]);

  const revisoesHoje = useMemo(() => {
    return revisoes.filter((r) => r.dataAgendada === dataAtual && r.status === 'pendente');
  }, [revisoes, dataAtual]);

  // AÇÃO: Marcar Sessão como Feita (RF09, RF11)
  const handleConcluirSessao = async (sessaoId: string) => {
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (!sessao || !user) return;

    try {
      const novasRevisoes = await marcarSessaoConcluida(sessaoId, user.id, sessao.topicoId, dataAtual);

      setSessoes((prev) =>
        prev.map((s) => (s.id === sessaoId ? { ...s, status: 'feita', dataRealizada: new Date().toISOString() } : s))
      );
      setTopicos((prev) =>
        prev.map((t) => (t.id === sessao.topicoId ? { ...t, status: 'concluido' } : t))
      );
      setRevisoes((prev) => [...prev, ...novasRevisoes]);

      setToastMessage('Sessão concluída com êxito. O ciclo de quatro revisões espaçadas foi inscrito em seu cronograma.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Erro ao registrar: ${err.message}`);
    }
  };

  // AÇÃO: Marcar Não fiz hoje com Replanejamento Imediato < 1s (RF10, RNF04)
  const handleNaoFizHoje = async (sessaoId: string) => {
    if (!user) return;
    const inicio = performance.now();

    try {
      const horasPorDia = perfil?.horasPorDia || { seg: 3, ter: 3, qua: 3, qui: 3, sex: 3, sab: 4, dom: 0 };
      const resultado = executarReplanejamento({
        sessaoFalhadaId: sessaoId,
        dataAtual,
        dataProva,
        horasPorDia: horasPorDia as any,
        todasSessoes: sessoes,
        topicosMap,
      });

      setSessoes(resultado.sessoesAtualizadas);
      await persistirReplanejamento(user.id, resultado.sessoesAtualizadas);

      const tempoMs = (performance.now() - inicio).toFixed(1);
      setToastMessage(`Cronograma redistribuído em ${tempoMs}ms. Os tópicos pendentes foram realocados com serenidade.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(`Erro no replanejamento: ${err.message}`);
    }
  };

  // AÇÃO: Concluir Revisão (RF11)
  const handleConcluirRevisao = async (revId: string) => {
    try {
      await marcarRevisaoConcluida(revId);
      setRevisoes((prev) =>
        prev.map((r) => (r.id === revId ? { ...r, status: 'concluida', dataConclusao: new Date().toISOString() } : r))
      );
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // AÇÃO: Gerar Cronograma Automático (RF07)
  const handleGerarCronograma = async () => {
    if (!user) return;
    if (topicos.length === 0) {
      alert('Cadastre disciplinas e tópicos antes de orquestrar seu cronograma.');
      return;
    }

    const horasPorDia = perfil?.horasPorDia || { seg: 3, ter: 3, qua: 3, qui: 3, sex: 3, sab: 4, dom: 0 };
    const novasSessoes = gerarCronogramaAutomatico({
      usuarioId: user.id,
      topicos,
      dataInicio: dataAtual,
      dataProva,
      horasPorDia: horasPorDia as any,
    });

    try {
      await salvarCronogramaGerado(user.id, novasSessoes);
      setSessoes(novasSessoes);
      setToastMessage('Cronograma estruturado. Os temas de maior exigência receberam prioridade inicial.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  // AÇÃO: Criar Matéria (RF04)
  const handleCriarMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !novoNomeMateria.trim()) return;

    try {
      const nova = await salvarNovaMateria({
        usuarioId: user.id,
        nome: novoNomeMateria.trim(),
        dificuldade: novaDificuldadeMateria,
      });
      setMaterias((prev) => [...prev, nova]);
      setNovoNomeMateria('');
      setModalMateriaAberto(false);
      setToastMessage(`Disciplina "${nova.nome}" incorporada.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(`Erro ao salvar disciplina: ${err.message}`);
    }
  };

  // AÇÃO: Criar Tópico (RF05)
  const handleCriarTopico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !novoNomeTopico.trim() || !materiaSelecionadaParaTopico) return;

    const materiaObj = materias.find((m) => m.id === materiaSelecionadaParaTopico);
    if (!materiaObj) return;

    try {
      const topicosDaMateria = topicos.filter((t) => t.materiaId === materiaSelecionadaParaTopico);
      const novo = await salvarNovoTopico({
        materiaId: materiaSelecionadaParaTopico,
        usuarioId: user.id,
        nome: novoNomeTopico.trim(),
        ordem: topicosDaMateria.length + 1,
        status: 'pendente',
        materia: materiaObj,
      });
      setTopicos((prev) => [...prev, novo]);
      setNovoNomeTopico('');
      setModalTopicoAberto(false);
      setToastMessage(`Tópico "${novo.nome}" adicionado.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(`Erro ao salvar tópico: ${err.message}`);
    }
  };

  // AÇÃO: Exclusão de Conta (RF14)
  const handleExcluirConta = async () => {
    if (!user) return;
    if (confirm('Deseja permanentemente revogar sua conta e apagar todos os registros (RF14)? Essa decisão é irreversível.')) {
      try {
        await excluirContaDefinitiva(user.id);
        alert('Conta e dados foram expurgados.');
        window.location.reload();
      } catch (err: any) {
        alert(`Erro: ${err.message}`);
      }
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment text-graphite">
        <div className="space-y-2 text-center">
          <p className="font-serif text-2xl tracking-tight text-graphite">Atlas</p>
          <p className="text-xs text-ash tracking-wide">Recuperando o diário de estudos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans selection:bg-signal-blue/15 pb-28">

      {/* 1. Header com Floating Nav Pill (General Intelligence Company Style) */}
      <header className="pt-6 px-6 sticky top-0 z-30 flex justify-center">
        <div className="gic-nav-pill px-5 py-2.5 flex items-center justify-between gap-6 max-w-[820px] w-full">
          
          {/* Logo & Símbolo */}
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-lg tracking-tight text-graphite font-normal">
              Atlas
            </span>
            <span className="text-xs text-fog">/</span>
            <span className="text-[13px] text-ash tracking-tight hidden sm:inline">
              caderno de estudos
            </span>
          </div>

          {/* Abas de Navegação */}
          <nav className="flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('student')}
              className={`px-3 py-1 rounded-[6px] transition text-[13px] ${
                activeTab === 'student' ? 'text-graphite bg-mist/40' : 'text-ash hover:text-graphite'
              }`}
            >
              Diário
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-3 py-1 rounded-[6px] transition text-[13px] ${
                activeTab === 'subjects' ? 'text-graphite bg-mist/40' : 'text-ash hover:text-graphite'
              }`}
            >
              Disciplinas ({materias.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1 rounded-[6px] transition text-[13px] ${
                activeTab === 'timeline' ? 'text-graphite bg-mist/40' : 'text-ash hover:text-graphite'
              }`}
            >
              Cronograma ({sessoes.length})
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1 rounded-[6px] transition text-[13px] ${
                activeTab === 'admin' ? 'text-graphite bg-mist/40' : 'text-ash hover:text-graphite'
              }`}
            >
              Métricas
            </button>
          </nav>

          {/* Ações à Direita */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGerarCronograma}
              className="gic-btn-primary text-xs py-1 px-3 hidden md:inline-flex"
            >
              <span>Distribuir</span>
              <span>→</span>
            </button>
            <button
              onClick={() => signOut()}
              className="text-xs text-ash hover:text-graphite transition px-2 py-1"
            >
              Sair
            </button>
          </div>

        </div>
      </header>

      {/* Toast Notification (Discreta e elegante) */}
      {toastMessage && (
        <div className="max-w-[1100px] mx-auto px-6 mt-6">
          <div className="bg-paper border border-mist rounded-[12px] p-4 flex items-center justify-between text-sm shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-signal-blue" />
              <span className="text-graphite">{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-xs text-ash hover:text-graphite">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal — Max-Width 1100px */}
      <main className="max-w-[1100px] mx-auto px-6 mt-12 space-y-12">

        {/* ========================================================================= */}
        {/* ABA 1: DIÁRIO DO ESTUDANTE (DASHBOARD) */}
        {/* ========================================================================= */}
        {activeTab === 'student' && (
          <div className="space-y-12">

            {/* Editorial Hero Statement (Literary display typography) */}
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs uppercase tracking-widest text-ash font-medium">
                Ritmo & Disciplina
              </span>
              <h1 className="gic-heading-lg font-normal text-graphite">
                A disciplina encontra a serenidade do método.
              </h1>
              <p className="text-[15px] text-charcoal leading-relaxed">
                Cada sessão cumprida consolida a memória a longo prazo. Caso o dia fuja ao planejado, o sistema redistribui os tópicos nos próximos períodos sem acúmulo de ansiedade.
              </p>
            </div>

            {/* Card com o Indicador de Ritmo e Contadores Editoriais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Ritmo de Estudos */}
              <div className="gic-card p-5 space-y-2">
                <span className="text-xs text-ash uppercase tracking-wider">Indicador de Ritmo (RF12)</span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-serif text-3xl text-graphite font-normal">
                    {ritmo.status === 'no_prazo' ? 'No prazo' : 'Atrasado'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-signal-blue" />
                </div>
                <p className="text-xs text-ash leading-relaxed">
                  {ritmo.status === 'no_prazo'
                    ? `${ritmo.totalConcluidoAteHoje} de ${ritmo.totalPlanejadoAteHoje} tópicos previstos foram devidamente concluídos.`
                    : `Há tópicos pendentes em relação ao previsto até a data atual.`}
                </p>
              </div>

              {/* Data Limite / Prova */}
              <div className="gic-card p-5 space-y-2">
                <span className="text-xs text-ash uppercase tracking-wider">Data da Prova (RF06)</span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-serif text-3xl text-graphite font-normal">
                    {ritmo.diasAteProva}
                  </span>
                  <span className="text-xs text-ash">dias restantes</span>
                </div>
                <p className="text-xs text-ash">
                  Meta fixada para <strong>{dataProva}</strong>.
                </p>
              </div>

              {/* Conclusão Geral */}
              <div className="gic-card p-5 space-y-2">
                <span className="text-xs text-ash uppercase tracking-wider">Avanço do Plano</span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-serif text-3xl text-graphite font-normal">
                    {ritmo.percentualConcluido}%
                  </span>
                  <span className="text-xs text-ash">concluído</span>
                </div>
                <p className="text-xs text-ash">
                  {ritmo.totalConcluidoAteHoje} de {sessoes.length} sessões totais finalizadas.
                </p>
              </div>

            </div>

            {/* Grid 2 Colunas: Sessões de Hoje & Revisões Espaçadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* Coluna 1: Estudo Novo de Hoje (RF08, RF09, RF10) */}
              <div className="gic-card p-6 space-y-5">
                <div className="flex items-baseline justify-between border-b border-mist pb-4">
                  <div>
                    <span className="text-xs text-ash uppercase tracking-wider">Estudo do Dia (RF08)</span>
                    <h2 className="gic-heading-sm mt-0.5">Tópicos para Hoje</h2>
                  </div>
                  <span className="text-xs text-ash font-medium">
                    {sessoesHoje.length} pendente{sessoesHoje.length === 1 ? '' : 's'}
                  </span>
                </div>

                {sessoesHoje.length === 0 ? (
                  <div className="py-10 text-center space-y-1.5">
                    <p className="font-serif text-lg text-graphite">Tudo cumprido por hoje.</p>
                    <p className="text-xs text-ash max-w-xs mx-auto">
                      Os tópicos previstos para esta data foram concluídos. Novas matérias surgirão amanhã.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessoesHoje.map((sessao) => {
                      const topico = topicosMap.get(sessao.topicoId);
                      if (!topico) return null;
                      return (
                        <div
                          key={sessao.id}
                          className="p-4 rounded-[10px] bg-linen border border-mist/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-ash tracking-tight font-medium">
                                {topico.materia.nome}
                              </span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded border border-mist bg-paper text-ash">
                                {topico.materia.dificuldade}
                              </span>
                            </div>
                            <h4 className="text-sm text-graphite font-medium">{topico.nome}</h4>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => handleNaoFizHoje(sessao.id)}
                              className="gic-btn-secondary text-xs py-1 px-3"
                              title="Redistribui o tópico para os próximos dias sem sobrecarga"
                            >
                              Não fiz hoje
                            </button>
                            <button
                              onClick={() => handleConcluirSessao(sessao.id)}
                              className="gic-btn-primary text-xs py-1 px-3"
                            >
                              <span>Concluir</span>
                              <span>✓</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coluna 2: Revisões Espaçadas de Hoje (RF11) */}
              <div className="gic-card p-6 space-y-5">
                <div className="flex items-baseline justify-between border-b border-mist pb-4">
                  <div>
                    <span className="text-xs text-ash uppercase tracking-wider">Fixação Espaçada (RF11)</span>
                    <h2 className="gic-heading-sm mt-0.5">Revisões Agendadas</h2>
                  </div>
                  <span className="text-xs text-ash font-medium">
                    {revisoesHoje.length} pendente{revisoesHoje.length === 1 ? '' : 's'}
                  </span>
                </div>

                {revisoesHoje.length === 0 ? (
                  <div className="py-10 text-center space-y-1.5">
                    <p className="font-serif text-lg text-graphite">Nenhuma revisão para esta data.</p>
                    <p className="text-xs text-ash max-w-xs mx-auto">
                      Ao finalizar tópicos de estudo, revisões são agendadas para 1, 3, 7 e 15 dias.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revisoesHoje.map((rev) => {
                      const topico = topicosMap.get(rev.topicoId);
                      if (!topico) return null;
                      return (
                        <div
                          key={rev.id}
                          className="p-4 rounded-[10px] bg-linen border border-mist/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-ash font-medium">
                                {topico.materia.nome}
                              </span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded border border-signal-blue/40 text-signal-blue bg-paper">
                                R{rev.intervaloDias} ({rev.intervaloDias} dia{rev.intervaloDias > 1 ? 's' : ''})
                              </span>
                            </div>
                            <h4 className="text-sm text-graphite font-medium">{topico.nome}</h4>
                          </div>

                          <button
                            onClick={() => handleConcluirRevisao(rev.id)}
                            className="gic-btn-primary text-xs py-1 px-3 self-end sm:self-auto"
                          >
                            <span>Revisado</span>
                            <span>✓</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Ajuste de Data da Prova */}
            <div className="gic-card p-6 bg-paper border border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-md">
                <span className="text-xs uppercase tracking-wider text-ash">Configuração do Ciclo</span>
                <p className="text-sm text-graphite">
                  Data Limite da Prova: <strong>{dataProva}</strong> ({ritmo.diasAteProva} dias restantes).
                </p>
                <p className="text-xs text-ash leading-relaxed">
                  Ajustar a data recalcula as janelas de distribuição respeitando sua disponibilidade semanal.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={dataProva}
                  onChange={(e) => {
                    setDataProva(e.target.value);
                    atualizarPerfil({ dataProva: e.target.value });
                  }}
                  className="gic-input text-xs"
                />
                <button
                  onClick={handleGerarCronograma}
                  className="gic-btn-secondary text-xs"
                >
                  Recalcular Cronograma
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: DISCIPLINAS & TÓPICOS (RF04, RF05, RF13) */}
        {/* ========================================================================= */}
        {activeTab === 'subjects' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-mist pb-6">
              <div>
                <span className="text-xs uppercase tracking-wider text-ash">Catálogo Acadêmico</span>
                <h1 className="gic-heading font-normal mt-1">Disciplinas & Conteúdo</h1>
                <p className="text-sm text-ash mt-1">
                  Organize suas matérias por nível de exigência pedagógica para a correta priorização no tempo.
                </p>
              </div>
              <button
                onClick={() => setModalMateriaAberto(true)}
                className="gic-btn-primary text-xs"
              >
                <span>+ Nova Disciplina</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materias.map((mat) => {
                const topicosMat = topicos.filter((t) => t.materiaId === mat.id);
                return (
                  <div key={mat.id} className="gic-card p-5 space-y-4">
                    <div className="flex items-baseline justify-between border-b border-mist pb-3">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-ash">{mat.dificuldade}</span>
                        <h3 className="font-serif text-lg text-graphite font-normal mt-0.5">{mat.nome}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setMateriaSelecionadaParaTopico(mat.id);
                          setModalTopicoAberto(true);
                        }}
                        className="text-xs text-signal-blue hover:underline"
                      >
                        + Tópico
                      </button>
                    </div>

                    <div className="space-y-2">
                      {topicosMat.length === 0 ? (
                        <p className="text-xs text-ash py-2">Nenhum tópico cadastrado ainda.</p>
                      ) : (
                        topicosMat.map((t) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-[8px] bg-linen border border-mist/60 flex items-center justify-between text-xs"
                          >
                            <span className={t.status === 'concluido' ? 'line-through text-ash' : 'text-graphite font-medium'}>
                              {t.nome}
                            </span>
                            <span className="text-[10px] uppercase text-ash tracking-wider">
                              {t.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: LINHA TEMPORAL DO CRONOGRAMA (RF07) */}
        {/* ========================================================================= */}
        {activeTab === 'timeline' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-mist pb-6">
              <div>
                <span className="text-xs uppercase tracking-wider text-ash">Orquestração Temporal (RF07)</span>
                <h1 className="gic-heading font-normal mt-1">Linha do Tempo Completa</h1>
                <p className="text-sm text-ash mt-1">
                  Distribuição contínua até a véspera da prova com os tópicos de maior complexidade alocados primeiro.
                </p>
              </div>
              <button
                onClick={handleGerarCronograma}
                className="gic-btn-primary text-xs"
              >
                <span>Redistribuir Tudo</span>
                <span>→</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {sessoes.map((s) => {
                const topico = topicosMap.get(s.topicoId);
                if (!topico) return null;
                const isHoje = s.dataPlanejada === dataAtual;
                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-[12px] border ${
                      isHoje ? 'bg-paper border-signal-blue/60 shadow-sm' : 'bg-paper border-mist'
                    } flex items-center justify-between text-xs`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-ash">{s.dataPlanejada}</span>
                      {isHoje && (
                        <span className="border border-signal-blue text-signal-blue bg-paper px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium">
                          Hoje
                        </span>
                      )}
                      <span className="text-sm font-medium text-graphite">{topico.nome}</span>
                      <span className="text-ash">({topico.materia.nome})</span>
                    </div>

                    <span className="text-[11px] text-ash uppercase tracking-wider">
                      {s.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 4: MÉTRICAS AGREGADAS (ADMIN) */}
        {/* ========================================================================= */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            <div className="border-b border-mist pb-6">
              <span className="text-xs uppercase tracking-wider text-ash">Painel Agregado</span>
              <h1 className="gic-heading font-normal mt-1">Métricas da Plataforma</h1>
              <p className="text-sm text-ash mt-1">
                Visualização de métricas de adesão respeitando o sigilo do conteúdo individual de cada estudante.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="gic-card p-6 space-y-1">
                <span className="text-xs text-ash uppercase tracking-wider">Estudantes Ativos</span>
                <p className="font-serif text-4xl text-graphite font-normal mt-1">1.482</p>
                <p className="text-xs text-ash">+14% no último ciclo</p>
              </div>

              <div className="gic-card p-6 space-y-1">
                <span className="text-xs text-ash uppercase tracking-wider">Sessões Concluídas</span>
                <p className="font-serif text-4xl text-graphite font-normal mt-1">29.340</p>
                <p className="text-xs text-ash">Estudos e revisões contabilizados</p>
              </div>

              <div className="gic-card p-6 space-y-1">
                <span className="text-xs text-ash uppercase tracking-wider">Taxa de Permanência</span>
                <p className="font-serif text-4xl text-graphite font-normal mt-1">87.4%</p>
                <p className="text-xs text-ash">Estudantes com indicador &ldquo;No prazo&rdquo;</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer em Tom de Colofão Editorial */}
      <footer className="max-w-[1100px] mx-auto px-6 mt-20 pt-8 border-t border-mist flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-ash">
        <div>
          <span>Atlas — Caderno de estudos adaptativo para vestibulares e concursos.</span>
        </div>
        <div>
          <button
            onClick={handleExcluirConta}
            className="text-ash hover:text-graphite underline transition"
          >
            Excluir permanentemente minha conta e dados (RF14)
          </button>
        </div>
      </footer>

      {/* Modal: Nova Matéria (RF04) */}
      {modalMateriaAberto && (
        <div className="fixed inset-0 bg-twilight/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-paper border border-mist rounded-[16px] p-6 w-full max-w-md space-y-5 shadow-lg">
            <div>
              <span className="text-xs uppercase tracking-wider text-ash">Cadastro (RF04)</span>
              <h3 className="font-serif text-2xl text-graphite font-normal mt-0.5">Nova Disciplina</h3>
            </div>

            <form onSubmit={handleCriarMateria} className="space-y-4">
              <div>
                <label className="text-xs text-ash font-medium">Nome da Matéria</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Filosofia Moderna"
                  value={novoNomeMateria}
                  onChange={(e) => setNovoNomeMateria(e.target.value)}
                  className="w-full mt-1 gic-input"
                />
              </div>

              <div>
                <label className="text-xs text-ash font-medium">Nível de Exigência / Dificuldade</label>
                <select
                  value={novaDificuldadeMateria}
                  onChange={(e) => setNovaDificuldadeMateria(e.target.value as DificuldadeMateria)}
                  className="w-full mt-1 gic-input"
                >
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil (Prioridade inicial no cronograma)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-mist/40">
                <button
                  type="button"
                  onClick={() => setModalMateriaAberto(false)}
                  className="gic-btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="gic-btn-primary text-xs"
                >
                  Salvar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Tópico (RF05) */}
      {modalTopicoAberto && (
        <div className="fixed inset-0 bg-twilight/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-paper border border-mist rounded-[16px] p-6 w-full max-w-md space-y-5 shadow-lg">
            <div>
              <span className="text-xs uppercase tracking-wider text-ash">Adição de Tema (RF05)</span>
              <h3 className="font-serif text-2xl text-graphite font-normal mt-0.5">Novo Tópico</h3>
            </div>

            <form onSubmit={handleCriarTopico} className="space-y-4">
              <div>
                <label className="text-xs text-ash font-medium">Nome do Tópico</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Teoria do Conhecimento em Kant"
                  value={novoNomeTopico}
                  onChange={(e) => setNovoNomeTopico(e.target.value)}
                  className="w-full mt-1 gic-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-mist/40">
                <button
                  type="button"
                  onClick={() => setModalTopicoAberto(false)}
                  className="gic-btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="gic-btn-primary text-xs"
                >
                  Salvar Tópico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
