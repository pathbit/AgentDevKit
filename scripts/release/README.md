---
description: >-
  Empacotamento, verificações do CI e publicação do artefato aprovado.
---

# Release

`assets.mjs` gera o tarball, checksum, notas e manifesto em
`.agent-tests/release/<versão>/`. Requer Node.js 24+ e npm.
As notas incluem comandos npx versionados para npm e GitHub Packages,
autenticação por host e links para instalação e pré-requisitos.

`pipeline.mjs full` verifica produto, infraestrutura, Markdown e o tarball
exato uma vez. O perfil prepara o CLI `skills` para testar a integração real
com uma fixture local. O relatório de infraestrutura registra os testes
exclusivos de outra plataforma como parciais. O pipeline aceita somente
as omissões previstas. O perfil `full` verifica os casos Linux e
`portable-resources` exige aprovação individual dos casos delegados no macOS e
no Windows. Falhas ou ferramentas ausentes bloqueiam a verificação.
`portable` executa todos os grupos de portabilidade localmente;
no CI, `portable-cli`, `portable-source-integration`, `portable-selection`,
`portable-selection-lifecycle`,
`portable-selection-codex`, `portable-selection-all-root`, `portable-selection-all-leaf`,
`portable-projects`, `portable-projects-git`, `portable-projects-callbacks`,
`portable-projects-matrix`,
`portable-recovery`, `portable-recovery-metadata`, `portable-migration`,
`portable-cli-line-endings`,
`portable-resources`, `portable-resources-clients`, `portable-claude-rule-cli`,
`portable-resources-managed`, `portable-managed-content`,
`portable-managed-lifecycle`, `portable-managed-protection`,
`portable-resources-gemini`, `portable-resources-gemini-staged`,
`portable-sync-core`, `portable-sync-core-updates`, `portable-sync-ownership`,
`portable-sync-preservation` e `portable-layout` rodam em jobs separados no
Windows e no macOS. Os quatro perfis de sync executam os sete módulos do
ponto de entrada `tests/TEST.mjs` do sincronizador. Os dois perfis de núcleo
usam filtros complementares no mesmo módulo. No Windows,
`portable-cli` confere se a instalação e o sync direto preservam a DACL de
arquivos atualizados em NTFS, usando uma regra explícita de leitura na fixture.
`portable-source-integration` isola o teste de convergência entre a CLI e a
sincronização direta, incluindo a preservação do ignore e do índice Git.
Os testes de conteúdo gerenciado, ciclo de vida e proteção de alterações
humanas compartilham a fixture e executam em jobs dedicados.
Callbacks isolados e testes de matriz ficam separados para limitar a duração
de cada job. Os testes Git de maior duração e a preservação de CRLF têm jobs
próprios. O pipeline limita cada processo a 50 minutos no Windows e 40 nos
demais sistemas. O job de verificação tem até 60 minutos para
executar todos os seus passos. Os perfis portáteis usam a saída TAP no Actions
para registrar falhas conforme os testes terminam.
Os cinco casos de obstrução são preservados; os três casos de raiz e grupo e os
dois de folha da seleção all ficam em perfis separados. `full` ainda executa
todas as suítes.
`smoke` verifica Node 26.
`check` confere os recursos.

`auto-tag.mjs` aguarda com releituras limitadas se a API ainda não mostrar a
tag que acabou de criar. A release só é disparada após confirmar que a tag
aponta para o commit aprovado pelo CI.

`publish.mjs resolve` localiza um CI de push aprovado do mesmo commit da tag.
O resolvedor espera até 65 minutos se a execução ainda estiver em andamento.
`publish` confere procedência e hashes, e publica os mesmos bytes. Ausência de
artefato válido exige executar o CI; a publicação não gera outro pacote.

`packages.mjs` publica esse mesmo tarball no npm público e no GitHub Packages,
e verifica a CLI instalada por cada registro. O consumo do npm é anônimo;
no GitHub, autenticado. O modo manual `package_only` atende tags já publicadas
sem recriar a release. Veja [os dois registries](../../docs/maintainers/packages.md).

O workflow prioriza o secret `NPMJS_TOKEN`, recebido como `NPM_TOKEN` na
publicação npm; sem ele, usa OIDC. GitHub Packages usa seu próprio token do
workflow, sem compartilhar credenciais entre os hosts. Nenhum segredo ou
resultado é versionado.
Veja [manutenção](../../docs/maintainers/maintenance.md).

O build prepara os arquivos em área temporária e preserva uma saída anterior
divergente. Uma repetição aceita o mesmo conteúdo, inclusive o manifesto legado
com marca de verificação no formato reconhecido, sem reescrevê-lo. A marca antiga
não substitui as verificações da execução atual.

Após verificar o tarball, o perfil completo cria uma cópia marcada em diretório
exclusivo do runner, sem alterar o manifesto de origem. No CI, a opção explícita
`--github-output` informa ao passo de upload o caminho dessa cópia; a opção
exige `GITHUB_OUTPUT` em `RUNNER_TEMP` e fora do projeto. Falhas ou alterações
no diretório de origem não são resolvidas substituindo arquivos existentes.

Links simbólicos estáticos em `.agent-tests` ou na pasta `release` são
recusados. Se a limpeza falhar, preserve os caminhos informados e revise os
resíduos antes de tentar novamente. As verificações não são atômicas contra
alterações concorrentes nem comprovam ACLs ou atributos estendidos.
