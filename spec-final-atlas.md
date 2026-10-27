# Especificação final — Atlas

**Revisão:** 27 de outubro de 2026  
**Base:** inspeção estática do repositório na branch main e histórico de configuração informado pela pessoa responsável pelo projeto.

Este documento separa o que existe no código, o que foi configurado externamente e o que ainda precisa ser concluído. “Implementado” descreve a presença do fluxo no código; não significa que todos os casos de produção tenham sido validados.

## 1. Visão do produto

O Atlas é um caderno web de estudos que ajuda estudantes de vestibular, ENEM e concursos a organizar matérias, tópicos, sessões diárias e revisões até uma data de prova. O usuário cadastra conteúdo e disponibilidade, gera um cronograma e acompanha o avanço.

## 2. Estado do projeto e publicação

- Aplicação web Next.js no diretório apps/web.
- Regras de domínio TypeScript em packages/core/src.
- Banco PostgreSQL e autenticação hospedados no Supabase.
- Repositório GitHub privado samisleither/AtlasSistema, branch main. O commit inicial registrado no histórico é c2e1b2f.
- Projeto Vercel atlas-sistema, Root Directory apps/web.
- Domínio de produção: https://atlas-sistema.vercel.app.
- Supabase configurado na Vercel com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para Production e Preview.
- A Standard Protection da Vercel foi mantida: o domínio de produção é público; URLs de implantação/preview podem solicitar autenticação da Vercel.
- A pessoa responsável confirmou que o domínio de produção abriu sem a tela de autenticação da Vercel e que a implantação passou a reconhecer a configuração do Supabase.
- O login real de uma conta na versão pública não foi confirmado neste histórico; deve ser verificado manualmente.

## 3. Perfis e fluxo principal

O perfil operacional implementado é estudante autenticado pelo Supabase Auth. O banco define também o enum administrador, mas não há painel ou fluxo administrativo no site.

Fluxo pretendido:
1. Criar conta com nome, e-mail e senha; selecionar um foco de estudo; informar opcionalmente a data da prova.
2. Entrar com e-mail e senha.
3. Cadastrar matérias e tópicos.
4. Gerar cronograma até a data da prova usando horas disponíveis por dia.
5. Acompanhar o estudo de hoje e revisões.
6. Marcar sessões concluídas ou não realizadas.
7. Ver a linha do tempo e o indicador de ritmo.

## 4. Rotas e telas

| Rota | Conteúdo |
|---|---|
| / | Diário do estudante, matérias, linha do tempo e cartões básicos de progresso. Sem sessão, mostra um cartão com link de login. |
| /cadastro | Formulário de cadastro com nome, e-mail, senha, confirmação, foco de estudo e data da prova opcional. |
| /login | Login por senha e estado de sessão já autenticada. |
| /recuperar-senha | Solicitação de link de redefinição por e-mail. |

A tela e a rota /redefinir-senha não existem, embora /recuperar-senha envie o link para esse destino. Portanto, a jornada de redefinição de senha não está completa.

Não há aba Métricas. A tela Diário mantém cartões de ritmo, dias até a prova e avanço do plano.

## 5. Requisitos funcionais e estado no código

