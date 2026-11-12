---
description: Empacotamento, verificações do CI e publicação do artefato aprovado.
---

# Release

`assets.mjs` gera o tarball, checksum, notas e manifesto em
`.agent-tests/release/<versão>/`. Requer Node.js 24+ e npm.

`pipeline.mjs full` verifica produto, infraestrutura, Markdown e o tarball
exato uma vez. `portable` cobre CLI, arquivos e runtime em Windows/macOS;
`smoke` verifica compatibilidade com Node 26. `check` confere os recursos.

`publish.mjs resolve` localiza um CI de push aprovado do mesmo commit da tag.
`publish` confere procedência e hashes, e publica os mesmos bytes. Ausência de
artefato válido exige executar o CI; a publicação não gera outro pacote.

`packages.mjs` publica esse mesmo tarball no npm público e verifica a CLI
instalada pelo registro. O modo manual `package_only` atende tags já publicadas
sem recriar a release. Veja [pacote npm](../../docs/packages.md).

O workflow fornece o contexto GitHub e OIDC ou `NPM_TOKEN`. Nenhum segredo ou
resultado é versionado. Veja [manutenção](../../docs/maintenance.md).
