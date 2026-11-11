---
description: Verificação, pacotes e releases do AgentDevKit.
---

# Manutenção e releases

Para atualizar o kit em um projeto, use [instalação](installation.md).
Este guia explica como manter e publicar o gerador.

## Manter fontes e guias

Edite as fontes em `.pbai4devs`, não os apontamentos locais. Documente objetivo,
pré-requisito, exemplo e resultado esperado. Use links para os detalhes e evite
copiar a mesma regra para vários arquivos.

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

`npm run ci:full`, `ci:portable` e `ci:smoke` executam os perfis localmente.
A [contribuição](../CONTRIBUTING.md) explica os checks durante o desenvolvimento.

## Gerar um pacote

O [CI][ci] roda em pushes e PRs; também pode ser iniciado em **Run workflow**.
O perfil completo produz `agentdevkit-<versão>.tgz`, `SHA256SUMS`, notas e
manifesto. O artifact inclui commit, execução e checksum para identificar
exatamente o que foi testado. Downloads do Actions exigem login e expiram;
releases são o canal público de instalação.

Para investigar localmente:

```console
npm run pack:release
```

O resultado fica em `.agent-tests/release/<versão>/`. Esse comando não publica
nada. Nunca versione o tarball ou seus relatórios.

## Publicar uma versão

1. Atualize versão e lockfile, changelog, exemplos e escopo da entrega.
2. Conclua testes, documentação e revisão independente.
3. Envie o commit à branch principal e aguarde o CI aprovado.
4. Crie e envie a tag `v<versão>` para esse mesmo commit.

O [workflow de release][release] localiza o CI aprovado de um push na branch
principal, confere o commit e baixa seu artifact por ID. Verifica procedência,
versão e checksum antes de publicar. Não repete a suíte nem reempacota.
Também envia o pacote npm ao [GitHub Packages](packages.md), confere sua
integridade no registro e executa a CLI instalada por ele.

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

Baixe o pacote e o checksum pela release, confira SHA-256 e instale em um
projeto descartável por `npx`. Teste seleção, `doctor` e `sync --check`.
Uma aprovação de CI não substitui a prova de que o arquivo público é utilizável.

[Wiki](README.md) · [Comunidade](community.md)

[ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/ci.yml
[release]: https://github.com/pathbit/AgentDevKit/actions/workflows/release.yml
