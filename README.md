---
description: Instruções compartilhadas e fluxo de trabalho para agentes de código.
language: pt
---

# AgentDevKit

[English](README.en.md) · [Español](README.es.md)

Uma forma de organizar o trabalho com agentes de código, do planejamento à
verificação. Você mantém skills, regras, comandos e perfis em `.pbai4devs`;
o kit gera os apontamentos que cada cliente sabe encontrar.

Use com Codex, Claude, Cursor, Copilot, OpenCode e outros
[clientes compatíveis](.pbai4devs/COMPATIBILIDADE.md). O conteúdo tem uma origem;
cada cliente conserva seu formato de descoberta.

## Começar em um projeto

Com Node.js 24+ e npm, abra o terminal na pasta do seu projeto e execute
(macOS/Linux):

```sh
RELEASE=https://github.com/pathbit/AgentDevKit/releases/download/v0.0.1
npx --yes --ignore-scripts \
  --package="$RELEASE/agentdevkit-0.0.1.tgz" agentdevkit init --lang pt
```

Depois, abra o projeto no seu agente e peça:

> Leia AGENTS.md e use a skill proximos-passos para orientar meu trabalho.

Windows, instalação sem Node, simulação e atualização estão no
[guia de instalação](docs/installation.md). A distribuição usa a
[release v0.0.1](https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.1),
sem instalação global. O idioma da CLI pode ser `pt`, `en` ou `es`.

## Encontre o que precisa

| Quero… | Ler |
| --- | --- |
| Entender e começar | [Wiki](docs/README.md) |
| Planejar ou retomar um projeto | [Fluxo de trabalho](docs/workflow.md) |
| Criar uma skill ou comando | [Recursos](docs/resources.md) |
| Instalar ferramentas e comprovar uma entrega | [Ferramentas e testes][tests] |
| Consultar opções ou resolver um erro | [CLI][cli] · [Soluções][help] |
| Melhorar o próprio kit | [Contribuir](CONTRIBUTING.md) |

Instalar o kit prepara instruções. As ferramentas são instaladas por uma ação
separada; PRD, design e specs surgem quando você inicia o planejamento.
Projetos existentes preservam seu código e suas decisões.

[Changelog](CHANGELOG.md) · [Roadmap](docs/roadmap.md) · [Licença MIT](LICENSE)

Encontrou um problema ou tem uma ideia? [Abra uma issue][issues] pelos
[formulários de contribuição](docs/community.md).

**[ Próximo passo ]** Siga a [instalação](docs/installation.md) e peça ao seu
agente para ler `AGENTS.md`.

[tests]: docs/tools-and-testing.md
[cli]: docs/cli.md
[help]: docs/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
