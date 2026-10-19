'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [objetivoEstudo, setObjetivoEstudo] = useState('enem');
  const [dataProva, setDataProva] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Validação de força de senha
  const senhaValida = senha.length >= 6;
  const senhasConferem = senha === confirmarSenha && senha.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);

    // Validações no cliente (RNF02)
    if (!nome.trim()) {
      setMensagemErro('Por favor, informe seu nome completo.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setMensagemErro('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (!senhaValida) {
      setMensagemErro('A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (!senhasConferem) {
      setMensagemErro('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      // Cadastro via Supabase Auth (RNF01: hash bcrypt gerenciado nativamente)
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome: nome.trim(),
            objetivo: objetivoEstudo,
            data_prova: dataProva || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      setSucesso(true);

      // Redirecionamento após breve intervalo para percepção do feedback
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

    } catch (err: any) {
      setMensagemErro(err.message || 'Ocorreu um erro ao criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans selection:bg-signal-blue/15 flex flex-col justify-between p-6 sm:p-10">
      
      {/* Top Header / Marca */}
      <header className="max-w-[1000px] w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-serif text-2xl text-graphite group-hover:text-signal-blue transition">
            Atlas
          </span>
          <span className="text-xs text-fog">/</span>
          <span className="text-xs text-ash tracking-tight">novo estudante</span>
        </Link>

        <Link
          href="/login"
          className="text-xs text-ash hover:text-graphite transition flex items-center gap-1.5"
        >
          <span>Já possui conta?</span>
          <span className="text-graphite underline font-medium">Entrar</span>
        </Link>
      </header>

      {/* Conteúdo Principal — Formulário Editorial */}
      <main className="max-w-[480px] w-full mx-auto my-10">
        <div className="bg-paper border border-mist rounded-[16px] p-8 sm:p-10 shadow-sm space-y-8">
          
          {/* Cabeçalho Literário */}
          <div className="space-y-2 text-left">
            <span className="text-xs uppercase tracking-widest text-ash font-medium">
              Inscrição no Caderno (RF01)
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-graphite font-normal leading-tight">
              Comece sua rotina com método e serenidade.
            </h1>
            <p className="text-sm text-ash leading-relaxed">
              Crie sua conta para estruturar seu cronograma adaptativo até o dia da prova.
            </p>
          </div>

          {/* Mensagem de Feedback de Erro */}
          {mensagemErro && (
            <div className="p-4 rounded-[10px] bg-linen border border-twilight/30 text-xs text-graphite flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-twilight shrink-0" />
              <span>{mensagemErro}</span>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {sucesso && (
            <div className="p-4 rounded-[10px] bg-linen border border-signal-blue text-xs text-graphite flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-signal-blue shrink-0 animate-ping" />
              <span>Conta criada com sucesso! Preparando seu caderno de estudos...</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Nome Completo */}
            <div className="space-y-1.5">
              <label className="text-xs text-ash font-medium block">
                Nome Completo <span className="text-signal-blue">*</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Beatriz Albuquerque"
                className="w-full gic-input text-sm"
              />
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs text-ash font-medium block">
                Endereço de E-mail <span className="text-signal-blue">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="estudante@caderno.app"
                className="w-full gic-input text-sm"
              />
            </div>

            {/* Grade: Senha e Confirmação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-ash font-medium block">
                  Senha <span className="text-signal-blue">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  className="w-full gic-input text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-ash font-medium block">
                  Confirmar Senha <span className="text-signal-blue">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className={`w-full gic-input text-sm ${
                    confirmarSenha && !senhasConferem ? 'border-twilight/50 bg-red-50/20' : ''
                  }`}
                />
              </div>
            </div>

            {/* Foco de Preparação (Opcional para personalização) */}
            <div className="space-y-1.5 pt-2 border-t border-mist/40">
              <label className="text-xs text-ash font-medium block">
                Qual o seu foco principal?
              </label>
              <select
                value={objetivoEstudo}
                onChange={(e) => setObjetivoEstudo(e.target.value)}
                className="w-full gic-input text-xs"
              >
                <option value="enem">ENEM (Exame Nacional do Ensino Médio)</option>
                <option value="medicina">Vestibular de Medicina (Fuvest, Unicamp, Vunesp)</option>
                <option value="concurso_geral">Concurso Público — Geral</option>
                <option value="concurso_fiscal">Concurso — Área Fiscal / Controle</option>
                <option value="concurso_juridico">Concurso — Carreiras Jurídicas / Policiais</option>
                <option value="oab">Exame da OAB</option>
                <option value="outro">Outro Objetivo</option>
              </select>
            </div>

            {/* Data Prevista da Prova (Opcional - RF06) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-ash font-medium block">
                  Data Prevista da Prova
                </label>
                <span className="text-[11px] text-fog">(opcional agora)</span>
              </div>
              <input
                type="date"
                value={dataProva}
                onChange={(e) => setDataProva(e.target.value)}
                className="w-full gic-input text-xs"
              />
              <p className="text-[11px] text-ash">
                Você também poderá ajustar ou informar a data a qualquer momento no seu diário.
              </p>
            </div>

            {/* Termos de Privacidade e Proteção de Dados (RNF03, RF14) */}
            <div className="pt-2 text-[11px] text-ash leading-relaxed">
              Ao criar sua conta, seus dados de estudo permanecem sob isolamento restrito (RLS). Você pode editar matérias ou excluir permanentemente sua conta a qualquer momento.
            </div>

            {/* Botão de Envio (Dusk CTA com seta) */}
            <button
              type="submit"
              disabled={loading || sucesso}
              className="w-full gic-btn-dusk justify-center text-sm py-3 mt-4 disabled:opacity-60 transition"
            >
              <span>{loading ? 'Cadastrando...' : 'Criar Meu Caderno de Estudos'}</span>
              <span>→</span>
            </button>

          </form>

          {/* Rodapé Interno do Card */}
          <div className="pt-4 border-t border-mist/50 text-center text-xs text-ash">
            <span>Já faz parte do Atlas? </span>
            <Link href="/login" className="text-graphite underline font-medium hover:text-signal-blue transition">
              Acessar minha conta
            </Link>
          </div>

        </div>
      </main>

      {/* Footer em Colofão */}
      <footer className="max-w-[1000px] w-full mx-auto text-center text-xs text-ash">
        <span>Atlas © 2026 — Focado em vestibulandos, ENEM e concurseiros.</span>
      </footer>

    </div>
  );
}
