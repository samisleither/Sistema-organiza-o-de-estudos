'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);

    if (!email.trim() || !email.includes('@')) {
      setMensagemErro('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);

    try {
      // RF03: Redefinição de senha por e-mail via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/redefinir-senha`,
      });

      if (error) {
        throw error;
      }

      setSucesso(true);

    } catch (err: any) {
      setMensagemErro(err.message || 'Não foi possível solicitar a redefinição de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans selection:bg-signal-blue/15 flex flex-col justify-between p-6 sm:p-10">
      
      {/* Header */}
      <header className="max-w-[1000px] w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-serif text-2xl text-graphite group-hover:text-signal-blue transition">
            Atlas
          </span>
          <span className="text-xs text-fog">/</span>
          <span className="text-xs text-ash tracking-tight">redefinição de acesso</span>
        </Link>

        <Link
          href="/login"
          className="text-xs text-ash hover:text-graphite transition flex items-center gap-1.5"
        >
          <span>Lembrou da senha?</span>
          <span className="text-graphite underline font-medium">Voltar ao login</span>
        </Link>
      </header>

      {/* Main Card */}
      <main className="max-w-[460px] w-full mx-auto my-10">
        <div className="bg-paper border border-mist rounded-[16px] p-8 sm:p-10 shadow-sm space-y-7">
          
          <div className="space-y-2 text-left">
            <span className="text-xs uppercase tracking-widest text-ash font-medium">
              Recuperação de Senha (RF03)
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-graphite font-normal leading-tight">
              Redefina o acesso ao seu diário.
            </h1>
            <p className="text-sm text-ash leading-relaxed">
              Informe o e-mail cadastrado e enviaremos um link seguro para você definir uma nova senha.
            </p>
          </div>

          {mensagemErro && (
            <div className="p-4 rounded-[10px] bg-linen border border-twilight/30 text-xs text-graphite flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-twilight shrink-0" />
              <span>{mensagemErro}</span>
            </div>
          )}

          {sucesso ? (
            <div className="p-5 rounded-[12px] bg-linen border border-signal-blue space-y-3 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-signal-blue animate-pulse" />
                <span className="text-sm text-graphite font-medium">Link de redefinição enviado!</span>
              </div>
              <p className="text-xs text-ash leading-relaxed">
                Verifique a caixa de entrada do e-mail <strong>{email}</strong> (e a pasta de spam, se necessário) e clique no link recebido para cadastrar uma nova senha.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="gic-btn-secondary text-xs py-1.5 px-3"
                >
                  Retornar ao Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-ash font-medium block">
                  E-mail Cadastrado
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

              <button
                type="submit"
                disabled={loading}
                className="w-full gic-btn-dusk justify-center text-sm py-3 mt-2 disabled:opacity-60 transition cursor-pointer"
              >
                <span>{loading ? 'Enviando...' : 'Enviar Link de Redefinição'}</span>
                <span>→</span>
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-mist/50 text-center text-xs text-ash">
            <Link href="/login" className="text-graphite underline font-medium hover:text-signal-blue transition">
              ← Voltar para a tela de login
            </Link>
          </div>

        </div>
      </main>

      <footer className="max-w-[1000px] w-full mx-auto text-center text-xs text-ash">
        <span>Atlas © 2026 — Focado em vestibulandos, ENEM e concurseiros.</span>
      </footer>

    </div>
  );
}
