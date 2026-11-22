---
description: Instruções e fluxo de trabalho para agentes de código.
language: pt
---

# Pathbit AI - AgentDevKit

[English](README.en.md) · [Español](README.es.md) · [Pacote npm][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

O AgentDevKit orienta o trabalho com agentes de código, do planejamento à
verificação. Uma origem em `.pbai4devs` guarda skills, regras, comandos e
perfis. O kit gera apontamentos para
[Codex, Claude, Cursor, Copilot, OpenCode e outros clientes](.pbai4devs/COMPATIBILIDADE.md).

## Começar em um projeto

Prepare [Node.js 24+ e npm](docs/guides/prerequisites.md) no Windows, macOS ou
Linux. Na pasta do seu projeto, instale pelo **npm público**, sem login:

```console
npx @pathbit/agentdevkit init
```

Escolha os clientes na pergunta inicial ou passe `--agents codex,claude`.
A escolha fica salva por projeto e pode ser alterada com `agents`. Em modo
não interativo, `all` é o padrão quando não há escolha explícita ou salva.
A CLI aceita `pt`, `en` e `es`.
O [guia de instalação](docs/guides/installation.md) cobre pnpm, Yarn, Bun e
[GitHub Packages com autenticação][github-install].

## Escolha o que quer fazer

- **Planejar um produto novo ou uma evolução.** Consulte
  `next --intent product` para identificar a próxima etapa de planejamento.
- **Rodar uma aplicação existente.** Consulte `next --intent run` para
  receber orientação com base no estado atual do projeto.
- **Adotar só em alguns clientes.** Use `init --agents codex,claude` com os
  IDs de que precisa.

A instalação prepara os recursos dos agentes. Em um repositório existente,
use `npx @pathbit/agentdevkit init --dry-run` para ver as mudanças propostas
e os conflitos. O kit preserva as instruções e skills do projeto.
Com Git, siga as indicações do terminal por `doctor` e `sync --check` antes
de consultar o próximo passo para seu objetivo:

```console
npx @pathbit/agentdevkit next --intent product
npx @pathbit/agentdevkit next --intent run
```

O `next` indica o próximo passo. Para seguir a orientação no seu agente, peça
que ele leia `AGENTS.md` e use `proximos-passos` com seu objetivo.

### Use apenas o fluxo que a tarefa exige

O AgentDevKit serve como ponto de partida único para vários agentes. Use o
kit para preparar o projeto e validar a entrega, aproveitando, conforme
precisar, a descoberta do **BMad**, specs de **OpenSpec** ou **GitHub Spec Kit**,
o planejamento do **Tech Leads Club** ou o contexto do **Dotcontext**
(AI Context). Se o projeto já tem esses artefatos, consulte
`npx @pathbit/agentdevkit next --integrations` para localizar as referências
reconhecidas. Veja quando cada opção vale a pena no
[guia comparativo](docs/guides/comparacao.md).

## Encontre o que precisa

| Quero… | Ler |
| --- | --- |
| Preparar Node/npm e instalar o kit | [Pré-requisitos](docs/guides/prerequisites.md) · [Instalação](docs/guides/installation.md) |
| Entender e começar | [Wiki](docs/README.md) |
| Planejar ou retomar um projeto | [Fluxo de trabalho](docs/guides/workflow.md) |
| Evoluir documentos existentes | [Inventário e complementos](docs/guides/documentation.md) |
| Criar uma skill ou comando | [Recursos](docs/guides/resources.md) |
| Entender agentes, skills e comandos | [Recursos na prática](docs/guides/recursos-na-pratica.md) |
| Instalar ferramentas e comprovar uma entrega | [Ferramentas e testes][tests] |
| Revisar segurança sem serviços externos | [Segurança local](docs/guides/security.md) |
| Consultar opções ou resolver um erro | [CLI][cli] · [Soluções][help] |
| Melhorar o próprio kit | [Contribuir](CONTRIBUTING.md) |
| Experimentar os cenários | [Exemplos](https://github.com/pathbit/AgentDevKit/tree/master/examples) |

## Desenvolver este repositório

Com Node.js 24+ e npm, na raiz:

```console
npm ci --ignore-scripts
npm run check
npm test
npm run examples
```

Os exemplos ficam em uma pasta temporária fora de Git, informada pelo comando.
Para testar todos os cenários,
use `npm run test:examples`; para verificar o pacote, `npm run verify`.
O [guia de desenvolvimento](docs/maintainers/development.md) explica a árvore
e os comandos.

As ferramentas locais têm instalação separada. Os artefatos e as somas da
[release][release] permitem conferir o pacote publicado nos
[dois registries][packages].

## Licença e autoria

Mantido pela [PathBit](https://www.pathbit.com.br),
sob a licença [MIT](LICENSE).
A instalação inclui a licença do kit em `.pbai4devs/LICENSE` e preserva
a licença e os arquivos próprios do seu projeto.

[Changelog](CHANGELOG.md) · [Roadmap](docs/product/roadmap.md)

Encontrou um problema ou tem uma ideia? [Abra uma issue][issues] pelos
[formulários de contribuição](docs/maintainers/community.md).

[tests]: docs/guides/tools-and-testing.md
[cli]: docs/guides/cli.md
[help]: docs/guides/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/maintainers/packages.md
[release]: https://github.com/pathbit/AgentDevKit/releases/latest
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[npm-badge]: https://img.shields.io/npm/v/%40pathbit%2Fagentdevkit
[license-badge]: https://img.shields.io/badge/license-MIT-blue
[github-install]: docs/guides/installation.md#github-packages
