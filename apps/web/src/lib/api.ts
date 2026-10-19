import { supabase } from './supabase';
import {
  Materia,
  TopicoComMateria,
  SessaoEstudo,
  Revisao,
  gerarRevisoesEspacadas,
} from '@atlas/core';

const STORAGE_KEYS = {
  MATERIAS: 'atlas_materias',
  TOPICOS: 'atlas_topicos',
  SESSOES: 'atlas_sessoes',
  REVISOES: 'atlas_revisoes',
};

function isModoDemo(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes('demo-atlas.supabase.co');
}

// -----------------------------------------------------------------------------
// MATÉRIAS E TÓPICOS (RF04, RF05, RF13)
// -----------------------------------------------------------------------------

export async function carregarDadosCompletos(usuarioId: string): Promise<{
  materias: Materia[];
  topicos: TopicoComMateria[];
  sessoes: SessaoEstudo[];
  revisoes: Revisao[];
}> {
  if (isModoDemo()) {
    // Carrega do LocalStorage ou inicializa com dados de demonstração
    let materias: Materia[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIAS) || 'null');
    let topicos: TopicoComMateria[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOPICOS) || 'null');
    let sessoes: SessaoEstudo[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSOES) || 'null');
    let revisoes: Revisao[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVISOES) || 'null');

    if (!materias) {
      materias = [
        { id: 'mat-1', usuarioId, nome: 'Matemática e Funções', dificuldade: 'dificil', corIdentificadora: '#EF4444' },
        { id: 'mat-2', usuarioId, nome: 'Física Clássica', dificuldade: 'dificil', corIdentificadora: '#F97316' },
        { id: 'mat-3', usuarioId, nome: 'Biologia Celular', dificuldade: 'medio', corIdentificadora: '#10B981' },
        { id: 'mat-4', usuarioId, nome: 'História do Brasil', dificuldade: 'facil', corIdentificadora: '#3B82F6' },
      ];
      localStorage.setItem(STORAGE_KEYS.MATERIAS, JSON.stringify(materias));
    }

    if (!topicos) {
      topicos = [
        { id: 'top-1', materiaId: 'mat-1', usuarioId, nome: 'Funções de 1º e 2º Grau', ordem: 1, status: 'pendente', materia: materias[0] },
        { id: 'top-2', materiaId: 'mat-1', usuarioId, nome: 'Trigonometria no Triângulo', ordem: 2, status: 'pendente', materia: materias[0] },
        { id: 'top-3', materiaId: 'mat-1', usuarioId, nome: 'Logaritmos e Exponenciais', ordem: 3, status: 'pendente', materia: materias[0] },
        { id: 'top-4', materiaId: 'mat-2', usuarioId, nome: 'Cinemática Escalar (MRU/MRUV)', ordem: 1, status: 'pendente', materia: materias[1] },
        { id: 'top-5', materiaId: 'mat-2', usuarioId, nome: 'Leis de Newton e Dinâmica', ordem: 2, status: 'pendente', materia: materias[1] },
        { id: 'top-6', materiaId: 'mat-3', usuarioId, nome: 'Estrutura da Membrana Plasmática', ordem: 1, status: 'concluido', materia: materias[2] },
        { id: 'top-7', materiaId: 'mat-3', usuarioId, nome: 'Fotossíntese e Respiração Celular', ordem: 2, status: 'pendente', materia: materias[2] },
        { id: 'top-8', materiaId: 'mat-4', usuarioId, nome: 'Período Colonial e Açúcar', ordem: 1, status: 'concluido', materia: materias[3] },
        { id: 'top-9', materiaId: 'mat-4', usuarioId, nome: 'Brasil Império e Independência', ordem: 2, status: 'pendente', materia: materias[3] },
      ];
      localStorage.setItem(STORAGE_KEYS.TOPICOS, JSON.stringify(topicos));
    }

    if (!sessoes) {
      const hoje = new Date().toISOString().split('T')[0];
      sessoes = [
        { id: 'sess-1', usuarioId, topicoId: 'top-1', dataPlanejada: hoje, status: 'pendente' },
        { id: 'sess-2', usuarioId, topicoId: 'top-4', dataPlanejada: hoje, status: 'pendente' },
        { id: 'sess-3', usuarioId, topicoId: 'top-2', dataPlanejada: '2026-10-21', status: 'pendente' },
        { id: 'sess-4', usuarioId, topicoId: 'top-5', dataPlanejada: '2026-10-22', status: 'pendente' },
      ];
      localStorage.setItem(STORAGE_KEYS.SESSOES, JSON.stringify(sessoes));
    }

    if (!revisoes) {
      const hoje = new Date().toISOString().split('T')[0];
      revisoes = [
        { id: 'rev-1', usuarioId, topicoId: 'top-6', intervaloDias: 3, dataAgendada: hoje, status: 'pendente' },
        { id: 'rev-2', usuarioId, topicoId: 'top-8', intervaloDias: 1, dataAgendada: hoje, status: 'pendente' },
      ];
      localStorage.setItem(STORAGE_KEYS.REVISOES, JSON.stringify(revisoes));
    }

    return { materias, topicos, sessoes, revisoes };
  }

  // PRODUÇÃO: Consultas reais no Supabase
  const [{ data: materiasData }, { data: topicosData }, { data: sessoesData }, { data: revisoesData }] = await Promise.all([
    supabase.from('materias').select('*').eq('usuario_id', usuarioId).order('nome'),
    supabase.from('topicos').select('*, materia:materias(*)').eq('usuario_id', usuarioId).order('ordem'),
    supabase.from('sessao_estudo').select('*').eq('usuario_id', usuarioId).order('data_planejada'),
    supabase.from('revisao').select('*').eq('usuario_id', usuarioId).order('data_agendada'),
  ]);

  const materias: Materia[] = (materiasData || []).map((m: any) => ({
    id: m.id,
    usuarioId: m.usuario_id,
    nome: m.nome,
    dificuldade: m.dificuldade,
    corIdentificadora: m.cor_identificadora,
  }));

  const topicos: TopicoComMateria[] = (topicosData || []).map((t: any) => ({
    id: t.id,
    materiaId: t.materia_id,
    usuarioId: t.usuario_id,
    nome: t.nome,
    ordem: t.ordem,
    status: t.status,
    materia: {
      id: t.materia.id,
      usuarioId: t.materia.usuario_id,
      nome: t.materia.nome,
      dificuldade: t.materia.dificuldade,
      corIdentificadora: t.materia.cor_identificadora,
    },
  }));

  const sessoes: SessaoEstudo[] = (sessoesData || []).map((s: any) => ({
    id: s.id,
    usuarioId: s.usuario_id,
    topicoId: s.topico_id,
    dataPlanejada: s.data_planejada,
    dataRealizada: s.data_realizada,
    status: s.status,
  }));

  const revisoes: Revisao[] = (revisoesData || []).map((r: any) => ({
    id: r.id,
    usuarioId: r.usuario_id,
    topicoId: r.topico_id,
    intervaloDias: r.intervalo_dias,
    dataAgendada: r.data_agendada,
    dataConclusao: r.data_conclusao,
    status: r.status,
  }));

  return { materias, topicos, sessoes, revisoes };
}

