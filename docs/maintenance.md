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
3. Prepare o pacote local e teste exatamente o arquivo produzido:

   ```sh
   npm run pack:release
   ```

   O diretório `.agent-tests/release/<versao>/` recebe o tarball renomeado,
   `SHA256SUMS`, notas e manifesto. Para a versão atual:

   ```sh
   ADK_BUILD="$PWD/.agent-tests/release/0.0.1"
   export AGENTDEVKIT_TARBALL="$ADK_BUILD/agentdevkit-0.0.1.tgz"
   node --test tests/distribution.test.mjs
   ```

   No PowerShell, atribua o caminho absoluto a `$env:AGENTDEVKIT_TARBALL`.
   Essa variável faz o teste usar o pacote existente, sem substituí-lo por
   outro empacotamento. Não execute uma publicação para testar a documentação.
4. Revise o diff, as identidades Git e as evidências antes de enviar o commit.
   A tag de versão deve apontar para esse commit revisado.
5. Somente para uma **nova versão aprovada**, envie sua tag `v<versao>`.
   Não mova uma tag já publicada. Publicar exige permissão no repositório.

O [workflow de release][release] roda primeiro o CI, empacota, testa o tarball
exato e publica esse arquivo com seu checksum. `npm pack` sozinho não publica
no GitHub nem no registro npm. A distribuição atual usa assets do GitHub.

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

A matriz funcional de oito projetos é uma execução separada de
`testar-maturidade run`; não confunda seus cenários com os seis jobs do CI.
Resultados ficam em diretórios ignorados. Falhas e restrições do ambiente
devem acompanhar a revisão, sem prometer validação de clientes não executados.

[Wiki](README.md) · [Design](design.md) · [Contribuir](../CONTRIBUTING.md)

[clients]: ../.pbai4devs/COMPATIBILIDADE.md
[ci]: https://github.com/pathbit/AgentDevKit/blob/master/.github/workflows/ci.yml
[release]: https://github.com/pathbit/AgentDevKit/blob/master/.github/workflows/release.yml
[v1]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.1
