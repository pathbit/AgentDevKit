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
exato uma vez. `portable` executa todos os grupos de portabilidade localmente;
no CI, `portable-cli`, `portable-projects`, `portable-resources` e
`portable-layout` rodam em jobs separados no Windows e no macOS. `smoke`
verifica compatibilidade com Node 26. `check` confere os recursos.

`publish.mjs resolve` localiza um CI de push aprovado do mesmo commit da tag.
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
