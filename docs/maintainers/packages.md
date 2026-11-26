---
description: Publicação sincronizada do AgentDevKit no npm e no GitHub Packages.
---

# Pacote nos dois registries

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O AgentDevKit é um único pacote: [`@pathbit/agentdevkit`][package]. Ele contém
a CLI e os recursos compartilhados; a instalação prepara os apontamentos dos
agentes escolhidos no projeto.

Cada versão usa o mesmo TGZ nos dois destinos, com o mesmo número e checksum.

| Destino | Visibilidade | Instalação |
| --- | --- | --- |
| [npm público][package] | Pública | `npx`, sem login; opção padrão. |
| [GitHub Packages][github] | Pública | Exige autenticação do GitHub. |

No GitHub Packages, público significa que o pacote é visível a todos;
o registry npm do GitHub exige token também para baixar pacotes públicos.
Consulte a [autenticação oficial][github-auth] se escolher esse destino.

Os metadados identificam PathBit como autor, palavras-chave do kit e licença
MIT. O README público é gerado sem frontmatter e com links absolutos do GitHub;
a fonte versionada conserva o YAML. O `LICENSE` canônico acompanha o pacote e
é instalado em `.pbai4devs/LICENSE`, sem alterar a licença do consumidor.
Ferramentas de terceiros baixadas à parte mantêm suas próprias licenças e
não integram o TGZ do AgentDevKit.

## Instalar no projeto

Prepare os [pré-requisitos](../guides/prerequisites.md), depois escolha o destino:

```console
npx @pathbit/agentdevkit init
```

O comando acima usa o npm público, sem login. Para GitHub Packages, faça a
[autenticação inicial](../guides/installation.md#github-packages) e execute:

```console
npx --registry=https://npm.pkg.github.com @pathbit/agentdevkit init
```

Para repetir uma instalação, fixe a versão após o nome, como
`@pathbit/agentdevkit@0.0.12`, nos dois destinos.

Acrescente `--agents codex,claude` para selecionar clientes, `--dry-run` para
simular ou use `update`, `doctor` e `sync --check` no lugar de `init`.
Não é necessário instalar globalmente nem adicionar o kit às dependências
da aplicação. Para conferir as versões:

```console
npm view @pathbit/agentdevkit versions --json
```

Se existir um mapeamento de `@pathbit` que impeça alternar o destino, siga o
[diagnóstico de registry][fix].

## Publicar pelo Actions

A publicação usa o mesmo TGZ aprovado pelo CI nos dois registries. O workflow
confere versão, origem e integridade; uma versão existente só é aceita quando
contém os mesmos bytes. Não reempacote nem substitua uma versão publicada.

O [Trusted Publisher do npm][trusted-publishing] permite publicar via OIDC
e gerar proveniência automaticamente. Cadastre `pathbit/AgentDevKit` com
o workflow `release.yml`, deixe o ambiente em branco e habilite
**Allow npm publish**.

No GitHub, defina a variável do repositório `NPMJS_AUTH_MODE=oidc` depois
de cadastrar a relação no npm. Sem a variável, o fluxo usa `NPMJS_TOKEN`
quando disponível. A publicação OIDC usa `id-token: write`, npm 11.5.1+
e Node.js 22.14+. O runner usa Node.js 24.

O GitHub Packages usa `GITHUB_TOKEN` com `packages: write`. O job de npm
verifica o download público sem credenciais.

Por padrão, uma tag publica nos dois destinos. Para completar o GitHub
Packages de uma tag existente, substitua `vX.Y.Z` pela tag desejada:

```console
gh workflow run Release -f tag=vX.Y.Z -F package_only=true -f registry=github
```

Se o artefato expirou, reexecute o CI do push à branch principal para o
commit exato apontado pela tag.
`registry` aceita `both`, `npm` ou `github`. `package_only` impede alterar a
release existente; cada registry recusa versões com bytes diferentes e pula
a publicação se a mesma versão já estiver correta.

Depois do envio ao npm, o job consulta o nome e a versão publicados e baixa
o tarball sem credenciais, em cache inicialmente vazio. Confere o SHA-256
dos bytes baixados com o artefato aprovado e reutiliza o cache isolado para
executar `--version`, `init`, `doctor` e `sync --check` offline a partir
do tarball verificado. A resolução pelo nome e a execução são provas separadas.
O job confirma que `latest` aponta para a versão publicada ou uma estável
posterior. Uma versão anterior ao `latest` só pode ser verificada se já
existir com os mesmos bytes.
Se o registro ainda não disponibilizar o pacote, aguarde a verificação sem
republicar automaticamente a mesma versão. Durante a propagação, `E404` e
`ETARGET` do download do tarball são repetidos dentro da mesma janela limitada.

O GitHub Packages verifica os mesmos comandos com autenticação. Metadados
devem indicar visibilidade pública e associação ao repositório correto.
Uma falha parcial permite repetir apenas o destino pendente usando o artefato
original; nunca recrie uma versão publicada com outro conteúdo.

[Wiki](../README.md) · [Manutenção](maintenance.md) ·
[Instalação](../guides/installation.md)

[trusted-publishing]: https://docs.npmjs.com/trusted-publishers/
[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[github]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[fix]: ../guides/troubleshooting.md#download-plataforma-ou-ferramenta-falhando

[reading-pt]: packages.md
[reading-en]: ../en/maintainers/packages.md
[reading-es]: ../es/maintainers/packages.md
