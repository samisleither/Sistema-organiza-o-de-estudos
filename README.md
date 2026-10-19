# 🌌 Atlas — Sistema Inteligente de Rotina de Estudos

O **Atlas** é um sistema web e mobile projetado para organizar a rotina de estudos de vestibulandos, candidatos do ENEM e concurseiros até a data da prova. O seu principal diferencial é o **cronograma adaptativo que se ajusta automaticamente** quando o estudante não cumpre o planejado, eliminando a frustração do abandono do plano de estudos.

---

## 🚀 Funcionalidades Principais (Conforme spec.md)

| Requisito | Funcionalidade | Detalhes |
|---|---|---|
| **RF01-RF03** | Autenticação & Perfil | Cadastro com hash seguro nativo (Supabase/bcrypt), login e recuperação de senha. |
| **RF04-RF05** | Matérias & Tópicos | Cadastro com 3 níveis de dificuldade (`fácil`, `médio`, `difícil`) e tópicos ordenados. |
| **RF06-RF07** | Cronograma Automático | Distribuição inteligente até a data da prova com base nas horas diárias disponíveis, priorizando matérias difíceis. |
| **RF08-RF09** | Dashboard Diário | Listagem limpa do que estudar hoje com botão de conclusão direta. |
| **RF10** | Replanejamento Imediato (&lt; 1s) | Ao marcar *"Não fiz hoje"*, o algoritmo redistribui os tópicos pendentes nos próximos dias sem duplicar dados. |
| **RF11** | Revisão Espaçada (1, 3, 7, 15 dias) | Criação automática de revisões no método Ebbinghaus assim que um tópico é concluído. |
| **RF12** | Indicador de Ritmo | Exibe em tempo real se o estudante está *"No prazo"* ou *"Atrasado"*. |
| **RF13-RF14** | Gestão & Exclusão de Conta | Edição/exclusão de matérias/tópicos e exclusão definitiva de conta com cascade de dados (LGPD). |

---

## 📂 Estrutura do Repositório

```
atlas/
├── schema.sql                     # Script SQL completo com tabelas, RLS e triggers (Supabase)
├── packages/
│   └── core/                      # Módulo compartilhado de regras de negócio (TS puro)
│       ├── src/
│       │   ├── types.ts           # Interfaces e tipos do sistema
│       │   ├── scheduler.ts       # Algoritmo de distribuição por dificuldade (RF07)
│       │   ├── rescheduler.ts     # Algoritmo de replanejamento adaptativo < 1s (RF10)
│       │   ├── spacedRepetition.ts# Gerador de revisões D+1, D+3, D+7, D+15 (RF11)
│       │   ├── paceIndicator.ts   # Cálculo do indicador de ritmo (RF12)
│       │   └── index.ts
├── apps/
│   ├── web/                       # Aplicação Next.js 14 + Tailwind CSS (Web)
│   │   ├── src/
│   │   │   ├── app/               # Rotas e páginas do Next.js
│   │   │   └── lib/supabase.ts    # Conexão com Supabase
│   │   ├── package.json
│   │   └── tailwind.config.js
│   └── mobile/                    # Aplicação React Native / Expo (Mobile)
```

---

## 🛠️ Como Executar

### 1. Banco de Dados (Supabase)
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Acesse o **SQL Editor** do Supabase.
3. Cole o conteúdo de [schema.sql](./schema.sql) e execute.
4. Copie a `SUPABASE_URL` e `SUPABASE_ANON_KEY` para as variáveis de ambiente.

### 2. Frontend Web (Next.js)
```bash
cd apps/web
npm install
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000).

---

## 📱 Mobile (React Native / Expo)
O mobile compartilha a mesma biblioteca de regras `@atlas/core`, conectando-se diretamente ao Supabase via REST/Realtime e garantindo que o algoritmo de replanejamento rode localmente ou via Edge Function.
