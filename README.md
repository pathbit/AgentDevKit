---
description: Instruções e fluxo de trabalho para agentes de código.
language: pt
---

# AgentDevKit

[English](README.en.md) · [Español](README.es.md)

Uma forma de organizar o trabalho com agentes de código, do planejamento à
verificação. Você mantém skills, regras, comandos e perfis em `.pbai4devs`;
o kit gera os apontamentos que cada cliente sabe encontrar.

Use com Codex, Claude, Cursor, Copilot, OpenCode e outros
[clientes compatíveis](.pbai4devs/COMPATIBILIDADE.md). Há uma origem;
cada cliente conserva seu formato de descoberta. As fontes ficam em
`.pbai4devs`; pastas nativas, entradas e preferências são geradas localmente
e não entram no versionamento.

## Começar em um projeto

Com Node.js 18+ e npm, faça o [login no GitHub Packages][packages].
Na pasta do seu projeto, execute:

```console
npx -y --registry=https://npm.pkg.github.com @pathbit/agentdevkit@0.0.3 init
```

Escolha os agentes na pergunta inicial ou informe `--agents codex,claude`.
A escolha fica salva no projeto; `agents` permite consultá-la ou alterá-la.
Sem interação ou escolha anterior, o padrão é `all` (todos os clientes).

Depois, abra o projeto no seu agente e peça:

> Leia AGENTS.md e use a skill proximos-passos para orientar meu trabalho.

Windows, instalação sem Node, simulação e atualização estão no
[guia de instalação](docs/installation.md). A distribuição usa a
mesma versão no GitHub Packages e na [release v0.0.3][release],
sem instalação global. O tarball da release também permite instalar sem login
no registro. O idioma da CLI pode ser `pt`, `en` ou `es`.

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
[packages]: docs/packages.md
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.3
