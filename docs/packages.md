---
description: Publicação e instalação do pacote npm no GitHub Packages.
---

# GitHub Packages

O AgentDevKit é um único pacote: `@pathbit/agentdevkit`, vinculado a este
repositório e distribuído pelo registro `https://npm.pkg.github.com`.
O pacote contém a CLI e os recursos compartilhados. A instalação gera os
apontamentos dos agentes escolhidos no projeto.

## Instalar no projeto

Use Node.js 18+ com npm. Autentique uma vez nesta máquina:

```console
npm login --scope=@pathbit --auth-type=legacy --registry=https://npm.pkg.github.com
```

Informe seu usuário GitHub e um token pessoal **classic** com `read:packages`
e acesso ao pacote. Guarde a credencial na configuração do usuário, nunca
no repositório. Em seguida, na pasta do projeto:

```console
npx -y --registry=https://npm.pkg.github.com @pathbit/agentdevkit@0.0.4 init
```

Acrescente `--agents codex,claude` para selecionar clientes, `--dry-run` para
simular ou use `update`, `doctor` e `sync --check` no lugar de `init`.
Não é necessário instalar o kit globalmente nem adicioná-lo às dependências
da aplicação.

O GitHub exige autenticação também para pacotes npm públicos. Pacotes novos
começam privados; acesso e visibilidade ficam em **Package settings**.
Para instalar sem login no registro, use o tarball público descrito em
[instalação](installation.md#instalar-pelo-tarball-público).

## Publicar pelo Actions

Uma release publica o mesmo `.tgz` aprovado pelo CI no GitHub Packages.
O job usa `GITHUB_TOKEN` com `packages: write`; não exige um token pessoal
salvo nos secrets. Versão, origem e integridade são conferidas antes do envio.
Uma versão existente só é aceita se contiver os mesmos bytes.

Para adicionar ao registro uma release que já existe:

```console
gh workflow run release.yml --ref master -f tag=v0.0.3 -F package_only=true
```

Esse modo reutiliza o artefato do CI da tag. Ele não altera a tag nem recria a
release. Depois da publicação, o job confere o registro e executa a CLI por
`npm exec`, usando uma instalação temporária e a autenticação do workflow.

Se o artefato expirou, reexecute o CI original da tag antes da publicação.
Se a versão já contém bytes diferentes, escolha uma nova versão; não apague
ou substitua a distribuição existente.

[Wiki](README.md) · [Manutenção](maintenance.md) · [Instalação](installation.md)

Referências: [registro npm do GitHub][npm] e [acesso e visibilidade][access].

[npm]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[access]: https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
