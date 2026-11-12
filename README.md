---
description: Instruções e fluxo de trabalho para agentes de código.
language: pt
---

# AgentDevKit

[English](README.en.md) · [Español](README.es.md) · [Pacote npm][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

Uma forma de organizar o trabalho com agentes de código, do planejamento à
verificação. Você mantém skills, regras, comandos e perfis em `.pbai4devs`;
o kit gera os apontamentos que cada cliente sabe encontrar.

Use com Codex, Claude, Cursor, Copilot, OpenCode e outros
[clientes compatíveis](.pbai4devs/COMPATIBILIDADE.md). Há uma origem;
cada cliente conserva seu formato de descoberta. No repositório, o código
fica em `src/`, os testes em `tests/` e os recursos compartilhados em
`.pbai4devs/`. Pastas nativas, entradas e preferências são geradas localmente.

## Começar em um projeto

Com Node.js 18+ e npm, execute na pasta do seu projeto, sem login:

```console
npx @pathbit/agentdevkit init
```

Escolha os agentes na pergunta inicial ou informe `--agents codex,claude`.
A escolha fica salva no projeto; `agents` permite consultá-la ou alterá-la.
Sem interação ou escolha anterior, o padrão é `all` (todos os clientes).

Depois, abra o projeto no seu agente e peça:

> Leia AGENTS.md e use a skill proximos-passos para orientar meu trabalho.

Windows, instalação sem Node, simulação e atualização estão no
[guia de instalação](docs/guides/installation.md). A distribuição usa a
versão publicada no [npm público][packages] e na [release v0.0.9][release],
sem instalação global. Instalação e atualização usam o pacote do registro;
os arquivos da release servem para conferir os artefatos publicados.
O idioma da CLI pode ser `pt`, `en` ou `es`.

## Encontre o que precisa

| Quero… | Ler |
| --- | --- |
| Entender e começar | [Wiki](docs/README.md) |
| Planejar ou retomar um projeto | [Fluxo de trabalho](docs/guides/workflow.md) |
| Evoluir documentos existentes | [Inventário e complementos](docs/guides/documentation.md) |
| Criar uma skill ou comando | [Recursos](docs/guides/resources.md) |
| Instalar ferramentas e comprovar uma entrega | [Ferramentas e testes][tests] |
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

Os exemplos aparecem em `examples/generated/`. Para testar todos os cenários,
use `npm run test:examples`; para verificar o pacote, `npm run verify`.
O [guia de desenvolvimento](docs/maintainers/development.md) explica a árvore
e os comandos.

Instalar o kit prepara instruções. As ferramentas são instaladas por uma ação
separada; PRD, design e specs surgem quando você inicia o planejamento.
Projetos existentes preservam seu código e suas decisões.

## Licença e autoria

Mantido pela [PathBit](https://www.pathbit.com.br),
sob a licença [MIT](LICENSE).
A instalação inclui a licença do kit em `.pbai4devs/LICENSE` e preserva
a licença e os arquivos próprios do seu projeto.

[Changelog](CHANGELOG.md) · [Roadmap](docs/product/roadmap.md)

Encontrou um problema ou tem uma ideia? [Abra uma issue][issues] pelos
[formulários de contribuição](docs/maintainers/community.md).

**[ Próximo passo ]** Siga a [instalação](docs/guides/installation.md) e peça
ao seu agente para ler `AGENTS.md`.

[tests]: docs/guides/tools-and-testing.md
[cli]: docs/guides/cli.md
[help]: docs/guides/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/maintainers/packages.md
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.9
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[npm-badge]: https://img.shields.io/npm/v/%40pathbit%2Fagentdevkit
[license-badge]: https://img.shields.io/badge/license-MIT-blue
