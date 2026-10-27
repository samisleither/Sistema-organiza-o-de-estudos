# Changelog

Registro do histórico confirmado pelo responsável do projeto e revisão do estado atual do repositório. Datas não foram inventadas quando o histórico não permitiu confirmar o dia.

## 2026-10-27 — Revisão final e documentação

- Revisado o conteúdo de todo o repositório web, módulo core, schema Supabase, arquivos de configuração e documentos existentes.
- Reescrito o README para descrever somente a aplicação presente no repositório.
- Atualizado spec-sistema-organizacao-estudos.md como especificação final, separando funcionalidades implementadas, limitações, segurança e itens pendentes.
- Criado este changelog.
- Registradas pendências identificadas na implementação: proteção do campo tipo, exclusão de conta, IDs do replanejamento e revisões, retorno de redefinição de senha, indicador de ritmo e migrations.
- Não foram alterados os fluxos de aplicação nem o banco durante esta revisão documental.

## Publicação inicial — outubro de 2026, dia exato não registrado

### Produto e aplicação

- Preparada a experiência web Atlas com páginas de cadastro, login, recuperação de senha e diário de estudos.
- Removidos fluxos de autenticação e dados de demonstração/localStorage; o acesso passou a depender do Supabase.
- Removida a aba Métricas. O diário preserva apenas cartões básicos de progresso.
- Implementados cadastro e login via Supabase Auth, perfil de estudante, criação de matérias e tópicos, geração de cronograma, diário, revisões e indicador de ritmo.
- Criada a biblioteca TypeScript packages/core/src com tipos e regras para cronograma, replanejamento, repetição espaçada e ritmo.
- Corrigido o caminho duplicado de gravação das revisões: a persistência das revisões fica no trigger SQL, sem uma segunda inserção no cliente.

### Banco e segurança

- Instalado o schema Supabase com usuarios, materias, topicos, sessao_estudo e revisao.
- Ativada RLS nas cinco tabelas e criadas políticas por usuário.
- Adicionado trigger de perfil após cadastro em Supabase Auth e trigger que cria revisões nos intervalos de 1, 3, 7 e 15 dias.
- Configurado o cliente Supabase pelas variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
- Incluído no .gitignore o bloqueio de arquivos de ambiente e senha.txt; a auditoria não encontrou esses arquivos rastreados pelo Git.

### Repositório e publicação

- Inicializado Git na branch main e criado o commit inicial c2e1b2f.
- Conectado o repositório GitHub privado samisleither/AtlasSistema.
- Importada a aplicação na Vercel com diretório raiz apps/web.
- Configuradas as variáveis Supabase para Production e Preview; após salvar as variáveis, foi feita nova implantação.
- Publicado o domínio de produção https://atlas-sistema.vercel.app.
- Mantida Standard Protection da Vercel, permitindo o acesso público ao domínio de produção e mantendo URLs de preview protegidas.
- O responsável confirmou que o domínio principal ficou acessível e que a página reconheceu a conexão configurada.

## Pendências conhecidas ao fechar este changelog

- O README original descrevia um aplicativo mobile inexistente neste repositório; essa afirmação foi removida.
- A tela final de redefinição de senha não existe, embora a solicitação do link esteja implementada.
- A exclusão definitiva de conta anunciada pela interface não está segura nem funcional com as políticas atuais.
- A persistência do replanejamento e as revisões exibidas no estado local têm incompatibilidade de IDs e precisam de correção.
- O indicador de ritmo não restringe corretamente todas as sessões concluídas à data de hoje.
- Não foi executado build nem testes automatizados nesta revisão documental.
