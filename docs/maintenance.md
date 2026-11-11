---
description: Manutenção da documentação, compatibilidade e releases do kit.
---

# Manutenção e releases

Este guia é para quem mantém o AgentDevKit. Para atualizar o kit em um projeto,
use o [guia de instalação](installation.md).

## Manter a documentação útil

Documente uma tarefa por página: objetivo, pré-requisito, exemplo, resultado
esperado e como resolver os erros mais comuns. O README apresenta o produto;
a [wiki](README.md) direciona a leitura; a referência guarda os detalhes.

Mantenha procedimentos em sua origem e use links. Uma regra nova pertence ao
hub, não a cópias de texto em cada cliente. Guias de uso vivem em `docs/`;
contratos específicos ficam junto à skill, script ou ferramenta.

Ao mudar um comando, revise exemplos, ajuda, tradução e próximos passos. Ao
mudar um cliente, revise [compatibilidade][clients], política, apontamentos e
testes. Preserve os metadados nativos exigidos por cada formato.

Confira todos os Markdown alterados: frontmatter, H1, links, blocos de código
e lint. Execute os exemplos em alvos isolados. Diferencie resultado observado
de comportamento esperado; não publique saídas locais como prova permanente.

## Preparar uma versão

1. Atualize a versão em `package.json` e no lockfile, o changelog e os exemplos
   que dependem dela. Registre escopo e critérios da entrega.
2. Execute os testes de [contribuição](../CONTRIBUTING.md), a matriz funcional
   quando aplicável e a revisão independente da entrega.
3. Envie o commit revisado. O [CI][ci] testa seis combinações de sistema/Node,
   gera o pacote, testa o tarball exato e guarda quatro arquivos no artifact:
   `.tgz`, `SHA256SUMS`, `NOTES.txt` e `package-manifest.json`.
4. Para uma **nova versão aprovada**, crie e envie sua tag `v<versao>`.
   A tag deve corresponder ao `package.json` e ao lockfile. Não mova uma tag
   já publicada. Publicar exige permissão no repositório.

O [workflow de release][release] executa o CI e baixa o artifact pelo seu ID.
Confere o SHA-256 contra o valor do job que o testou e contra `SHA256SUMS`;
publica esse mesmo arquivo e o checksum. Não reempacota entre teste e publicação.
Uma falha bloqueia a publicação; uma release existente não é sobrescrita.
Somente o job de publicação tem permissão para escrever no repositório.

## Gerar ou publicar pelo Actions

Para **gerar um pacote sem publicar uma release**, abra
[Actions → CI][ci-page], selecione **Run workflow** e escolha a branch.
Ao terminar, baixe `agentdevkit-<commit>-<tentativa>` na seção **Artifacts**.
O pacote também é gerado nos pushes e PRs aprovados pelo CI.

Esses artifacts duram 14 dias e seu download exige login no GitHub. Releases
são o canal público para instalação; um artifact de branch não é uma versão
publicada. Nenhum tarball ou relatório é commitado no repositório.

O envio de uma nova tag inicia a release automaticamente. Para repetir uma
publicação que falhou, corrija a causa e use **Re-run failed jobs**. Também é
possível iniciar o workflow para uma tag existente com GitHub CLI autenticada:

```sh
gh workflow run release.yml --ref vX.Y.Z
```

Substitua pela tag real, que deve conter o workflow atualizado. Executar
Release em uma branch é recusado; uma tag já publicada continua preservada.
O workflow usa `GITHUB_TOKEN`, sem exigir token pessoal salvo nos secrets.

## Conferir o pacote localmente

Para investigar o empacotamento antes de enviar mudanças:

```sh
npm run pack:release
```

O diretório `.agent-tests/release/<versao>/` recebe os mesmos quatro arquivos.
Para testar o pacote da versão atual:

```sh
ADK_BUILD="$PWD/.agent-tests/release/0.0.2"
export AGENTDEVKIT_TARBALL="$ADK_BUILD/agentdevkit-0.0.2.tgz"
npm run test:distribution
```

No PowerShell, atribua o caminho absoluto a `$env:AGENTDEVKIT_TARBALL`.
Essa variável seleciona o pacote existente, sem reempacotá-lo. `npm pack`
sozinho não publica no GitHub nem no registro npm.

## Conferir após publicar

Abra a release, baixe o pacote e `SHA256SUMS`, confira o SHA-256 e instale o
arquivo público em um projeto descartável. Execute `doctor` e `sync --check`.
Isso verifica a distribuição acessível ao usuário, além do checkout local.

A [release v0.0.1][v1] é a primeira publicação. Correções de documentação em
`master` podem ser mais recentes que seus arquivos; o pacote de uma release
permanece ligado à versão publicada.

## Ler o CI corretamente

O [CI][ci] tem seis combinações: três sistemas operacionais com Node 24 e 26.
Ele executa testes do produto, testes da infraestrutura e verificações dos
recursos. O lint Markdown é instalado no job Linux/Node 24.
Depois das seis combinações, o job **Verified package** testa a distribuição
e disponibiliza o artifact. Ele também precisa passar para concluir o CI.

A matriz funcional de oito projetos é uma execução separada de
`testar-maturidade run`; não confunda seus cenários com os seis jobs do CI.
Resultados ficam em diretórios ignorados. Falhas e restrições do ambiente
devem acompanhar a revisão, sem prometer validação de clientes não executados.

[Wiki](README.md) · [Design](design.md) · [Contribuir](../CONTRIBUTING.md)

[clients]: ../.pbai4devs/COMPATIBILIDADE.md
[ci]: https://github.com/pathbit/AgentDevKit/blob/master/.github/workflows/ci.yml
[release]: https://github.com/pathbit/AgentDevKit/blob/master/.github/workflows/release.yml
[v1]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.1
[ci-page]: https://github.com/pathbit/AgentDevKit/actions/workflows/ci.yml
