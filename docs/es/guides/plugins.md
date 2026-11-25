---
description: "Complementos opcionales, orígenes y licencias de los componentes usados por AgentDevKit."
language: es
---

# Complementos y créditos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Elija una herramienta o skill externa por la tarea que necesita ejecutar.
AgentDevKit instala el catálogo y los administradores. La preparación de cada
complemento es una acción separada en el proyecto que lo usará.

## Consultar e instalar

En la carpeta del proyecto, léste los IDs y consulte el origen, la licencia y
los requisitos de plataforma cuando estén disponibles. Esta consulta funciona
antes o después de instalar el kit.

```console
npx @pathbit/agentdevkit plugins list
npx @pathbit/agentdevkit plugins info agent-browser
```

Con el kit instalado, prepare y compruebe el elemento elegido por el ID.

```console
npx @pathbit/agentdevkit plugins install agent-browser
npx @pathbit/agentdevkit plugins check agent-browser
```

`install` Puede descargar recursos del origen declarado. `check` comprueba la
copia local. Para ejecutar una herramienta ya instalada, consulte los argumentos
en su guía y use `tools run <id> -- <argumentos>`. Para comprobar la tarea,
ejecute la verificación adecuada al resultado. [Herramientas y
pruebas](tools-and-testing.md)

Para instalar una skill externa revisada, prepare primero la CLI `skills`.

```console
npx @pathbit/agentdevkit plugins install skills
npx @pathbit/agentdevkit plugins install vercel-writing-guidelines
npx @pathbit/agentdevkit plugins check vercel-writing-guidelines
```

Las herramientas se quedan en `.pbai4devs/tools/<id>/.local/`. Las copias de
skills se quedan en `.pbai4devs/external-skills/.local/`. Consulte [gestor de
herramientas][ferramentas] para requisitos por plataforma y el [catálogo de
skills externos][catalogo] para el commit, el camino y la licencia de cada
entrada.

