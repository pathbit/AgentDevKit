---
description: Guia rápido para desenvolver e validar o AgentDevKit.
---

# Desenvolver o AgentDevKit

Comece com Git, Node.js 24+ e npm. Na raiz do checkout:

```console
npm ci --ignore-scripts
npm run check
npm test
```

## Onde trabalhar

| Pasta | Conteúdo |
| --- | --- |
| [`src/`](../src/README.md) | Código da CLI e do instalador. |
| [`bin/`](../bin/README.md) | Executável do pacote. |
| [`tests/`][tests] | Testes do produto. |
| [`scripts/`][scripts] | Verificação, build e publicação. |
| [`examples/`][examples] | Exemplos para estudar o resultado. |
| [`.pbai4devs/`](../.pbai4devs/README.md) | Recursos compartilhados dos agentes. |
| [`docs/`](README.md) | Guias, decisões e especificações. |

## Escolha a próxima ação

| Objetivo | Comando |
| --- | --- |
| Conhecer os comandos da CLI local | `npm run cli -- --help` |
| Gerar exemplos com `.claude`, `.codex` e outros | `npm run examples` |
| Executar os oito cenários de exemplo | `npm run test:examples` |
| Conferir recursos e documentação | `npm run check` |
| Testar o produto | `npm test` |
| Verificar tudo e o pacote real | `npm run verify` |
| Gerar somente o tarball | `npm run build` |

`generate` é um alias para gerar os exemplos. `agents:sync` sincroniza uma
configuração local de agentes do próprio checkout, quando adotada de forma
explícita. O projeto não precisa de todas as pastas de clientes na raiz.

Edite fontes e templates, não os arquivos gerados. Testes e fixtures entram
no Git; relatórios, caches e `examples/generated/` ficam locais. Antes de
enviar uma alteração, siga [contribuição](../CONTRIBUTING.md) e a
[revisão de entrega][review]. A [publicação](maintenance.md) reaproveita o
artefato aprovado pelo CI.

[Wiki](README.md) · [Exemplos][examples]

[review]: ../.pbai4devs/commands/revisar-entrega/COMMAND.md
[tests]: https://github.com/pathbit/AgentDevKit/tree/master/tests
[scripts]: https://github.com/pathbit/AgentDevKit/tree/master/scripts
[examples]: https://github.com/pathbit/AgentDevKit/tree/master/examples