// Criar matéria
export async function salvarNovaMateria(materia: Omit<Materia, 'id'>): Promise<Materia> {
  if (isModoDemo()) {
    const nova: Materia = { ...materia, id: `mat-${Date.now()}` };
    const existentes: Materia[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIAS) || '[]');
    existentes.push(nova);
    localStorage.setItem(STORAGE_KEYS.MATERIAS, JSON.stringify(existentes));
    return nova;
  }

  const { data, error } = await supabase
    .from('materias')
    .insert({
      usuario_id: materia.usuarioId,
      nome: materia.nome,
      dificuldade: materia.dificuldade,
      cor_identificadora: materia.corIdentificadora || '#3B82F6',
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    usuarioId: data.usuario_id,
    nome: data.nome,
    dificuldade: data.dificuldade,
    corIdentificadora: data.cor_identificadora,
  };
}

// Criar tópico
export async function salvarNovoTopico(topico: Omit<TopicoComMateria, 'id'>): Promise<TopicoComMateria> {
  if (isModoDemo()) {
    const novo: TopicoComMateria = { ...topico, id: `top-${Date.now()}` };
    const existentes: TopicoComMateria[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOPICOS) || '[]');
    existentes.push(novo);
    localStorage.setItem(STORAGE_KEYS.TOPICOS, JSON.stringify(existentes));
    return novo;
  }

  const { data, error } = await supabase
    .from('topicos')
    .insert({
      materia_id: topico.materiaId,
      usuario_id: topico.usuarioId,
      nome: topico.nome,
      ordem: topico.ordem,
      status: topico.status,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...topico,
    id: data.id,
  };
}

