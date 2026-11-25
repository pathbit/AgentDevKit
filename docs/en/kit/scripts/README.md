---
description: "Selection and use of shared automations."
language: en
---

# Scripts

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Prerequisite: [Node.js 24+ with npm](https://nodejs.org/en/download), preferably
an LTS version. `.mjs` and the same command in macOS, Linux and Windows. Bun is
not part of the validated contract. Versione scripts and tests; save results on
`.agent-tests/` only if the project to ignore, or use a temporary folder outside
the repository. Prepare local tools with `preparar-ferramentas`The application
runtime will be decided in the doc design; this requirement is for agents.
[bootstrap JavaScript](preparar-ferramentas/BOOTSTRAP.md) Preparing Node 24+
with `--runtime-only` or chain preparation, diagnosis and selection with
[`--executar`](executar-script/README.md)- No, no, no, no. Node/npm, the agent
installs first by operating system mechanism. No booters `.sh` or `.ps1` in the
kit.

At the root of the repository, use the script path to consult the environment:

```sh
node .pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs --no-docker-probe
```

In the diagnosis, `docker.daemonStatus` e `docker.composeStatus` are
`available`, `unverified`, `not-found` (absent execution of PATH) or
`not-requested` (executable found, but scan disabled). Query failed does not
prove the service is stopped. The query uses the Docker context configured,
which can be remote. To avoid calling Docker, use `--no-docker-probe` In the
diagnostic script, previous booleans remain for compatibility.

| Name | Purpose |
| --- | --- |
| `diagnosticar-ambiente` | Runtimes, packages and browsers available |
| `inspecionar-projeto` | Detects manifests, commands and structure |
| `reunir-contexto-spec` | Read the configured documents for a spec |
| `verificar-configuracao` | Checks the status before implementing code |
| `preparar-ferramentas` | Instala/atualiza local tools |
| `gerenciar-skills-externas` | Instala/check/read of local curated skills |
| `auditar-seguranca` | Offline scanners, local bases and reports drafted |
| `revisar-entrega` | Provides documentation, review and proof of change |
| `sincronizar-agentes` | Update notes; `--check` Just check. |
| `verificar-recursos` | Markdown structure, links and mirrors |
| `testar-infraestrutura` | Executes `tests/TEST.mjs` with Node |
| `testar-maturidade` | Executes temporary scenarios outside Git |
| `testar-navegador` | Scenes via Playwright connector; see [reference](testar-navegador/REFERENCE.md) |

## Infrastructure Script

`testar-infraestrutura` saves each execution into a new folder from
`.agent-tests/infraestrutura/` and informs the report path. Previous logs and
reports are preserved; symbolic links in the output directories and in the
discovery of suites are refused. Consumers of the old
`infraestrutura/REPORT.json` must use the path informed in execution. A symbolic
entry in `scripts` also interrupts discovery when not a suite. The report uses
`partial` for ignored tests, pending or no observable tests; in this case the
command returns error to prevent an incomplete proof to pass as complete. The
report identifies skips by name, relative file and reason, and informs when the
justification is missing. A skip per platform leaves the partial suite in the
script installed. The repository release stream accepts only the listed cases
that have coverage on the corresponding matrix platform. ACL listed or
unverifiable in the output directory interrupts execution before recording.
Verifications do not isolate tests or ensure containment against simultaneous
substitutions
paths or undetectable ACLs.

## Local Tools

Each [tool](../tools/README.md) It has `TOOL.json` and a `SCRIPT.mjs`, with
shares `install`, `update`, `check`, `info` e `run`. These scripts delegate to
the same installer; downloads stay in `.local/`. `preparar-ferramentas setup`
installs and verifies the compatible general selection CLIs. Tools with `optIn:
true` require explicit ID or group, as `setup workflow`For a group, use `setup
base`, `install base` or `update base`; `check base` does not install or query
new versions. CLI, `plugins list` e `plugins info <id>` They're going through
the catalogs. `plugins install <id>` e `plugins check <id>` delegate to the
installed hub managers and operate on one input at a time.

The test `preparar-ferramentas/tests/SMOKE_VERCEL.mjs` check optional CLIs
installed with local fixtures. Run with Node; results stay in
`.agent-tests/vercel-labs/`. The common suite remains independent of these
downloads.

The selector accepts JavaScript name or path, passes the arguments and preserves
the output code. Short names are first searched at the project root. To call a
kit automation, use the explicit path in `.pbai4devs/scripts/`. A failure ends
execution with the same code. `playwright-mcp` requires the connector: your
`SCRIPT.js` is code for a page, not a Node program. New automations use `.mjs`;
`.bun` not necessary. The tests of each script are in `<nome>/tests/`; Check if
the results and capture directories are ignored. Scripts, templates and tools do
not have copies in the agents.

The layouts come from `templates/clients/ADAPTERS.json` in the hub. The local
manifesto `espelhos.conf` the native metadata are next to the resources, with
frontmatter. YAML no body. Paths are relative to the root. Only the four main
files are sources; do not register documents. Use `gitignore|pasta` to register
folders as `.vscode`; the line does not create a `.gitignore` for the customer.

`sincronizar-agentes --force` does not allow to replace human content. Local
backups can stay in `.agent-tests/`; review them before restoring. `--check`
does not change files. The synchroniser also generates the full catalog and
auxiliary indexes from the sources. Helpers and tests are listed as support,
without pretending own commands. Existing ignores, index and Git configuration
are preserved; check the visibility of derivatives before adding them. Status
and indices are local. The maturity examples use local copies without downloads
or personal status.

[reading-pt]: ../../../../.pbai4devs/scripts/README.md
[reading-en]: README.md
[reading-es]: ../../../es/kit/scripts/README.md
