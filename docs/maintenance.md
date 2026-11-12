---
description: Verificação, pacotes e releases do AgentDevKit.
---

# Manutenção e releases

Para atualizar o kit em um projeto, use [instalação](installation.md).
Este guia explica como manter e publicar o gerador.

## Manter fontes e guias

Edite `src/` para o código, `tests/` para os testes e `.pbai4devs/` para os
recursos compartilhados. Documente objetivo, pré-requisito, exemplo e resultado
esperado. Use links para os detalhes e evite repetir a mesma regra.

Ao mudar layouts, revise templates, compatibilidade e testes. Ao mudar comandos,
revise ajuda, idiomas e exemplos. Markdown começa com frontmatter e H1.
Resultados e capturas de verificação permanecem ignorados.

## Verificar sem desperdiçar CI

O CI tem quatro perfis:

| Perfil | Responsabilidade |
| --- | --- |
| Linux / Node 24 | Fontes, produto, infraestrutura, lint e pacote real. |
| Windows / Node 24 | Portabilidade da CLI, arquivos e runtime. |
| macOS / Node 24 | Portabilidade da CLI, arquivos e runtime. |
| Linux / Node 26 | Smoke de compatibilidade. |

A distribuição real é testada uma vez no perfil completo. Os outros perfis
validam seus riscos específicos. Execuções antigas da mesma referência podem
ser canceladas quando substituídas, sem cancelar uma publicação em andamento.

`npm run verify` executa o perfil completo. `ci:portable` e `ci:smoke`
executam os demais perfis localmente. `npm run test:examples` verifica os
cenários em `examples/generated/` quando a mudança afeta a geração.
A [contribuição](../CONTRIBUTING.md) explica os checks durante o desenvolvimento.

## Gerar um pacote

O [CI][ci] roda em pushes e PRs; também pode ser iniciado em **Run workflow**.
O perfil completo produz `agentdevkit-<versão>.tgz`, `SHA256SUMS`, notas e
manifesto. O artifact inclui commit, execução e checksum para identificar
exatamente o que foi testado. Downloads do Actions exigem login e expiram.
A instalação usa o pacote nomeado no [GitHub Packages](packages.md);
as releases preservam artefatos e checksums para auditoria.

Para investigar localmente:

```console
npm run build
```

O resultado fica em `.agent-tests/release/<versão>/`. Esse comando não publica
nada. Nunca versione o tarball ou seus relatórios.
`pack:release` permanece disponível com o mesmo comportamento.

## Publicar uma versão

1. Atualize versão e lockfile, changelog, exemplos e escopo da entrega.
2. Conclua testes, documentação e revisão independente.
3. Envie o commit à branch principal e aguarde o CI aprovado.
4. Crie e envie a tag `v<versão>` para esse mesmo commit.

O [workflow de release][release] localiza o CI aprovado de um push na branch
principal, confere o commit e baixa seu artifact por ID. Verifica procedência,
versão e checksum antes de publicar. Não repete a suíte nem reempacota.
Também envia o pacote npm ao [GitHub Packages](packages.md), confere sua
integridade no registro e testa versão, instalação, diagnóstico e sincronização
com a CLI instalada por ele.

Se o artifact expirou, reexecute o CI original do push e depois a release.
Uma execução manual de CI serve para diagnóstico, mas não substitui essa
procedência. Uma release existente não é sobrescrita.

Se o upload falhar após a criação do rascunho, ele permanece privado. Confira
o rascunho antes de tentar novamente: o publicador não substitui uma release
existente, mesmo em rascunho. Remova somente o rascunho incompleto dessa tentativa
após conferir a origem; nunca apague uma release publicada para repetir o fluxo.

Para reiniciar uma publicação que falhou, use **Re-run failed jobs** ou
`gh workflow run release.yml --ref vX.Y.Z` com a tag real. O token do workflow
cuida da publicação; não é necessário guardar um token pessoal nos secrets.

Se a release já existe e falta somente o pacote no registro, use o modo
`package_only` descrito em [GitHub Packages](packages.md#publicar-pelo-actions).
Ele não tenta recriar a release existente.

## Conferir a entrega pública

Confira a versão na [página do pacote][package] e instale pelo nome em um
projeto descartável, seguindo [GitHub Packages](packages.md). Teste seleção,
`doctor` e `sync --check`. Compare a integridade do registro com o artefato
aprovado; uma aprovação de CI não substitui a instalação real pelo registro.

[Wiki](README.md) · [Comunidade](community.md)

[ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/ci.yml
[release]: https://github.com/pathbit/AgentDevKit/actions/workflows/release.yml
[package]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
