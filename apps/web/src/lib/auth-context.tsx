'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  dataProva?: string | null;
  horasPorDia?: Record<string, number>;
  tipo?: 'estudante' | 'administrador';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: PerfilUsuario | null;
  loading: boolean;
  signOut: () => Promise<void>;
  atualizarPerfil: (dados: Partial<PerfilUsuario>) => Promise<void>;
  isModoDemo: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModoDemo, setIsModoDemo] = useState(false);

  useEffect(() => {
    // Verifica se as credenciais do Supabase foram configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isConfigurado = supabaseUrl && !supabaseUrl.includes('demo-atlas.supabase.co');

    if (!isConfigurado) {
      // Modo local / demo persistente em localStorage
      setIsModoDemo(true);
      const demoUserSalvo = localStorage.getItem('atlas_demo_user');
      if (demoUserSalvo) {
        const u = JSON.parse(demoUserSalvo);
        setUser(u);
        setPerfil(u.perfil);
      } else {
        // Cria usuário local padrão
        const novoUser: any = {
          id: 'estudante-demo',
          email: 'estudante@atlas.app',
          perfil: {
            id: 'estudante-demo',
            nome: 'Estudante Atlas',
            email: 'estudante@atlas.app',
            dataProva: '2026-11-30',
            horasPorDia: { seg: 3, ter: 3, qua: 3, qui: 3, sex: 3, sab: 4, dom: 0 },
            tipo: 'estudante',
          },
        };
        localStorage.setItem('atlas_demo_user', JSON.stringify(novoUser));
        setUser(novoUser);
        setPerfil(novoUser.perfil);
      }
      setLoading(false);
      return;
    }

    // Modo Produção: Supabase Auth Real
    const carregarSessao = async () => {
      try {
        const { data: { session: sessaoAtual } } = await supabase.auth.getSession();
        setSession(sessaoAtual);
        setUser(sessaoAtual?.user ?? null);

        if (sessaoAtual?.user) {
          const { data: perfilData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', sessaoAtual.user.id)
            .single();

          if (perfilData) {
            setPerfil(perfilData);
          } else {
            // Perfil inicial
            setPerfil({
              id: sessaoAtual.user.id,
              nome: sessaoAtual.user.user_metadata?.nome || 'Estudante',
              email: sessaoAtual.user.email || '',
              horasPorDia: { seg: 2, ter: 2, qua: 2, qui: 2, sex: 2, sab: 4, dom: 0 },
              tipo: 'estudante',
            });
          }
        }
      } catch (err) {
        console.error('Erro ao carregar sessão do Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    carregarSessao();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, sessaoAtual) => {
      setSession(sessaoAtual);
      setUser(sessaoAtual?.user ?? null);
      if (sessaoAtual?.user) {
        const { data: perfilData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', sessaoAtual.user.id)
          .single();
        if (perfilData) setPerfil(perfilData);
      } else {
        setPerfil(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (isModoDemo) {
      localStorage.removeItem('atlas_demo_user');
      setUser(null);
      setPerfil(null);
      window.location.href = '/login';
      return;
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const atualizarPerfil = async (dados: Partial<PerfilUsuario>) => {
    if (!user) return;

    if (isModoDemo) {
      const perfilAtualizado = { ...perfil, ...dados } as PerfilUsuario;
      setPerfil(perfilAtualizado);
      const demoUser = { ...user, perfil: perfilAtualizado };
      localStorage.setItem('atlas_demo_user', JSON.stringify(demoUser));
      return;
    }

    const { error } = await supabase
      .from('usuarios')
      .update(dados)
      .eq('id', user.id);

    if (error) throw error;
    setPerfil((prev) => (prev ? { ...prev, ...dados } : null));
  };

  return (
    <AuthContext.Provider value={{ user, session, perfil, loading, signOut, atualizarPerfil, isModoDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
