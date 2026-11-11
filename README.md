---
description: Kit portátil de instruções e ferramentas para agentes de desenvolvimento.
language: pt
---

# AgentDevKit

[English](README.en.md) · [Español](README.es.md)

Instala skills, regras, comandos e perfis de agentes a partir de uma única
origem: `.pbai4devs`. Funciona em projetos novos ou existentes e indica os
próximos passos conforme o estado do projeto.

## Começar

Requer Node.js 24+. Neste checkout:

```sh
node bin/agentdevkit.mjs init --target ../meu-projeto --lang pt
node bin/agentdevkit.mjs next --target ../meu-projeto
```

Sem Node instalado, peça ao agente preparar o runtime pelo
[bootstrap do checkout](.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md)
e continuar a instalação. `npx` também precisa de Node/npm.

Use a distribuição `v0.0.1` sem instalação global:

```sh
RELEASE=https://github.com/pathbit/AgentDevKit/releases/download/v0.0.1
npx --yes --ignore-scripts \
  --package="$RELEASE/agentdevkit-0.0.1.tgz" agentdevkit init
```

Veja [instalação e atualização](docs/installation.md). A CLI aceita `pt`, `en`
e `es`; o idioma escolhido é salvo no projeto. Use `--dry-run` para conferir
mudanças e `--json` para automações.

## Fluxo

Preparação → PRD → UX/design → configuração → specs → implementação → revisão.
Em um projeto existente, o kit reconhece o estado atual e orienta a continuidade.
Instalar instruções não cria documentos de produto nem instala ferramentas.
Cada cliente tem seu formato de descoberta; um apontamento não comprova sua
execução automática pelo agente.

## Desenvolver o kit

```sh
npm test
npm run test:infra
npm run check
```

[Documentação](docs/README.md) · [Requisitos](docs/prd.md) ·
[Design](docs/design.md) · [Roadmap](docs/roadmap.md) ·
[Contribuir](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Licença MIT](LICENSE)

**[ Próximo passo ]** Instale no seu projeto:

```sh
node bin/agentdevkit.mjs init --target ../meu-projeto --lang pt
```
