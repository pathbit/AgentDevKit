---
description: Instruções e fluxo de trabalho para agentes de código.
language: pt
---

# Pathbit AI - AgentDevKit

[English](README.en.md) · [Español](README.es.md) · [Pacote npm][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

O AgentDevKit reúne instruções reutilizáveis para planejar, implementar e
verificar o trabalho com agentes de código. A pasta `.pbai4devs` guarda
skills, regras, comandos e perfis. O kit gera referências para
[Codex, Claude, Cursor, Copilot, OpenCode e outros clientes](.pbai4devs/COMPATIBILIDADE.md).

## Começar em um projeto

Prepare [Node.js 24+ e npm](docs/guides/prerequisites.md) no Windows, macOS ou
Linux. Abra o terminal na pasta do seu projeto. Se ele já tem arquivos,
[simule a instalação][preview] para conferir o que vai mudar. Instale pelo
**npm público**, sem login:

```console
npx @pathbit/agentdevkit init
```

O assistente de primeiro uso reúne idioma, clientes e objetivo. Se você já
souber a seleção, passe `--agents codex,claude`. Sem escolha explícita ou
salva, `none` prepara os recursos compartilhados e `AGENTS.md`, sem criar
pastas de clientes. A escolha fica salva por projeto e a CLI aceita `pt`, `en`
e `es`. Veja as
[opções de instalação][install], incluindo pnpm, Yarn, Bun e
[GitHub Packages com autenticação][github-install].

Em um projeto com Git, confira a instalação e a sincronização:

```console
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
```

## Escolha o que quer fazer

| Quero… | Rode no terminal |
| --- | --- |
| Planejar produto | `npx @pathbit/agentdevkit next --intent product` |
| Rodar a aplicação | `npx @pathbit/agentdevkit next --intent run` |
| Documentar o sistema | `npx @pathbit/agentdevkit next --intent document` |
| Inventariar antes de instalar | `npx @pathbit/agentdevkit document` |

`next` indica a próxima ação. No seu agente, peça que ele leia `AGENTS.md`
e use `proximos-passos` com seu objetivo. O [fluxo de trabalho][workflow]
explica de onde partir em cada caso.

## Atualizar e personalizar

- **Revisar e atualizar.** Consulte [como simular e aplicar um `update`][update].
  Use `sync` para regenerar apontamentos a partir dos recursos já instalados.
- **Mudar os clientes.** Consulte a seleção com `agents` e ajuste os IDs com
  `agents add <id>` ou `agents remove <id>`. Veja a [CLI][cli].
- **Escolher ferramentas adicionais.** Rode `npx @pathbit/agentdevkit plugins list`
  e veja a origem e os passos de instalação no [guia de plugins][plugins].
- **Aproveitar documentos de outro fluxo.** Use `next --integrations` para
  localizar referências no projeto. Veja o [guia comparativo][comparison].

## Encontre o que precisa

| Quero… | Ler |
| --- | --- |
| Entender os conceitos e navegar pelos guias | [Documentação](docs/README.md) |
| Evoluir documentos existentes | [Inventário e complementos](docs/guides/documentation.md) |
| Criar uma skill ou comando | [Recursos](docs/guides/resources.md) |
| Entender agentes, skills e comandos | [Recursos na prática](docs/guides/recursos-na-pratica.md) |
| Instalar ferramentas e comprovar uma entrega | [Ferramentas e testes][tests] |
| Revisar segurança sem serviços externos | [Segurança local](docs/guides/security.md) |
| Consultar opções ou resolver um erro | [CLI][cli] · [Soluções][help] |
| Melhorar o próprio kit | [Contribuir](CONTRIBUTING.md) |
| Experimentar os cenários | [Exemplos](https://github.com/pathbit/AgentDevKit/tree/main/examples) |

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

[Changelog](CHANGELOG.md) · [Roadmap](docs/product/roadmap.md)
· [Plugins e créditos](docs/guides/plugins.md)

---

## Contribuições e proteção de branches

- Envie contribuições por pull request para `develop` e confira a CI antes de pedir revisão. A branch `main` recebe as versões públicas. Veja o [guia de contribuição](CONTRIBUTING.md).
- Encontrou um problema ou tem uma ideia? [Abra uma issue][issues] pelos
  [formulários de contribuição](docs/maintainers/community.md).

---

## 📄 Licença

O projeto usa a Licença MIT. Leia o texto completo em [LICENSE](LICENSE).

A licença permite usar, modificar e distribuir o software, inclusive para fins comerciais, desde que os avisos de direitos autorais e da licença acompanhem as cópias. O software é fornecido sem garantia.

A instalação inclui a licença do kit em `.pbai4devs/LICENSE` e preserva
a licença e os arquivos próprios do seu projeto.

[tests]: docs/guides/tools-and-testing.md
[cli]: docs/guides/cli.md
[help]: docs/guides/troubleshooting.md
[install]: docs/guides/installation.md
[preview]: docs/guides/installation.md#simular-em-um-projeto-existente
[update]: docs/guides/installation.md#atualizar-e-escolher-agentes
[workflow]: docs/guides/workflow.md
[plugins]: docs/guides/plugins.md
[comparison]: docs/guides/comparacao.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/maintainers/packages.md
[release]: https://github.com/pathbit/AgentDevKit/releases/latest
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[npm-badge]: https://img.shields.io/npm/v/%40pathbit%2Fagentdevkit
[license-badge]: https://img.shields.io/badge/license-MIT-blue
[github-install]: docs/guides/installation.md#github-packages

---

Developed with ❤️ by [Pathbit](https://pathbit.co/)
