# Atlas — Caderno de Estudos

O Atlas é uma aplicação web para organizar matérias, tópicos e sessões de estudo até a data da prova. O sistema reúne um diário do dia, um cronograma e revisões espaçadas.

## Estado atual

- Aplicação web Next.js publicada na Vercel.
- Domínio de produção: https://atlas-sistema.vercel.app
- Repositório GitHub privado: samisleither/AtlasSistema, branch main.
- Supabase Auth e PostgreSQL usados para autenticação e persistência.
- A pasta apps/mobile descrita em versões anteriores do README não existe neste repositório. Este repositório contém somente a aplicação web e o módulo TypeScript de regras de negócio.
- O spec final descreve o estado real, as verificações relatadas e as pendências: [spec-sistema-organizacao-estudos.md](./spec-sistema-organizacao-estudos.md).
- O histórico das mudanças está em [CHANGELOG.md](./CHANGELOG.md).

## Funcionalidades presentes

- Cadastro e login com e-mail e senha via Supabase Auth.
- Solicitação de recuperação de senha por e-mail.
- Perfil associado à conta de autenticação.
- Criação de matérias com nível de dificuldade e criação de tópicos.
- Geração de cronograma com prioridade por dificuldade, respeitando a disponibilidade semanal e a data da prova.
- Diário com sessões de estudo do dia e revisões agendadas.
- Registro de sessão concluída e de sessão não realizada.
- Indicador de ritmo e avanço do plano.
- Linha do tempo do cronograma.
- Revisões espaçadas nos intervalos de 1, 3, 7 e 15 dias.
- A aba separada de Métricas foi removida. O diário ainda mostra cartões básicos de ritmo e avanço.

Consulte a seção de limitações no spec antes de considerar todos os fluxos prontos para produção. Em particular, a redefinição final da senha, a exclusão de conta e a persistência do replanejamento precisam de correção/verificação.

## Tecnologias e estrutura

- Next.js 14, React 18 e TypeScript.
- Tailwind CSS para estilos.
- Supabase JS para autenticação e acesso ao banco.
- packages/core/src contém tipos e regras puras de cronograma, replanejamento, revisões e indicador de ritmo.

    apps/web/src/app/       páginas /, /cadastro, /login e /recuperar-senha
    apps/web/src/lib/       cliente Supabase, contexto de autenticação e operações de dados
    apps/web/src/components/Providers.tsx
    packages/core/src/      tipos e algoritmos compartilhados
    schema.sql              tabelas, políticas RLS, funções e triggers do Supabase
    spec-sistema-organizacao-estudos.md
    CHANGELOG.md

## Configuração local

1. Crie um projeto Supabase e execute o conteúdo de schema.sql uma vez no SQL Editor, em um banco novo.
2. Crie apps/web/.env.local com as variáveis abaixo. Use o Project URL e a chave Publishable do seu próprio projeto Supabase.

    NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE

3. No PowerShell ou terminal, execute:

    cd apps/web
    npm install
    npm run dev

4. Acesse http://localhost:3000.

O SQL atual é um script de instalação inicial, não um sistema de migrations e não deve ser reaplicado sem revisar objetos existentes. Nunca coloque a chave Supabase Secret ou service_role numa variável NEXT_PUBLIC ou no código do navegador.

## Publicação

A Vercel importa o repositório GitHub com Root Directory em apps/web. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em Production e Preview. Alterações em variáveis exigem uma nova implantação.

A Standard Protection mantém os endereços de preview protegidos, enquanto o domínio de produção fica acessível. O login do Supabase continua sendo a autenticação do Atlas; a proteção da Vercel é uma camada diferente.

## Segurança e dados

O schema ativa Row Level Security nas tabelas usuarios, materias, topicos, sessao_estudo e revisao. As tabelas de estudo restringem operações ao usuario_id autenticado. A chave Publishable pode aparecer no cliente, portanto a privacidade depende das políticas RLS corretas.

O .gitignore exclui arquivos .env, arquivos .env.* e senha.txt. Não envie credenciais, tokens, senhas ou valores de ambiente ao GitHub.

## Escopo não implementado

Este repositório não contém aplicativo mobile, modo offline, notificações, simulados, relatórios de desempenho, gamificação ou painel administrativo. Também não contém uma tela /redefinir-senha. A lista completa das limitações e riscos conhecidos está no spec final.
