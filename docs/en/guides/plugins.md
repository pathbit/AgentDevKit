---
description: "Optional plugins, source and licenses of components used by AgentDevKit."
language: en
---

# Plugins and credits

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Choose an external tool or skill for the task you need to perform. AgentDevKit
installs the catalog and managers. Preparing each plugin is a separate action in
the project that will use it.

## Consult and install

In the project folder, list the IDs and refer to the origin, license and
platform requirements when available. This query works before or after
installing the kit.

```console
npx @pathbit/agentdevkit plugins list
npx @pathbit/agentdevkit plugins info agent-browser
```

With the kit installed, prepare and check the item chosen by the ID.

```console
npx @pathbit/agentdevkit plugins install agent-browser
npx @pathbit/agentdevkit plugins check agent-browser
```

`install` may download resources from the declared source. `check` check the
local copy. To run an already installed tool, refer to the arguments in your
guide and use `tools run <id> -- <argumentos>`. To verify the task, perform the
appropriate verification of the result. [Tools and tests](tools-and-testing.md)

To install a revised external skill, prepare first the CLI `skills`.

```console
npx @pathbit/agentdevkit plugins install skills
npx @pathbit/agentdevkit plugins install vercel-writing-guidelines
npx @pathbit/agentdevkit plugins check vercel-writing-guidelines
```

The tools stay in `.pbai4devs/tools/<id>/.local/`. The copies of skills stay in
`.pbai4devs/external-skills/.local/`. Consult the [tool manager][ferramentas]
for requirements per platform and the [catalogue of external skills][catalogo]
for the commit, the path and the license of each entry.

For installation errors, platform or dependencies, see [tool
diagnosis](troubleshooting.md#download-platform-or-failing-tool).

## Tools available on demand

The manifestos [`TOOL.json`][manifests] define tools integrated into the
selective installer. Vercel Labs entries are optional technical integrations
with their open source projects.

| ID | Origin and authorship | License | Use in the kit |
| --- | --- | --- | --- |
| `agent-browser` | [Vercel Labs][browser] | [Apache-2.0][browser-license] | Web automation. |
| `agent-desktop` | [Vercel Labs][desktop] | [Apache-2.0][desktop-license] | Desktop automation. |
| `skills` | [Vercel Labs][skills] | [MIT][skills-license] | Discovery and download of skills. |
| `just-bash` | Malte and Claude, [Vercel Labs][bash] | [Apache-2.0][bash-license] | Shell with virtual file system. |
| `opensrc` | [Vercel Labs][opensrc] | [Apache-2.0][opensrc-license] | Consult sources of dependencies. |
| `webreel` | [Vercel Labs][webreel] | [Apache-2.0][webreel-license] | Screenplays and browser recording. |
| `portless` | [Vercel Labs][portless] | [Apache-2.0][portless-license] | Local proxy and URLs. |
| `markdownlint-cli2` | [David Anson][markdownlint] | [MIT][markdownlint-license] | Markdown's lint. |
| `gitleaks` | [Zachary Rice and collaborators][gitleaks] | [MIT][gitleaks-license] | Secret detection. |
| `osv-scanner` | [Google and collaborators][osv] | [Apache-2.0][osv-license] | Dependency analysis. |
| `opengrep` | [Opengrep Project][opengrep] | [LGPL-2.1][opengrep-license] | Static analysis with local rules. |
| `openspec` | [Fission AI][openspec] | [MIT][openspec-license] | Validation and filing of deltas. |
| `dotcontext-mcp` | [Vinicius Lana and collaborators][dotcontext] | [MIT][dotcontext-license] | Server MCP local via studio. |

`openspec` e `dotcontext-mcp` require explicit selection by ID or group
`workflow` tool manager. The general selection `all` To apply deltas, follow the
[OpenSpec tab][openspec-guide]. To execute the MCP via studio and register the
server in the desired client, follow the [Dotcontext guide
MCP][dotcontext-guide].

## External Skills Reviewed

O [catalog][catalogo] brand these entries as `reviewed` for the use described in
each. They can be installed on demand. The license and the origin commit
accompany the assignment.

| ID | Origin and authorship | Skill license |
| --- | --- | --- |
| `vercel-writing-guidelines` | [Vercel Labs][vercel-agents] | [MIT][vercel-agents-license] |
| `cloudflare-web-perf` | [Cloudflare][cloudflare] | [Apache-2.0][cloudflare-license] |
| `anthropic-frontend-design` | [Anthropic][anthropic] | [Apache-2.0][anthropic-license] |
| `openai-security-best-practices` | [OpenAI][openai] | [Apache-2.0][openai-practices-license] |
| `microsoft-frontend-review` | [Microsoft][microsoft] | [MIT][microsoft-license] |
| `openai-security-threat-model` | [OpenAI][openai] | [Apache-2.0][openai-threat-license] |
| `github-security-review` | [GitHub and collaborators][awesome] | [MIT][awesome-license] |

## Candidates and references

The entries `candidate` can be consulted in the catalog. The installation
requires that the entry has passed through the revision of origin, license and
scope.

| ID | Origin and authorship | Skill license |
| --- | --- | --- |
| `vercel-react-best-practices` | [Vercel Labs][vercel-agents] | [MIT][vercel-agents-license] |
| `cloudflare-workers-best-practices` | [Cloudflare][cloudflare] | [Apache-2.0][cloudflare-license] |
| `oracle-database` | [Oracle][oracle] | [UPL-1.0][oracle-license] |
| `community-spec-driven-eval` | [Tech Leads Club][tlc] | [CC-BY-4.0][tlc-license] |
| `trailofbits-differential-review` | [Trail of Bits][trail] | [CC-BY-SA-4.0][trail-license] |

O [comparison guide][comparacao] brings together references from other methods.
`next --integrations` indicates where to consult the local artifacts of these
streams. The installation of these projects follows the documentation of each
origin.

## Execution components and credits

AgentDevKit is maintained by [PathBit][pathbit] under the [license MIT][mit].
The authorship and licenses of third party components follow their origins.

| Component | Origin and authorship | License | Use in the kit |
| --- | --- | --- | --- |
| smol-toml 1.9.1 | [Squirrel Chat & collaborators][smol] | [BSD-3-Clause][smol-license] | Library included to validate TOML legacy. |
| Node.js | [Collaborators Node.js][node] | [MIT and warnings from third parties][node-license] | Runtime da CLI And the scripts. |
| npm CLI | [npm, Inc. and collaborators][npm] | [Artistic-2.0][npm-license] | Implementation of `npx` and installation of npm tools. |
| Git | [Linus Torvalds and collaborators][git] | [GPL v2][git-license] | Repository queries and verifications. |

[Back to guides](README.md)

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
[reading-en]: plugins.md
[reading-es]: ../../es/guides/plugins.md
