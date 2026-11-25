---
description: Instruções e fluxo de trabalho para agentes de código.
language: pt-BR
---

# Pathbit AI - AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]
· [Pacote npm][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

O AgentDevKit ajuda agentes de código a entender o projeto, planejar mudanças
e verificar entregas. As instruções ficam em `.pbai4devs` e podem ser usadas em
projetos de qualquer linguagem. O kit gera referências para
[Codex, Claude, Cursor, Copilot, OpenCode e outros clientes](.pbai4devs/COMPATIBILIDADE.md).

## Pré-requisitos

- **Obrigatório para a CLI.** Instale Node.js 24 LTS ou superior com npm e
  `npx`, incluídos na distribuição oficial. No Windows, use no mínimo a versão
  24.13.1 na série 24 LTS ou escolha a série 26 LTS ou superior.
  [Baixar Node.js][node-download] · [Instalação por sistema][prerequisites]
- **Git, quando usar um repositório.** Instale para clonar o código e verificar
  as exclusões do Git. Em uma pasta sem Git, a instalação do kit funciona.
  [Baixar Git][git-download]
- **Cliente de IA e ferramentas do projeto.** Abra o projeto no cliente que
  você usa para trabalhar com os agentes. Para compilar e testar a aplicação,
  siga os requisitos do próprio projeto. [Clientes compatíveis][clients]

## Começo rápido

Abra um terminal na pasta do projeto e execute:

```console
npx @pathbit/agentdevkit init --lang pt --purpose agents
```

Use `@latest` para acompanhar a última versão estável publicada no npm.
Informe o número para repetir a instalação com a mesma versão.

```console
npx @pathbit/agentdevkit@latest init
npx @pathbit/agentdevkit@0.0.39 init
```

No assistente, use as setas para navegar e **Espaço** para marcar cada
agente. Confirme com **Enter**. Pressione **Esc** para cancelar. Se confirmar
sem marcar nenhum, o kit instala apenas os recursos compartilhados.

Para mudar a seleção depois:

```console
npx @pathbit/agentdevkit agents --select
```

Em uma pasta existente, você pode [ver o plano antes de instalar][preview].
Para automação ou terminais sem menu, passe os IDs dos clientes:

```console
npx @pathbit/agentdevkit init --lang pt --agents codex,claude --dry-run
npx @pathbit/agentdevkit init --lang pt --agents codex,claude
```

Abra o projeto no seu agente de código e peça:

> Leia o AGENTS.md e o README. Mostre os comandos do projeto e proponha um
> primeiro passo. Por enquanto, só leia os arquivos.

Confira a seleção com `npx @pathbit/agentdevkit agents`.
[Opções de instalação][install] · [Clientes compatíveis][clients]

## Escolha o que quer fazer

| Quero… | Rode no terminal |
| --- | --- |
| Selecionar agentes | `npx @pathbit/agentdevkit agents --select` |
| Planejar produto | `npx @pathbit/agentdevkit next --intent product` |
| Saber como rodar a aplicação | `npx @pathbit/agentdevkit next --intent run` |
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

## Contributing and Branch Protection

Envie o pull request do seu fork para `main`. Consulte o
[guia de contribuição](CONTRIBUTING.md) para rodar as
verificações antes de enviar.

Encontrou um problema ou tem uma ideia? [Abra uma issue][issues] pelos
[formulários de contribuição](docs/maintainers/community.md).

---

## 📄 License

Distribuído sob a [licença MIT](LICENSE).
A instalação inclui a licença do kit em `.pbai4devs/LICENSE` e preserva
a licença e os arquivos próprios do seu projeto.

[tests]: docs/guides/tools-and-testing.md
[cli]: docs/guides/cli.md
[help]: docs/guides/troubleshooting.md
[install]: docs/guides/installation.md
[prerequisites]: docs/guides/prerequisites.md
[node-download]: https://nodejs.org/en/download
[git-download]: https://git-scm.com/install/
[clients]: .pbai4devs/COMPATIBILIDADE.md
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

[reading-pt]: README.md
[reading-en]: README.en.md
[reading-es]: README.es.md

---

Developed with ❤️ by [Pathbit](https://www.pathbit.com.br/)
