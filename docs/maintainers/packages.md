---
description: Instalação e publicação do pacote npm público do AgentDevKit.
---

# Pacote npm público

O AgentDevKit é um único pacote: [`@pathbit/agentdevkit`][package]. Ele contém
a CLI e os recursos compartilhados; a instalação prepara os apontamentos dos
agentes escolhidos no projeto.

## Instalar no projeto

Com Node.js 18+ e npm, execute na pasta do projeto. Não é necessário login:

```console
npx -y @pathbit/agentdevkit@0.0.5 init
```

Acrescente `--agents codex,claude` para selecionar clientes, `--dry-run` para
simular ou use `update`, `doctor` e `sync --check` no lugar de `init`.
Não é necessário instalar globalmente nem adicionar o kit às dependências
da aplicação. Para conferir as versões:

```console
npm view @pathbit/agentdevkit versions --json
```

Se existir um mapeamento antigo para o GitHub Packages, siga a
[correção de registry](../guides/troubleshooting.md#download-plataforma-ou-ferramenta-falhando).

## Publicar pelo Actions

A publicação usa o mesmo TGZ aprovado pelo CI, com acesso público. O workflow
confere versão, origem e integridade; uma versão existente só é aceita quando
contém os mesmos bytes. Não reempacote nem substitua uma versão publicada.

O mantenedor configura uma vez o **Trusted Publisher** do npm:

| Campo | Valor |
| --- | --- |
| Organization or user | `pathbit` |
| Repository | `AgentDevKit` |
| Workflow filename | `release.yml` |
| Allowed action | Publicação direta com `npm publish` |

O workflow recebe `id-token: write` e publica com OIDC. O npm exige CLI
11.5.1+ e Node 22.14+; o projeto usa Node 24. A primeira publicação exige uma
conta npm com acesso ao escopo `@pathbit`. Depois que o pacote existir,
configure a relação de confiança nas configurações dele. Um `NPM_TOKEN`
granular nos secrets do repositório é a alternativa para publicação
automatizada. Credenciais nunca entram nos arquivos versionados.

Para publicar somente o pacote de uma tag que já tem artefato aprovado:

```console
gh workflow run release.yml --ref master -f tag=v0.0.5 -F package_only=true
```

Se o artefato expirou, reexecute o CI original da tag antes da publicação.
Depois do envio, o job usa um ambiente sem credenciais e cache novo para
executar `--version`, `init`, `doctor` e `sync --check` pelo nome e versão
publicados. Assim, a verificação comprova o acesso de um usuário comum.

As versões antigas no [GitHub Packages][legacy] permanecem disponíveis;
o canal de instalação padrão é o npm público.

[Wiki](../README.md) · [Manutenção](maintenance.md) · [Instalação](../guides/installation.md)

[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[legacy]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
