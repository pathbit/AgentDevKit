---
description: Plugins opcionais, origens e licenças dos componentes usados pelo AgentDevKit.
---

# Plugins e créditos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Escolha uma ferramenta ou skill externa pela tarefa que precisa executar.
O AgentDevKit instala o catálogo e os gerenciadores. A preparação de cada
plugin é uma ação separada no projeto que vai usá-lo.

## Consultar e instalar

Na pasta do projeto, liste os IDs e consulte a origem, a licença e os
requisitos de plataforma, quando disponíveis. Essa consulta funciona antes
ou depois de instalar o kit.

```console
npx @pathbit/agentdevkit plugins list
npx @pathbit/agentdevkit plugins info agent-browser
```

Com o kit instalado, prepare e confira o item escolhido pelo ID.

```console
npx @pathbit/agentdevkit plugins install agent-browser
npx @pathbit/agentdevkit plugins check agent-browser
```

`install` pode baixar recursos da origem declarada. `check` verifica a cópia
local. Para executar uma ferramenta já instalada, consulte os argumentos em
seu guia e use `tools run <id> -- <argumentos>`. Para comprovar a tarefa,
execute a verificação adequada ao resultado. [Ferramentas e testes](tools-and-testing.md)

Para instalar uma skill externa revisada, prepare primeiro a CLI `skills`.

```console
npx @pathbit/agentdevkit plugins install skills
npx @pathbit/agentdevkit plugins install vercel-writing-guidelines
npx @pathbit/agentdevkit plugins check vercel-writing-guidelines
```

As ferramentas ficam em `.pbai4devs/tools/<id>/.local/`. As cópias de skills
ficam em `.pbai4devs/external-skills/.local/`. Consulte o
[gerenciador de ferramentas][ferramentas] para requisitos por plataforma e
o [catálogo de skills externas][catalogo] para o commit, o caminho e a licença
de cada entrada.