| Capacidade | Estado | Observação |
|---|---|---|
| Cadastro e autenticação | Parcialmente implementado | Usa Supabase Auth. O trigger cria uma linha em usuarios. A autenticação de produção ainda precisa de teste manual. |
| Perfil de estudante | Parcialmente implementado | Nome, e-mail, data da prova e disponibilidade existem no modelo. O foco escolhido no cadastro vai para user metadata e não é usado no diário. |
| Recuperação de senha | Incompleta | A solicitação por e-mail existe; falta a rota de retorno para definir a nova senha. |
| Cadastro de matérias | Implementado para criação | Nome, dificuldade fácil/médio/difícil e cor padrão. Não há edição ou exclusão de matéria na interface. |
| Cadastro de tópicos | Implementado para criação | Nome, matéria e ordem inicial. Não há edição, reordenação ou exclusão de tópico na interface. |
| Geração de cronograma | Implementado com ressalvas | Prioriza matérias difíceis e usa disponibilidade semanal. A substituição de sessões pendentes e os limites de data precisam de validação. |
| Diário de hoje | Implementado | Exibe sessões pendentes para a data calculada no cliente e revisões pendentes da mesma data. |
| Conclusão de sessão | Parcialmente implementada | Atualiza sessão/tópico e o trigger SQL cria revisões. O estado local usa IDs gerados no navegador que não correspondem aos UUIDs persistidos. |
| Marcar sessão como não feita | Parcialmente implementado | Algoritmo existe em packages/core; persistência de sessões remanejadas tem incompatibilidade entre IDs de texto e a coluna UUID. |
| Revisões espaçadas | Parcialmente implementadas | O trigger agenda 1, 3, 7 e 15 dias. A interface pode tentar concluir IDs locais em vez dos IDs do banco. |
| Indicador de ritmo | Parcialmente implementado | Calcula atraso e avanço, mas inclui sessões futuras concluídas no total concluído “até hoje”. |
| Exclusão de conta | Não confiável | Há botão, mas o cliente tenta apagar usuarios sem política DELETE, ignora o erro e depois encerra a sessão. Não apaga auth.users. |
| Métricas/analytics | Fora do escopo atual | A aba própria foi removida. Os cartões básicos do diário não são relatórios analíticos. |

## 6. Regras de domínio implementadas

### Cronograma

- O calendário vai da data inicial até antes da data da prova.
- Cada hora inteira disponível representa um slot de tópico por dia.
- Matérias difíceis têm peso maior; matérias médias vêm depois e fáceis por último.
- A ordem dos tópicos da mesma matéria é preservada.
- Se todos os dias tiverem zero horas, o algoritmo tenta usar um slot por dia.
- Se não houver dias disponíveis porque a prova é hoje ou já passou, a geração inicial coloca sessões na data inicial.
- As horas padrão do perfil no schema são 2 de segunda a sexta, 4 no sábado e 0 no domingo. Não existe tela para editar a disponibilidade semanal.

### Revisões

- Ao mudar uma sessão para feita, o trigger handle_sessao_concluida atualiza o tópico e cria quatro revisões para D+1, D+3, D+7 e D+15.
- O agendamento persistido usa CURRENT_DATE do banco.
- A camada web também calcula objetos de revisão locais para atualizar a interface, mas esses objetos recebem IDs de texto; o banco usa UUID. A tela deve recarregar as revisões persistidas ou receber os registros reais do trigger antes de permitir atualização confiável.

### Indicador

O indicador compara sessões planejadas até hoje com sessões concluídas, calcula percentual global e dias restantes. Atualmente, a seleção de concluídas não limita data_realizada/data_planejada até hoje, o que pode mostrar ritmo incorreto se sessões futuras forem concluídas antes do prazo.

## 7. Banco de dados

O schema.sql define PostgreSQL/Supabase com UUID e as seguintes tabelas:

| Tabela | Papel e campos principais |
|---|---|
| usuarios | Perfil associado a auth.users; nome, e-mail, tipo, data_prova, horas_por_dia, ativo e timestamps. |
| materias | Matérias do usuário, dificuldade e cor identificadora. |
| topicos | Tópicos vinculados a matéria e usuário, ordem e status. |
| sessao_estudo | Sessão/tópico, data planejada, data realizada e status. |
| revisao | Tópico, intervalo, data agendada/conclusão e status. |

Os enums cobrem dificuldades, status de tópico, sessão, revisão e tipo de usuário. Há índices para consultas por usuário, matéria e datas. As relações usam exclusão em cascata nos registros de estudo.

### Triggers

- on_auth_user_created cria o perfil público quando uma conta é inserida em auth.users.
- on_sessao_estudo_concluida marca o tópico como concluído e cria as quatro revisões quando a sessão transita para feita.

O script não é um sistema de migrations: tipos e políticas são criados sem proteção geral contra reaplicação. Instale em um projeto limpo ou prepare migrations antes de evoluir o schema.

## 8. Arquitetura e interface

