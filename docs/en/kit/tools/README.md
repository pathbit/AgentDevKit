---
description: "CLI catalogue and conditional tools for agents."
language: en
---

# & Tools

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Each folder holds `TOOL.json`, `SCRIPT.mjs` and a guide. `catalog.json` links
these definitions to the installation, update, verification and execution
commands. `sincronizar-agentes` e `--check`; installed versions are in the local
state. For npm, the installer query `latest` and use `--ignore-scripts`. Native
scanners use versions and SHA-256 revised in `TOOL.json`; `update` applies this
pin. Packages and status stay in `<nome>/.local/`; cache in `.cache/` and
shortcuts in `bin/`Tools are only in `.pbai4devs`.

| CLI | Group | Usage |
| --- | --- | --- |
| [agent-browser][browser] | base | Web automation. |
| [markdownlint-cli2][lint] | base | Markdown's lint. |
| [agent-desktop][desktop] | desktop | Desktop automation. |
| [Skills][skills] | Discovery | Discovery of skills. |
| [just-bash][bash] | shell | Shell's in the virtual system. |
| [opensrc][source] | source | Sources of dependencies. |
| [webreel][video] | video | Screenplays and browser videos. |
| [portless][proxy] | proxy | Proxy and local URLs stable. |
| [gitleaks](gitleaks/README.md) | security | Secrets in files and Git. |
| [osv-canner](osv-scanner/README.md) | security | Local-based dependencies. |
| [opengrep](opengrep/README.md) | security | Code with local rules. |
| [openspec](openspec/README.md) | workflow | Validation and filing of deltas. |
| [dotcontext-mcp](dotcontext-mcp/README.md) | workflow | Local server MCP via studio. |

`setup` installs and verifies the compatible general selection CLIs. The group
`base` select browser and lint. The group `security` select the three scanners.
Group tools `workflow` require explicit selection by name or group. `all` Jump
those entrances.

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup workflow
```

Vulnerability bases are prepared separately; install CLI does not turn a missing
base into clean result. Node/npm for [first use][manager] before running the
scripts. The installer uses the same Node 24+ with npm on all systems. Accepted
platforms stay on each `TOOL.json`; absence of restriction npm does not prove OS
test.

```console
node .pbai4devs/tools/skills/SCRIPT.mjs install
node .pbai4devs/tools/skills/SCRIPT.mjs update
node .pbai4devs/tools/skills/SCRIPT.mjs check
node .pbai4devs/tools/skills/SCRIPT.mjs run --version
```

Use the same commands on macOS, Linux, and Windows. `install` reuses a healthy
installation; `update` consultation `latest`; `check` checks without network;
`run` performs without installing; `info` shows the configuration. Without
action, there is help. `unlock <nome>` in the installer only recovers local
locks from processes proven to be closed; preserves active or uncertain lock(s).
[common installer][manager] accepts names or groups like `setup`, `install
base`, `update video`, `check source` e `list`.

The preparation verifies the CLI; application flows need specific evidence.
[safety flow](../commands/auditar-seguranca/COMMAND.md) uses offline analysis
and written reports. Public downloads require network, does not account. Skills
uses discovery without automatic import or symlinks. Portless is opt-in:
preparation does not start proxy. Webreel requires explicit executables to
record without downloading resources on `~/.webreel`; your guide lists the
overrides. Use state paths supported by `envPaths`, without changing `HOME`.
Versify tests and scripts; results, videos and captures stay in `.agent-tests/`.

Other candidates are conditioned to need, with adoption after defining product
and architecture; this setting does not add dependencies to the application.

| Candidate | When you consider |
| --- | --- |
| [emulate][emulate] | Emulate services used by integrations and IC. |
| [agent-eval][eval] | Compare agents with credentials and infrastructure. |
| [issue-graph][issues] | See issues via `gh` or authenticated Linear. |
| [konsistent][consistency] | Apply structural patterns to a TS project. |
| [phase][performance] | Analyze performance of an existing frontend. |
| [dev3000][debug] | Debug servidor/browser with runtime and proxy prepared. |
| [bash-tool][sdk], [AI SDK][ai] | Implement agents on the approved stack. |

`next-browser` It's on file. `before-and-after` is a skill in the current code;
the old CLI npm does not represent this format. `agent-skills` are sources of
skills, not additional CLIs. Import resources by project flow.

[browser]: agent-browser/README.md
[lint]: markdownlint-cli2/README.md
[desktop]: agent-desktop/README.md
[skills]: skills/README.md
[bash]: just-bash/README.md
[source]: opensrc/README.md
[video]: webreel/README.md
[proxy]: portless/README.md
[manager]: ../scripts/preparar-ferramentas/README.md
[emulate]: https://github.com/vercel-labs/emulate
[eval]: https://github.com/vercel-labs/agent-eval
[issues]: https://github.com/vercel-labs/issue-graph
[consistency]: https://github.com/vercel-labs/konsistent
[performance]: https://github.com/vercel-labs/phase
[debug]: https://github.com/vercel-labs/dev3000
[sdk]: https://github.com/vercel-labs/bash-tool
[ai]: https://github.com/vercel/ai

[reading-pt]: ../../../../.pbai4devs/tools/README.md
[reading-en]: README.md
[reading-es]: ../../../es/kit/tools/README.md