// Salvar Cronograma Completo (RF07)
export async function salvarCronogramaGerado(usuarioId: string, sessoes: SessaoEstudo[]): Promise<void> {
  if (isModoDemo()) {
    localStorage.setItem(STORAGE_KEYS.SESSOES, JSON.stringify(sessoes));
    return;
  }

  // Remove sessões pendentes futuras para substituir pelo novo cronograma
  await supabase
    .from('sessao_estudo')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('status', 'pendente');

  const payload = sessoes.map((s) => ({
    usuario_id: usuarioId,
    topico_id: s.topicoId,
    data_planejada: s.dataPlanejada,
    status: s.status,
  }));

  const { error } = await supabase.from('sessao_estudo').insert(payload);
  if (error) throw error;
}

// Concluir Sessão de Estudo (RF09, RF11)
export async function marcarSessaoConcluida(
  sessaoId: string,
  usuarioId: string,
  topicoId: string,
  dataHoje: string
): Promise<Revisao[]> {
  const revisoesGeradas = gerarRevisoesEspacadas(usuarioId, topicoId, dataHoje);

  if (isModoDemo()) {
    const sessoes: SessaoEstudo[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSOES) || '[]');
    const idx = sessoes.findIndex((s) => s.id === sessaoId);
    if (idx !== -1) {
      sessoes[idx].status = 'feita';
      sessoes[idx].dataRealizada = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.SESSOES, JSON.stringify(sessoes));
    }

    const revisoes: Revisao[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVISOES) || '[]');
    const atualizadas = [...revisoes, ...revisoesGeradas];
    localStorage.setItem(STORAGE_KEYS.REVISOES, JSON.stringify(atualizadas));
    return revisoesGeradas;
  }

  // Supabase: atualiza a sessão
  const { error } = await supabase
    .from('sessao_estudo')
    .update({ status: 'feita', data_realizada: new Date().toISOString() })
    .eq('id', sessaoId);

  if (error) throw error;

  // Atualiza tópico
  await supabase.from('topicos').update({ status: 'concluido' }).eq('id', topicoId);

  // Insere revisões (caso o trigger não esteja ativo no banco)
  const payloadRevisoes = revisoesGeradas.map((r) => ({
    usuario_id: usuarioId,
    topico_id: topicoId,
    intervalo_dias: r.intervaloDias,
    data_agendada: r.dataAgendada,
    status: 'pendente',
  }));

  await supabase.from('revisao').insert(payloadRevisoes);
  return revisoesGeradas;
}

// Replanejamento Imediato (RF10, RNF04)
export async function persistirReplanejamento(
  usuarioId: string,
  sessoesAtualizadas: SessaoEstudo[]
): Promise<void> {
  if (isModoDemo()) {
    localStorage.setItem(STORAGE_KEYS.SESSOES, JSON.stringify(sessoesAtualizadas));
    return;
  }

  // Em produção: salva em batch via upsert
  const payload = sessoesAtualizadas.map((s) => ({
    id: s.id.startsWith('sess-replan') ? undefined : s.id,
    usuario_id: usuarioId,
    topico_id: s.topicoId,
    data_planejada: s.dataPlanejada,
    data_realizada: s.dataRealizada,
    status: s.status,
  }));

  await supabase.from('sessao_estudo').upsert(payload);
}

// Concluir Revisão (RF11)
export async function marcarRevisaoConcluida(revisaoId: string): Promise<void> {
  if (isModoDemo()) {
    const revisoes: Revisao[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVISOES) || '[]');
    const idx = revisoes.findIndex((r) => r.id === revisaoId);
    if (idx !== -1) {
      revisoes[idx].status = 'concluida';
      revisoes[idx].dataConclusao = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.REVISOES, JSON.stringify(revisoes));
    }
    return;
  }

  await supabase
    .from('revisao')
    .update({ status: 'concluida', data_conclusao: new Date().toISOString() })
    .eq('id', revisaoId);
}

// Excluir Conta (RF14)
export async function excluirContaDefinitiva(usuarioId: string): Promise<void> {
  if (isModoDemo()) {
    localStorage.clear();
    return;
  }

  // Deleta o registro do usuário; as FKs com ON DELETE CASCADE deletam todo o restante
  await supabase.from('usuarios').delete().eq('id', usuarioId);
  await supabase.auth.signOut();
}
