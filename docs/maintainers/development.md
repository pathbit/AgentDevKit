---
description: Guia rápido para desenvolver e validar o AgentDevKit.
---

# Desenvolver o AgentDevKit

Comece com Git, Node.js 24+ e npm. `npm ci` remove `node_modules` antes de
instalar; preserve qualquer conteúdo local dessa pasta. Na raiz do checkout:

```console
git switch develop
npm ci --ignore-scripts
npm run check
npm test
```

`develop` recebe as mudanças em integração. `main` é a branch padrão e
origem das releases. Ambas executam o CI. A automação de publicação depende
do push aprovado na `main` e da versão do pacote.

`npm run check` confere estrutura e links. Para incluir o lint Markdown,
prepare `markdownlint-cli2` pelo
[script de ferramentas](../../.pbai4devs/scripts/preparar-ferramentas/README.md).
O perfil `npm run verify` prepara a ferramenta antes da checagem.

## Ambiente Compose

A aplicação é uma CLI: cada execução termina e não abre porta nem mantém
serviço, banco ou volume. Para executar a CLI local em Linux isolado, instale
Docker com Compose e GNU Make e disponibilize a imagem uma vez:

```console
docker pull node:24-bookworm
make doctor
make up
```

Sem Make, consulte a ajuda da CLI com:

```console
cd infra/compose
docker compose -p adk-cli -f compose.local.yml run --rm --pull never cli
```

No Windows, use Docker Desktop configurado para containers Linux; essa
configuração ainda precisa ser verificada nesse sistema.

`make up` imprime a versão usando a imagem local, sem baixar durante a
execução. O checkout é montado somente para leitura, sem rede no container;
o conteúdo do checkout fica legível ao processo dentro dele. A montagem permite
consultas, mas não alterações no checkout. O comando não testa o pacote
publicado. Não há serviço persistente ou healthcheck a aguardar:
`make down` e `make logs` explicam esse ciclo sem remover recursos Docker.

`make setup` verifica os pré-requisitos e usa `npm ci --ignore-scripts`. Ele
recusa executar se `node_modules` já existir, para evitar sua remoção.
Os alvos Make exigem um shell POSIX.
`make lint`, `make test` e `make build`
encaminham aos comandos npm acima. O build grava em
`.agent-tests/release/<versão>/`; o alvo recusa uma pasta da mesma versão já
existente. Revise e preserve o artefato anterior em outro local antes de
executar outro build. A verificação do Makefile não é atômica: evite outros
processos de build simultâneos. `npm run build` e `npm run verify` não usam
essa proteção do Make: eles reutilizam uma saída equivalente ou recusam uma
divergência, preservando a pasta anterior. Após verificar o pacote, `verify`
cria uma cópia marcada em diretório exclusivo em `.agent-tests/release/` ou
em `RUNNER_TEMP`, quando definido. Revise cópias e resíduos antes de removê-los.
O arquivo `.dockerignore` limita futuros contextos de build; ele não filtra
o conteúdo de uma montagem bind do Compose. Padrões amplos como `tmp`, `temp`
e diretórios `playwright*` também excluem código com esses nomes no contexto.

## Onde trabalhar

| Pasta | Conteúdo |
| --- | --- |
| [`src/`](../../src/README.md) | Código da CLI e do instalador. |
| [`bin/`](../../bin/README.md) | Executável do pacote. |
| [`tests/`][tests] | Testes do produto. |
| [`scripts/`][scripts] | Verificação, build e publicação. |
| [`examples/`][examples] | Exemplos para estudar o resultado. |
| [`.pbai4devs/`](../../.pbai4devs/README.md) | Recursos compartilhados dos agentes. |
| [`docs/`](../README.md) | Guias, decisões e especificações. |

## Escolha a próxima ação

| Objetivo | Comando |
| --- | --- |
| Conhecer os comandos da CLI local | `npm run cli -- --help` |
| Gerar exemplos com `.claude`, `.codex` e outros | `npm run examples` |
| Executar os oito cenários de exemplo | `npm run test:examples` |
| Conferir recursos e documentação | `npm run check` |
| Testar o produto | `npm test` |
| Verificar tudo e o pacote real | `npm run verify` |
| Gerar somente o tarball, preservando uma release existente | `make build` |

`generate` é um alias para gerar os exemplos. `agents:sync` sincroniza uma
configuração local de agentes do próprio checkout, quando adotada de forma
explícita. O projeto não precisa de todas as pastas de clientes na raiz.

Edite fontes e templates, não os arquivos gerados. Testes e fixtures entram
no Git; relatórios e caches ficam locais. Os exemplos gerados vão para uma pasta
temporária fora de Git. Antes de
enviar uma alteração, siga [contribuição](../../CONTRIBUTING.md) e a
[revisão de entrega][review]. A [publicação](maintenance.md) reaproveita o
artefato aprovado pelo CI.

[Wiki](../README.md) · [Exemplos][examples]

[review]: ../../.pbai4devs/commands/revisar-entrega/COMMAND.md
[tests]: https://github.com/pathbit/AgentDevKit/tree/main/tests
[scripts]: https://github.com/pathbit/AgentDevKit/tree/main/scripts
[examples]: https://github.com/pathbit/AgentDevKit/tree/main/examples