Para erros de instalação, plataforma ou dependências, consulte o
[diagnóstico de ferramentas](troubleshooting.md#download-plataforma-ou-ferramenta-falhando).

## Ferramentas disponíveis sob demanda

Os manifestos [`TOOL.json`][manifests] definem as ferramentas integradas ao
instalador seletivo. As entradas de Vercel Labs são integrações técnicas
opcionais com seus projetos de código aberto.

| ID | Origem e autoria | Licença | Uso no kit |
| --- | --- | --- | --- |
| `agent-browser` | [Vercel Labs][browser] | [Apache-2.0][browser-license] | Automação web. |
| `agent-desktop` | [Vercel Labs][desktop] | [Apache-2.0][desktop-license] | Automação desktop. |
| `skills` | [Vercel Labs][skills] | [MIT][skills-license] | Descoberta e download de skills. |
| `just-bash` | Malte e Claude, [Vercel Labs][bash] | [Apache-2.0][bash-license] | Shell com sistema de arquivos virtual. |
| `opensrc` | [Vercel Labs][opensrc] | [Apache-2.0][opensrc-license] | Consulta a fontes de dependências. |
| `webreel` | [Vercel Labs][webreel] | [Apache-2.0][webreel-license] | Roteiros e gravação do navegador. |
| `portless` | [Vercel Labs][portless] | [Apache-2.0][portless-license] | Proxy e URLs locais. |
| `markdownlint-cli2` | [David Anson][markdownlint] | [MIT][markdownlint-license] | Lint de Markdown. |
| `gitleaks` | [Zachary Rice e colaboradores][gitleaks] | [MIT][gitleaks-license] | Detecção de segredos. |
| `osv-scanner` | [Google e colaboradores][osv] | [Apache-2.0][osv-license] | Análise de dependências. |
| `opengrep` | [Projeto Opengrep][opengrep] | [LGPL-2.1][opengrep-license] | Análise estática com regras locais. |
| `openspec` | [Fission AI][openspec] | [MIT][openspec-license] | Validação e arquivamento de deltas. |
| `dotcontext-mcp` | [Vinicius Lana e colaboradores][dotcontext] | [MIT][dotcontext-license] | Servidor MCP local via stdio. |

`openspec` e `dotcontext-mcp` exigem seleção explícita pelo ID ou pelo grupo
`workflow` do gerenciador de ferramentas. A seleção geral `all` pula essas
entradas. Para aplicar deltas, siga o [guia do OpenSpec][openspec-guide]. Para
executar o MCP via stdio e registrar o servidor no cliente desejado, siga o
[guia do Dotcontext MCP][dotcontext-guide].

## Skills externas revisadas

O [catálogo][catalogo] marca essas entradas como `reviewed` para o uso
descrito em cada uma. Elas podem ser instaladas sob demanda. A licença e o
commit da origem acompanham a atribuição.

| ID | Origem e autoria | Licença da skill |
| --- | --- | --- |
| `vercel-writing-guidelines` | [Vercel Labs][vercel-agents] | [MIT][vercel-agents-license] |
| `cloudflare-web-perf` | [Cloudflare][cloudflare] | [Apache-2.0][cloudflare-license] |
| `anthropic-frontend-design` | [Anthropic][anthropic] | [Apache-2.0][anthropic-license] |
| `openai-security-best-practices` | [OpenAI][openai] | [Apache-2.0][openai-practices-license] |
| `microsoft-frontend-review` | [Microsoft][microsoft] | [MIT][microsoft-license] |
| `openai-security-threat-model` | [OpenAI][openai] | [Apache-2.0][openai-threat-license] |
| `github-security-review` | [GitHub e colaboradores][awesome] | [MIT][awesome-license] |

## Candidatas e referências

As entradas `candidate` podem ser consultadas no catálogo. A instalação exige
que a entrada tenha passado pela revisão de origem, licença e escopo.

| ID | Origem e autoria | Licença da skill |
| --- | --- | --- |
| `vercel-react-best-practices` | [Vercel Labs][vercel-agents] | [MIT][vercel-agents-license] |
| `cloudflare-workers-best-practices` | [Cloudflare][cloudflare] | [Apache-2.0][cloudflare-license] |
| `oracle-database` | [Oracle][oracle] | [UPL-1.0][oracle-license] |
| `community-spec-driven-eval` | [Tech Leads Club][tlc] | [CC-BY-4.0][tlc-license] |
| `trailofbits-differential-review` | [Trail of Bits][trail] | [CC-BY-SA-4.0][trail-license] |

O [guia de comparação][comparacao] reúne referências de outros métodos.
`next --integrations` indica onde consultar os artefatos locais desses fluxos.
A instalação desses projetos segue a documentação de cada origem.

## Componentes de execução e créditos

O AgentDevKit é mantido pela [PathBit][pathbit] sob a [licença MIT][mit].
A autoria e as licenças dos componentes de terceiros seguem as respectivas
origens.

| Componente | Origem e autoria | Licença | Uso no kit |
| --- | --- | --- | --- |
| smol-toml 1.9.1 | [Squirrel Chat e colaboradores][smol] | [BSD-3-Clause][smol-license] | Biblioteca incluída para validar TOML legado. |
| Node.js | [Colaboradores do Node.js][node] | [MIT e avisos de terceiros][node-license] | Runtime da CLI e dos scripts. |
| npm CLI | [npm, Inc. e colaboradores][npm] | [Artistic-2.0][npm-license] | Execução de `npx` e instalação de ferramentas npm. |
| Git | [Linus Torvalds e colaboradores][git] | [GPL v2][git-license] | Consultas e verificações em repositórios. |

[Voltar aos guias](README.md)

[ferramentas]: ../../.pbai4devs/scripts/preparar-ferramentas/README.md
[manifests]: ../../.pbai4devs/tools/README.md
[catalogo]: ../../.pbai4devs/external-skills/CATALOG.json
[comparacao]: comparacao.md
[pathbit]: https://www.pathbit.com.br
[mit]: ../../LICENSE
[browser]: https://github.com/vercel-labs/agent-browser
[browser-license]: https://github.com/vercel-labs/agent-browser/blob/main/LICENSE
[desktop]: https://github.com/vercel-labs/agent-desktop
[desktop-license]: https://github.com/vercel-labs/agent-desktop/blob/main/LICENSE
[skills]: https://github.com/vercel-labs/skills
[skills-license]: https://github.com/vercel-labs/skills/blob/main/LICENSE
[bash]: https://github.com/vercel-labs/just-bash
[bash-license]: https://github.com/vercel-labs/just-bash/blob/main/packages/just-bash/package.json
[opensrc]: https://github.com/vercel-labs/opensrc
[opensrc-license]: https://github.com/vercel-labs/opensrc/blob/main/LICENSE
[webreel]: https://github.com/vercel-labs/webreel
[webreel-license]: https://github.com/vercel-labs/webreel/blob/main/LICENSE
[portless]: https://github.com/vercel-labs/portless
[portless-license]: https://github.com/vercel-labs/portless/blob/main/LICENSE
[markdownlint]: https://github.com/DavidAnson/markdownlint-cli2
[markdownlint-license]: https://github.com/DavidAnson/markdownlint-cli2/blob/main/LICENSE
[gitleaks]: https://github.com/gitleaks/gitleaks
[gitleaks-license]: https://github.com/gitleaks/gitleaks/blob/v8.30.1/LICENSE
[osv]: https://github.com/google/osv-scanner
[osv-license]: https://github.com/google/osv-scanner/blob/v2.7.1/LICENSE
[opengrep]: https://github.com/opengrep/opengrep
[opengrep-license]: https://github.com/opengrep/opengrep/blob/v1.33.1/LICENSE
[openspec]: https://github.com/Fission-AI/OpenSpec
[openspec-license]: https://github.com/Fission-AI/OpenSpec/blob/v2.1.1/LICENSE
[openspec-guide]: ../../.pbai4devs/tools/openspec/README.md
[dotcontext]: https://github.com/vinilana/dotcontext
[dotcontext-license]: https://github.com/vinilana/dotcontext/blob/3a2733eba50cb13cf4913eb08de4e879e2cb5e23/LICENSE
[dotcontext-guide]: ../../.pbai4devs/tools/dotcontext-mcp/README.md
[vercel-agents]: https://github.com/vercel-labs/agent-skills
[vercel-agents-license]: https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/README.md#license
[cloudflare]: https://github.com/cloudflare/skills
[cloudflare-license]: https://github.com/cloudflare/skills/blob/cbf893b954222276bf1af57e5f23379231e0efb9/LICENSE
[anthropic]: https://github.com/anthropics/skills
[anthropic-license]: https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/frontend-design/LICENSE.txt
[openai]: https://github.com/openai/skills
[openai-practices-license]: https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices/LICENSE.txt
[openai-threat-license]: https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-threat-model/LICENSE.txt
[microsoft]: https://github.com/microsoft/skills
[microsoft-license]: https://github.com/microsoft/skills/blob/4cfa010138972d45a7bb92edea90094f4f443da8/LICENSE
[awesome]: https://github.com/github/awesome-copilot
[awesome-license]: https://github.com/github/awesome-copilot/blob/30a0d7465b14b05e05949d6588b99f7af0c537b4/LICENSE
[oracle]: https://github.com/oracle/skills
[oracle-license]: https://github.com/oracle/skills/blob/0779f030fdee393ee418a3a76f6a4b09bf1408db/LICENSE.txt
[tlc]: https://github.com/tech-leads-club/agent-skills
[tlc-license]: https://github.com/tech-leads-club/agent-skills/blob/e74dc8a7e8d59bb36f267afd089580e0858e224a/LICENSE
[trail]: https://github.com/trailofbits/skills
[trail-license]: https://github.com/trailofbits/skills/blob/e4dd0bb5b15535f7c5a0834187dffba6ac37e4ff/LICENSE
[smol]: https://github.com/squirrelchat/smol-toml/tree/v1.9.1
[smol-license]: ../../.pbai4devs/scripts/lib/smol-toml.LICENSE
[node]: https://github.com/nodejs/node
[node-license]: https://github.com/nodejs/node/blob/main/LICENSE
[npm]: https://github.com/npm/cli
[npm-license]: https://github.com/npm/cli/blob/latest/LICENSE
[git]: https://github.com/git/git
[git-license]: https://github.com/git/git/blob/master/COPYING

[reading-pt]: plugins.md
[reading-en]: ../en/guides/plugins.md
[reading-es]: ../es/guides/plugins.md
