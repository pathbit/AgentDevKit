---
description: Publicação sincronizada do AgentDevKit no npm e no GitHub Packages.
---

# Pacote nos dois registries

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

O workflow prioriza o secret do repositório `NPMJS_TOKEN`, recebido pela
variável interna `NPM_TOKEN` somente na publicação. O token precisa permitir
publicar no escopo `@pathbit`; credenciais nunca entram nos arquivos
versionados.

O passo do GitHub Packages usa `GITHUB_TOKEN` com `packages: write` e confirma
a visibilidade pública. Tokens de um registry não são enviados ao outro.
O npm continua usando `NPMJS_TOKEN` ou OIDC, com prova de consumo anônimo;
as provas do GitHub usam autenticação própria.

Sem esse secret, o workflow usa OIDC. Configure o **Trusted Publisher** do npm:

| Campo | Valor |
| --- | --- |
| Organization or user | `pathbit` |
| Repository | `AgentDevKit` |
| Workflow filename | `release.yml` |
| Allowed action | Publicação direta com `npm publish` |

O fallback recebe `id-token: write`. O npm exige CLI 11.5.1+ e Node 22.14+;
o projeto usa Node 24. Configure a relação de confiança depois que o pacote
existir; a primeira publicação pode usar o secret `NPMJS_TOKEN`.

Por padrão, uma tag publica nos dois destinos. Para completar o GitHub
Packages de uma tag existente, preservando a release e o npm:

```console
gh workflow run Release -f tag=v0.0.12 -F package_only=true -f registry=github
```

Se o artefato expirou, reexecute o CI original da tag antes da publicação.
`registry` aceita `both`, `npm` ou `github`. `package_only` impede alterar a
release existente; cada registry recusa versões com bytes diferentes e pula
a publicação se a mesma versão já estiver correta.

Depois do envio ao npm, o job usa um ambiente sem credenciais e cache novo para
executar `--version`, `init`, `doctor` e `sync --check` pelo nome e versão
publicados. Assim, a verificação comprova o acesso de um usuário comum.
Confirme também que `latest` aponta para a versão estável e que o tarball é
baixável; metadados visíveis sozinhos não comprovam uma instalação funcional.
Se o registro ainda não disponibilizar o pacote, aguarde a verificação sem
republicar automaticamente a mesma versão.

O GitHub Packages verifica os mesmos comandos com autenticação. Metadados
devem indicar visibilidade pública e associação ao repositório correto.
Uma falha parcial permite repetir apenas o destino pendente usando o artefato
original; nunca recrie uma versão publicada com outro conteúdo.

[Wiki](../README.md) · [Manutenção](maintenance.md) ·
[Instalação](../guides/installation.md)

[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[github]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[fix]: ../guides/troubleshooting.md#download-plataforma-ou-ferramenta-falhando
