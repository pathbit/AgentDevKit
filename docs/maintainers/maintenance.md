---
description: Verificação, pacotes e releases do AgentDevKit.
---

# Manutenção e releases

Para atualizar o kit em um projeto, use [instalação](../guides/installation.md).
Este guia explica como manter e publicar o gerador.

## Manter fontes e guias

Edite `src/` para o código, `tests/` para os testes e `.pbai4devs/` para os
recursos compartilhados. Documente objetivo, pré-requisito, exemplo e resultado
esperado. Use links para os detalhes e evite repetir a mesma regra.

Ao mudar layouts, revise templates, compatibilidade e testes. Ao mudar comandos,
revise ajuda, idiomas e exemplos. Markdown começa com frontmatter e H1.
Resultados e capturas de verificação permanecem ignorados.

## Verificar sem desperdiçar CI

O CI verifica Linux e distribui a portabilidade em grupos independentes:

| Perfil | Responsabilidade |
| --- | --- |
| Linux / Node 24 | Fontes, produto, infraestrutura, lint e pacote real. |
| Windows / Node 24 | CLI, projetos, recursos e layout em jobs separados. |
| macOS / Node 24 | Os mesmos grupos de portabilidade em jobs separados. |
| Linux / Node 26 | Smoke de compatibilidade. |

O perfil macOS usa o runner padrão `macos-15-intel`. O label `macos-latest`
usa ARM64 e pode ter filas diferentes; confira os [runners disponíveis][runners]
antes de mudar a arquitetura. Provas locais devem informar a arquitetura usada.

A distribuição real é testada uma vez no perfil completo. Todos os grupos de
Windows e macOS precisam passar para aprovar o CI. Cada grupo tem seu próprio
log e limite, o que facilita identificar o teste que falhou. Execuções antigas
da mesma referência podem
ser canceladas quando substituídas, sem cancelar uma publicação em andamento.
Novas suítes devem integrar um grupo portátil ou registrar uma justificativa
explícita para executar somente no perfil completo.

O workflow [Security tools smoke][security-ci] instala os três scanners com
pins revisados em Linux, macOS e Windows. Depois analisa fixtures locais sem
rede, com casos inseguros e corrigidos. Essa prova valida o funcionamento das
ferramentas; não certifica a segurança de uma aplicação. Relatórios normalizados
são guardados como artifacts, sem binários ou fontes das fixtures.

`npm run verify` executa o perfil completo. `ci:portable` e `ci:smoke`
executam os demais perfis localmente. `npm run test:examples` verifica os
cenários em `examples/generated/` quando a mudança afeta a geração.
A [contribuição](../../CONTRIBUTING.md) explica os checks durante o
desenvolvimento.

## Gerar um pacote

O [CI][ci] roda em pushes e PRs; também pode ser iniciado em **Run workflow**.
O perfil completo produz `agentdevkit-<versão>.tgz`, `SHA256SUMS`, notas e
manifesto. O artifact inclui commit, execução e checksum para identificar
exatamente o que foi testado. Downloads do Actions exigem login e expiram.
A instalação usa o pacote nomeado no [npm público](packages.md);
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
3. Envie o commit à branch principal e acompanhe o CI e a release.

Após toda a matriz de CI passar, a automação cria a tag `v<versão>` no
commit verificado e inicia o workflow de release. Um push sem mudança de versão
publicada não gera outra release. Uma tag existente não é movida: se a versão
mudou e a tag aponta para outro commit, a automação falha para revisão.
Versões inferiores às já registradas também não são publicadas automaticamente.
Se um push cancelar o CI anterior e a versão ainda não tiver tag, o próximo
CI aprovado da branch principal poderá publicar a versão no seu próprio commit.

O [workflow de release][release] localiza o CI aprovado de um push na branch
principal, confere o commit e baixa seu artifact por ID. Verifica procedência,
versão e checksum antes de publicar. Não repete a suíte nem reempacota.
Também envia o mesmo pacote ao [npm público e GitHub Packages](packages.md),
confere a integridade nos dois destinos e testa versão, instalação, diagnóstico
e sincronização. O consumo pelo npm é anônimo; pelo GitHub, autenticado.

A tag é a origem da publicação: `v0.0.21`, a release `v0.0.21` e os pacotes
`0.0.21` apontam para a mesma entrega. A execução manual também exige a tag;
não crie outra tag para uma versão nem mova uma tag já publicada. Publicações
feitas fora desse fluxo não criam tags automaticamente.

Para consultar o código de uma versão sem trocar os arquivos atuais:

```console
git fetch --tags
git worktree add --detach ../AgentDevKit-v0.0.19 v0.0.19
```

Em um projeto atendido, fixe a versão desejada do pacote e revise o plano antes
de aplicá-la:

```console
npx @pathbit/agentdevkit@0.0.19 update --dry-run --json
```

O comando usa aquela versão do kit; não reverte automaticamente o histórico
Git nem arquivos próprios do projeto. Confira os conflitos e faça backup antes
de aplicar uma versão anterior.

Se o artifact expirou ou um job do CI falhou, use **Re-run all jobs** no CI
original do push e aguarde todos os jobs. **Re-run failed jobs** pode manter o
pacote de uma tentativa anterior, que a release não aceita. Depois reexecute
a release.
Uma execução manual de CI serve para diagnóstico, mas não substitui essa
procedência. Uma release existente não é sobrescrita.

Se o upload falhar após a criação do rascunho, ele permanece privado. Confira
o rascunho antes de tentar novamente: o publicador não substitui uma release
existente, mesmo em rascunho. Remova somente o rascunho incompleto dessa
tentativa após conferir a origem; nunca apague uma release publicada para
repetir o fluxo.

Se a release ainda não existe, use **Re-run failed jobs** ou
`gh workflow run release.yml --ref vX.Y.Z` com a tag real. A publicação prioriza
o secret `NPMJS_TOKEN` do repositório; sem ele, usa OIDC, conforme
[publicação](packages.md).
Se a criação da tag ou o acionamento falhar, consulte a execução **Automatic
release tag**. Uma tag no commit correto pode ser retomada sem movê-la; se ela
apontar para outro commit, investigue antes de qualquer publicação.

Se a release já existe e falta somente o pacote em um registro, use o modo
`package_only` descrito em [pacote npm](packages.md#publicar-pelo-actions).
Ele não tenta recriar a release existente.

Execuções concluídas com falha podem ser removidas mediante solicitação,
sem apagar execuções aprovadas, tags ou releases. Confira a lista e preserve
os identificadores das execuções e releases mantidas antes da limpeza.

## Conferir a entrega pública

Confira a versão na [página do pacote][package] e instale pelo nome em um
projeto descartável, seguindo [pacote npm](packages.md). Teste seleção,
`doctor` e `sync --check`. Compare a integridade do registro com o artefato
aprovado; uma aprovação de CI não substitui a instalação real pelo registro.

[Wiki](../README.md) · [Comunidade](community.md)

[ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/ci.yml
[release]: https://github.com/pathbit/AgentDevKit/actions/workflows/release.yml
[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[security-ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/security-tools.yml
[runners]: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