Para errores de instalación, plataforma o dependencias, consulte [diagnóstico de
herramientas](troubleshooting.md#descargar-plataforma-o-herramienta-fallando).

## Herramientas disponibles bajo demanda

Los manifiestos [`TOOL.json`][manifests] definen las herramientas integradas al
instalador selectivo. Las entradas de Vercel Labs son integraciones técnicas
opcionales con sus proyectos de código abierto.

| ID | Origen y autoría | Licencia | Uso en el kit |
| --- | --- | --- | --- |
| `agent-browser` | [Vercel Labs][browser] | [Apache-2.0][browser-license] | Automación web. |
| `agent-desktop` | [Vercel Labs][desktop] | [Apache-2.0][desktop-license] | Automación desktop. |
| `skills` | [Vercel Labs][skills] | [MIT][skills-license] | Descubrimiento y descarga de skills. |
| `just-bash` | Malte y Claude, [Vercel Labs][bash] | [Apache-2.0][bash-license] | Shell con sistema de archivos virtual. |
| `opensrc` | [Vercel Labs][opensrc] | [Apache-2.0][opensrc-license] | Consulta las fuentes de dependencias. |
| `webreel` | [Vercel Labs][webreel] | [Apache-2.0][webreel-license] | Rutas y grabación del navegador. |
| `portless` | [Vercel Labs][portless] | [Apache-2.0][portless-license] | Proxy y URLs locales. |
| `markdownlint-cli2` | [David Anson][markdownlint] | [MIT][markdownlint-license] | Lint de Markdown. |
| `gitleaks` | [Zachary Rice y colaboradores][gitleaks] | [MIT][gitleaks-license] | Detección de secretos. |
| `osv-scanner` | [Google y colaboradores][osv] | [Apache-2.0][osv-license] | Análisis de dependencias. |
| `opengrep` | [Proyecto Opengrep][opengrep] | [LGPL-2.1][opengrep-license] | Análisis estático con reglas locales. |
| `openspec` | [Fission AI][openspec] | [MIT][openspec-license] | Validación y archivo de deltas. |
| `dotcontext-mcp` | [Vinicius Lana y colaboradores][dotcontext] | [MIT][dotcontext-license] | Servidor MCP local vía stdio. |

`openspec` e `dotcontext-mcp` exigen selección explícita por el ID o por el
grupo `workflow` del gestor de herramientas. La selección general `all` pula
esas entradas. Para aplicar deltas, siga el [guía OpenSpec][openspec-guide].
Para ejecutar el MCP vía stdio y registrar el servidor en el cliente deseado,
siga el [guía de Dotcontext MCP][dotcontext-guide].

## Skills externas revisadas

O [catálogo][catalogo] marca estas entradas como `reviewed` Para el uso descrito
en cada una. Se pueden instalar bajo demanda. La licencia y el commit del origen
acompañan a la atribución.

| ID | Origen y autoría | Licencia de skill |
| --- | --- | --- |
| `vercel-writing-guidelines` | [Vercel Labs][vercel-agents] | [MIT][vercel-agents-license] |
| `cloudflare-web-perf` | [Cloudflare][cloudflare] | [Apache-2.0][cloudflare-license] |
| `anthropic-frontend-design` | [Anthropic][anthropic] | [Apache-2.0][anthropic-license] |
| `openai-security-best-practices` | [OpenAI][openai] | [Apache-2.0][openai-practices-license] |
| `microsoft-frontend-review` | [Microsoft][microsoft] | [MIT][microsoft-license] |
| `openai-security-threat-model` | [OpenAI][openai] | [Apache-2.0][openai-threat-license] |
| `github-security-review` | [GitHub y colaboradores][awesome] | [MIT][awesome-license] |

## Candidatas y referencias

Las entradas `candidate` Pueden consultarse en el catálogo. La instalación exige
que la entrada haya pasado por la revisión de origen, licencia y alcance.

| ID | Origen y autoría | Licencia de skill |
| --- | --- | --- |
| `vercel-react-best-practices` | [Vercel Labs][vercel-agents] | [MIT][vercel-agents-license] |
| `cloudflare-workers-best-practices` | [Cloudflare][cloudflare] | [Apache-2.0][cloudflare-license] |
| `oracle-database` | [Oracle][oracle] | [UPL-1.0][oracle-license] |
| `community-spec-driven-eval` | [Tech Leads Club][tlc] | [CC-BY-4.0][tlc-license] |
| `trailofbits-differential-review` | [Trail of Bits][trail] | [CC-BY-SA-4.0][trail-license] |

O [guía de comparación][comparacao] reúne referencias de otros métodos. `next
--integrations` indica dónde consultar los artefactos locales de esos flujos. La
instalación de esos proyectos sigue la documentación de cada origen.

## Componentes de ejecución y créditos

AgentDevKit se mantiene por [PathBit][pathbit] debajo de [licencia MIT][mit]. La
autoría y las licencias de los componentes de terceros siguen sus orígenes.

| Componente | Origen y autoría | Licencia | Uso en el kit |
| --- | --- | --- | --- |
| smol-toml 1.9.1 | [Squirrel Chat y colaboradores][smol] | [BSD-3-Clause][smol-license] | Biblioteca incluida para validar TOML legado. |
| Node.js | [Colaboradores Node.js][node] | [MIT y advertencias de terceros][node-license] | Runtime CLI y los scripts. |
| npm CLI | [npm, Inc. y colaboradores][npm] | [Artistic2.0][npm-license] | Ejecución de `npx` e instalación de herramientas npm. |
| Git | [Linus Torvalds y colaboradores][git] | [GPL v2][git-license] | Consultas y verificaciones en repositorios. |

[Volver a las guías](README.md)

[ferramentas]: ../kit/scripts/preparar-ferramentas/README.md
[manifests]: ../kit/tools/README.md
[catalogo]: ../../../.pbai4devs/external-skills/CATALOG.json
[comparacao]: comparacao.md
[pathbit]: https://www.pathbit.com.br
[mit]: ../../../LICENSE
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
[openspec-guide]: ../kit/tools/openspec/README.md
[dotcontext]: https://github.com/vinilana/dotcontext
[dotcontext-license]: https://github.com/vinilana/dotcontext/blob/3a2733eba50cb13cf4913eb08de4e879e2cb5e23/LICENSE
[dotcontext-guide]: ../kit/tools/dotcontext-mcp/README.md
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
[smol-license]: ../../../.pbai4devs/scripts/lib/smol-toml.LICENSE
[node]: https://github.com/nodejs/node
[node-license]: https://github.com/nodejs/node/blob/main/LICENSE
[npm]: https://github.com/npm/cli
[npm-license]: https://github.com/npm/cli/blob/latest/LICENSE
[git]: https://github.com/git/git
[git-license]: https://github.com/git/git/blob/master/COPYING

[reading-pt]: ../../guides/plugins.md
[reading-en]: ../../en/guides/plugins.md
[reading-es]: plugins.md
