---
description: "Copied projects to test the flows at different maturity."
language: en
---

# Test maturity

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Requires Node.js 24+ and Git. At the root of the repository:

```sh
npm run examples
npm run test:examples
node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run
node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run --case legado
node --test .pbai4devs/scripts/testar-maturidade/tests/TEST.mjs
```

`prepare` only generates copies; `run` generates and executes. Each execution
creates a new unique folder in the temporary directory of the system and informs
your path on the console. By default there are eight scenarios: agents,
discovery, planning, initial application, configured, maintenance, legacy and
monorepo with paths in Portuguese. `--case` to execute only one.

Checkout npm commands pass `--source-only`. This mode uses `npm pack --dry-run`
in offline mode, with disabled scripts, to list the pub's publicable sources.
The copy starts without manifest, indexes, local selection, mirrors or checkout
entries. `sourceMode: "package-source"`.

When running the script installed directly, the default mode is `"project"`. It
uses the manifest or selection saved in the project and copies the local entries
with the checks described below. An old route to `.gemini` prevents the
execution of the copy syncer. Review the configuration before testing this
layout.

Harness copies real features and settings; deletes packages, caches, logs, test
results, Playwright and temporary folders in any box, `.git` and known names of
credenciais/overrides local. Do not semantic scan of secrets. Use `--output
<caminho-novo>` to choose another non-existent folder with existing parent. At
source, they are accepted `tmp/`, `temp/`, `.agent-tests/` or
`examples/generated/` only when Git confirms the ignore and there are no
destination files in the index. Out of source, use a folder outside any
repository. If the default temporary is inside Git or if it is not possible to
query Git, the execution fails before copying. A destination must be new;
previous executions and projects are neither overwritten nor removed. Each
example receives local Git, no commits or changed identity. The generated
directory contains its own ignore as additional protection. If the preparation
fails, the index of the new execution remains in `preparing`. Scenario processes
do not inherit variables `GIT_*` user; this prevents the example Git from using
another directory or index specified by the environment.
fsmonitor is disabled in queries and scenarios processes, without changing the
user Git configuration. For local output, the query respects the effective
ignore configuration, but refuses variables that select another repository or
index. The entire index is examined: Unicode names or potentially equivalent
specials block output when it is not possible to prove that they are different,
including in file systems with unknown rules. This can block names that would be
different; use the default temporary output in this case. Indexes whose response
exceeds 64 MiB are also refused instead of assuming that there are no conflicts.
API, `prepareExamples({ initializeGit: false })` also works without Git for
output out of source: in this case the check uses only the markers `.git` and
the structure of bare repositories in ancestral directories. Variables `GIT_DIR`
e `GIT_WORK_TREE` defined make execution fail; a user can still point Git
commands directly to any folder. Choose a private temporary outside any
repository. Source outputs continue
The generator checks links, Git's absence and output identity before and after
steps, but this is not an atomic protection. A concurrent process with
permission to move directories or start Git on output can still redirect a
script or convert it between checks. At local output, change the ignore or run
`git add -f` you can also version the examples. Use a private temporary area
without concurrent access; the folder is created with 0700 mode when the OS
supports it. `.pbai4devs` and registered customers are copied. The local
manifest takes precedence. Without it, templates respect the saved selection. A
legacy state without selection keeps the option `all`Without manifest or status,
the copy only works with the hub. `.vscode` requires registration. Regular
entries `AGENTS.md`, `CLAUDE.md` e `GEMINI.md` present in the source are copied
to the root. When one of them is a symbolic link, the copy does not follow the
destination: it omits the original entry and records its name in
`omittedEntrypoints` in the report. Fixture preparation can generate a proper
input later.
Templates replace only entries with valid managed blocks; own or edited entries
are preserved. Without installation status, existing entries are copied without
assuming ownership of the kit. Tests resolve each note by the client's declared
format and resource.

Copies store the original catalogues in
`.agent-tests/testar-maturidade/original-catalogs/` and generate new operating
catalogs without changing source files. Source files overwritten by fixture stay
in `original-files/` in the same folder. The report identifies each copy: the
scenario is not a test of the original project on site. They do not copy the
product code in `bin/`, `src/`, `scripts/` or `tests/`, neither these folders in
the old location within the hub. Perform synchronization, repair, idempotence,
resource verification, diagnostic, inspection and negative and positive gates.
With selected customers, repair proof removes a managed mirror from the copy. If
the selection is only the hub, removes the catalog `.pbai4devs/catalog.json`In
both cases, it confirms that `--check` detects the absence, restores the
original bytes and repeats the verification. `syncRepair` the report identifies
the repaired file and its log. In two cases, creation, editing, renaming,
removal and preservation of changed indexes exercise the whole cycle.
Applications run tests HTTP real in ephemeral doors, closed at the end. Legacy
and monorepo preserve their files.
Copied tools run out of downloads: negative check is expected.

The positive gate simulates the opinion to test your contract; it does not
represent human review. Approval states are synthetic data. No test certifies
production, Docker, visual interface or other operating system.

Index and report remain in `README.md` e `REPORT.json` Logs and proofs stay in
the directory. `.agent-tests/` within each example, all ignored. Each fixture
creates `.agent-tests/.gitignore` to protect these artifacts without altering
the `.gitignore` copied from the project.

[reading-pt]: ../../../../../.pbai4devs/scripts/testar-maturidade/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/testar-maturidade/README.md