- Next.js App Router, React client components, TypeScript e Tailwind CSS.
- Supabase JS inicializado no cliente do navegador.
- O contexto AuthProvider carrega a sessão e perfil; a tela principal busca matérias, tópicos, sessões e revisões para o usuário autenticado.
- packages/core/src contém tipos, geração de cronograma, replanejamento, repetição espaçada e cálculo de ritmo. A aplicação usa o alias TypeScript @atlas/core.
- Estilo editorial claro com Fraunces para títulos, Inter para texto, cores de papel/linho/tinta e cartões arredondados.
- Interface em pt-BR, com navegação Diário, Disciplinas e Cronograma.
- O repositório não contém app mobile, rotas de API de servidor, notificações, modo offline, simulados, streaks ou relatórios de desempenho.

## 9. Segurança e operação

- RLS está habilitada no schema para usuarios, materias, topicos, sessao_estudo e revisao; a pessoa responsável confirmou que as cinco tabelas estavam ativas no Supabase.
- Matérias, tópicos, sessões e revisões têm políticas por usuario_id autenticado. O perfil permite leitura/atualização da própria linha.
- O site usa a chave Publishable no cliente, que é pública por design. A segurança dos dados depende das políticas RLS. Não existe chave service_role ou sb_secret em apps/web/src, packages/core ou schema.sql.
- .gitignore exclui .env, .env.*, node_modules, .next, build, logs e senha.txt. A auditoria não encontrou arquivos .env nem senha.txt rastreados pelo Git.
- A política de UPDATE de usuarios permite ao dono alterar a linha inteira, inclusive tipo, ativo e e-mail. Isso permite um usuário definir o próprio tipo como administrador. Corrigir a autorização por coluna ou proteger tipo/ativo em função segura antes de adicionar qualquer recurso administrativo.
- As funções SECURITY DEFINER do schema devem fixar search_path e ser revisadas quanto a privilégios mínimos.
- O login do site (Supabase) é distinto da proteção de implantação da Vercel. O domínio está público; os previews podem continuar protegidos.

## 10. Pendências prioritárias identificadas na auditoria

1. **Segurança de perfil:** impedir alteração própria do campo tipo e de outros campos controlados pelo sistema.
2. **Exclusão de conta:** implementar exclusão de auth.users por função de servidor segura; nunca expor service_role no navegador. Não mostrar sucesso até conferir erros.
3. **Replanejamento:** alinhar IDs gerados com UUIDs do banco, tratar ausência de dias no calendário, checar erros de upsert e só atualizar a interface após persistência.
4. **Revisões:** atualizar o estado da interface com registros reais criados pelo trigger, tratar erros do update e evitar IDs locais fictícios.
5. **Recuperação de senha:** implementar /redefinir-senha e configurar URLs de retorno permitidas no Supabase Auth para o domínio de produção.
6. **Indicador de ritmo:** contar somente conclusões válidas até a data atual e tratar timezone/data local.
7. **CRUD de conteúdo:** adicionar edição e exclusão de matérias e tópicos, ou remover a promessa desses fluxos.
8. **Preferências:** permitir editar horas por dia; persistir e utilizar o foco de estudo escolhido.
9. **Erros de dados:** inspecionar e exibir erros de consultas/leitura e escritas; várias operações atuais ignoram o campo error do Supabase.
10. **Schema e manutenção:** criar migrations versionadas e restrições de integridade para impedir que um tópico de um usuário referencie matéria de outro.

## 11. Verificação realizada

- Inspeção estática de todas as páginas, módulos TypeScript, estilos, configurações e schema SQL presentes no repositório.
- Busca no código de apps/web/src, packages/core e schema.sql não encontrou localStorage, mocks, dados fake/demo ou chaves service_role/sb_secret.
- Não há diretório apps/mobile nem rota /redefinir-senha.
- A pessoa responsável relatou cadastro/login funcionando durante configuração local, tabelas e RLS ativas, revisões nos intervalos 1, 3, 7 e 15, implantação Vercel concluída e domínio de produção acessível.
- A autenticação completa na produção e os fluxos de replanejamento, redefinição de senha e exclusão de conta não foram verificados neste trabalho.
- Não foi executado build ou conjunto de testes. O package.json da aplicação não define script de testes automatizados.

## 12. Fora do escopo atual

Aplicativo iOS/Android, uso offline, notificações, simulados, integração de conteúdo, análise de desempenho, gamificação, colaboração/grupos, painel de responsáveis, painel administrativo e modelo de monetização.
