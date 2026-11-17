---
description: Inventário inicial da configuração do AgentDevKit.
preparacao: concluido
configuracao_tecnica: concluido
ambiente_local:
  compose: infra/compose/compose.local.yml
  porta: null
  host: null
  ferramentas: .pbai4devs/tools/
documentos:
  readme: README.md
  contribuicao: CONTRIBUTING.md
  changelog: CHANGELOG.md
  seguranca: docs/guides/security.md
  adrs: null
  prd: docs/product/prd.md
  ux_ui: docs/product/ux-ui.md
  design: docs/product/design.md
  roadmap: docs/product/roadmap.md
  releases: null
  specs: docs/specs
  tarefas: docs/tasks
---

# Configuração do projeto

## Inventário

O PRD, a experiência da CLI e o design existentes estão registrados como
aprovados. O roadmap e o índice de specs registram o trabalho e suas auditorias.
O inventário não comprova a implementação de cada critério.
Uma inspeção local com `inspecionar-projeto` identificou os documentos existentes;
os resultados precisam ser novamente registrados como evidência compartilhável.

## Preparação e configuração técnica

- A preparação e a configuração técnica foram conferidas no ambiente local
  descrito abaixo. Sua conclusão não atesta que o produto esteja sem defeitos.
- O projeto é uma CLI Node.js; não foi identificado servidor, porta ou serviço
  persistente. O Compose registrado executa a CLI e termina.
- Pré-requisitos, ferramentas, build e fluxo básico foram verificados no
  ambiente utilizado; os limites de plataforma e os testes pendentes são reais.
- Conciliar os critérios históricos de rollback com a evolução de recuperação
  antes de considerá-la pronta para implementação.

## Evidências locais de preparação

Em 15 de novembro de 2026, o diagnóstico identificou macOS ARM64, Node
`26.13.0`, npm `11.20.0`, Git disponível e Docker/Compose com daemon acessível.
O `setup all` instalou ou reutilizou as 11 ferramentas compatíveis e confirmou
suas versões; o diagnóstico posterior não apontou ferramentas ausentes.
As evidências locais estão em `.agent-tests/preparacao-recuperacao-o83wpC/`.

O teste do gerenciador de ferramentas passou em 115 casos. As sete provas
funcionais de ferramentas da Vercel passaram com fixtures; elas não executam
navegador, produto, proxy, TLS ou gravação de vídeo. O relatório local está em
`.agent-tests/vercel-labs/smoke-vKkYOM/REPORT.json`.

Seis testes estritos de recuperação falharam ao reproduzir a perda de
substitutos humanos no instalador e no sync, inclusive após atualização no
instalador. Um sétimo identificou chamadas mutadoras após a falha. Essas provas
reproduzem defeitos do produto, não indisponibilidade de Docker ou do runtime.
Elas impedem declarar a recuperação segura ou aprovar uma release. A conciliação
do contrato histórico de rollback continua pendente.

Uma fixture com conteúdo humano sintético confirmou que um backup pode ficar
visível ao Git quando o projeto não o ignora; índice e ignores permaneceram
intactos. Os guias agora orientam conferir a visibilidade antes de adicionar
arquivos ao Git.

Uma prova temporária com Compose executou o pacote candidato local `0.0.30`
em Node 24, sem rede, sobre um projeto sintético preexistente. As seis operações
preservaram arquivos humanos e os arquivos Git monitorados. Isso não comprova
recuperação concorrente, Windows ou configuração permanente do projeto.

Em 15 de novembro de 2026, antes da configuração permanente,
`inspecionar-projeto --check` identificou ausência
de `infra/compose/compose.local.yml`, `.dockerignore` e `Makefile` e retornou
contrato incompleto. O inventário documental terminou sem avisos ou truncamento.
O relatório local está em `.agent-tests/revisao-recuperacao-2a5Fou/inventario.json`.
A aplicação é uma CLI de execução curta, sem servidor ou porta.

Foram acrescentados Compose, `.dockerignore` e `Makefile`. O diagnóstico,
`make setup`, `make up` e `make lint` passaram no macOS; a CLI foi executada
no container Linux Node 24, sem rede. O build passou em cópia temporária; o
artefato anterior de `0.0.30` foi preservado. A prova do contexto Docker
confirmou sete arquivos mantidos e 37 excluídos em fixture sintética.
Após esses ajustes, `inspecionar-projeto --check` registrou contrato estrutural
completo. As revisões identificaram riscos no build direto e na recuperação;
os achados permanecem abertos e impedem declarar a entrega completa.

Antes da correção pontual de permissões, `make test` terminou com 658
aprovações, uma prova NTFS ignorada e oito TODOs. A reprodução de permissões
passou após a correção em macOS e Linux; na época, sete TODOs de recuperação
não executavam as fixtures na suíte padrão e falhavam em modo estrito. Hoje são
onze casos portáteis pendentes após incluir atualização concorrente no sync e
limpeza após publicação, dois casos adicionais de backup concorrente, quatro
de metadados e seis de proteção de arquivo em macOS, e três de xattr em Linux.
As seis novas provas verificam recusa por ACL ou flag imutável no estado
observado; o update usa legado sintético. A suíte padrão anterior não comprova
a correção. Logs estão em
`.agent-tests/configuracao-cli-8AkUjb/`.
