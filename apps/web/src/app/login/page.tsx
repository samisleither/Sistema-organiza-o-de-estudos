'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function LoginPage() {
  const { user, perfil, signOut, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrarMe, setLembrarMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Se já estiver logado, redirecionamento ou opção de continuar
  const jaEstaLogado = !authLoading && !!user;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);

    if (!email.trim() || !senha) {
      setMensagemErro('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        throw error;
      }

      setSucesso(true);

      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setMensagemErro('E-mail ou senha incorretos. Por favor, verifique seus dados.');
      } else {
        setMensagemErro(msg || 'Não foi possível autenticar. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans selection:bg-signal-blue/15 flex flex-col justify-between p-6 sm:p-10">
      
      {/* Top Header */}
      <header className="max-w-[1000px] w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-serif text-2xl text-graphite group-hover:text-signal-blue transition">
            Atlas
          </span>
          <span className="text-xs text-fog">/</span>
          <span className="text-xs text-ash tracking-tight">acesso de estudante</span>
        </Link>

        <Link
          href="/cadastro"
          className="text-xs text-ash hover:text-graphite transition flex items-center gap-1.5"
        >
          <span>Não tem conta?</span>
          <span className="text-graphite underline font-medium">Criar conta</span>
        </Link>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-[460px] w-full mx-auto my-10">
        <div className="bg-paper border border-mist rounded-[16px] p-8 sm:p-10 shadow-sm space-y-7">
          
          {/* CASO 1: USUÁRIO JÁ POSSUI SESSÃO / CONTA LOGADA */}
          {jaEstaLogado ? (
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-ash font-medium">
                  Sessão Ativa Detectada
                </span>
                <h1 className="font-serif text-3xl text-graphite font-normal leading-tight">
                  Bem-vindo de volta, {perfil?.nome || user?.email?.split('@')[0]}.
                </h1>
                <p className="text-sm text-ash leading-relaxed">
                  Você já está conectado ao seu caderno de estudos. Deseja acessar suas matérias e o cronograma de hoje?
                </p>
              </div>

              <div className="p-4 rounded-[10px] bg-linen border border-mist/70 text-xs space-y-1">
                <p className="text-graphite font-medium">Conta ativa: <span className="font-normal text-ash">{user?.email}</span></p>
                {perfil?.dataProva && (
                  <p className="text-ash">Data limite da prova: <span className="text-graphite font-medium">{perfil.dataProva}</span></p>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/"
                  className="w-full gic-btn-dusk justify-center text-sm py-3 transition text-center"
                >
                  <span>Acessar Meu Diário de Estudos</span>
                  <span>→</span>
                </Link>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="w-full gic-btn-secondary justify-center text-xs py-2 text-ash hover:text-graphite transition"
                >
                  Entrar com outra conta / Sair
                </button>
              </div>
            </div>
          ) : (

            /* CASO 2: FORMULÁRIO DE LOGIN (QUANDO NÃO ESTÁ LOGADO) */
            <>
              <div className="space-y-2 text-left">
                <span className="text-xs uppercase tracking-widest text-ash font-medium">
                  Identificação do Estudante (RF02)
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl text-graphite font-normal leading-tight">
                  Acesse seu caderno de estudos.
                </h1>
                <p className="text-sm text-ash leading-relaxed">
                  Consulte os tópicos do dia, registre sessões cumpridas e acompanhe o ritmo do seu plano.
                </p>
              </div>

              {/* Mensagem de Erro */}
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
                  <span>Autenticação confirmada! Carregando seu diário...</span>
                </div>
              )}

              {/* Formulário de Login */}
              <form onSubmit={handleLogin} className="space-y-5">
                
                {/* E-mail */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs text-ash font-medium block">
                    Endereço de E-mail
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

                {/* Senha */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs text-ash font-medium block">
                      Senha de Acesso
                    </label>
                    <Link
                      href="/recuperar-senha"
                      className="text-xs text-ash hover:text-graphite underline"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full gic-input text-sm"
                  />
                </div>

                {/* Lembrar-me */}
                <div className="flex items-center gap-2 text-xs text-ash pt-1">
                  <input
                    type="checkbox"
                    id="lembrar"
                    checked={lembrarMe}
                    onChange={(e) => setLembrarMe(e.target.checked)}
                    className="rounded border-mist text-twilight focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="lembrar" className="cursor-pointer select-none">
                    Manter sessão ativa neste dispositivo
                  </label>
                </div>

                {/* Botão Dusk CTA */}
                <button
                  type="submit"
                  disabled={loading || sucesso}
                  className="w-full gic-btn-dusk justify-center text-sm py-3 mt-2 disabled:opacity-60 transition cursor-pointer"
                >
                  <span>{loading ? 'Acessando...' : 'Entrar no Caderno'}</span>
                  <span>→</span>
                </button>

              </form>

              {/* Rodapé Interno */}
              <div className="pt-3 border-t border-mist/50 text-center text-xs text-ash space-y-2">
                <p>
                  Ainda não possui uma conta?{' '}
                  <Link
                    href="/cadastro"
                    className="text-graphite underline font-medium hover:text-signal-blue transition"
                  >
                    Criar cadastro gratuitamente
                  </Link>
                </p>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Footer Colofão */}
      <footer className="max-w-[1000px] w-full mx-auto text-center text-xs text-ash">
        <span>Atlas © 2026 — Focado em vestibulandos, ENEM e concurseiros.</span>
      </footer>

    </div>
  );
}
