---
description: "Local examples of agents and stages of a project."
language: en
---

# Examples

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Installation in synthetic projects

These recipes use Git, Node.js 24+ and a local tarball created from the current
copy of AgentDevKit. The package accepts Node.js 18+; with Node 18–23, the
launcher may need to prepare Node 24 before execution. For this offline example,
use Node 24+; see [prerequisites](../guides/prerequisites.md).

Use temporary directories outside of any Git repository. Recipes show
installation and query to the next step without simulating product approval; do
not execute them in a real project. Use a POSIX shell. Recipes have been
verified in macOS; running on Windows with Git Bash has not yet been validated.

At the root of AgentDevKit, create a temporary folder for the package and use
the printed path in the following command:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-pacote-')))"
npm pack --offline --ignore-scripts --pack-destination "<pasta-do-pacote>"
```

Replace `<pacote-local.tgz>` below by the absolute path of the generated file.
Tarball may contain local changes not yet published; these recipes do not prove
the behavior of the published version. Offline mode limits npm, but does not
prevent access to the network through other processes. For public installation,
see the [installation guide](../guides/installation.md).

### New Project

Create another temporary folder with the first command and enter the printed
path. Confirm that it is outside any Git repository before booting it:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-novo-')))"
cd "<pasta-do-projeto-novo>"
git init
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit init --agents codex,claude --lang en --yes
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit next --intent product --lang en --json
```

See the skill indicated in the field `next` and answer questions to prepare the
project and define the product. The installation does not create PRD He doesn't
even approve of decisions.

### Existing project

Create another temporary folder, confirm that it is outside any Git repository,
enter it and manage only the fictitious files:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-existente-')))"
cd "<pasta-do-projeto-existente>"
git init
node -e "const f=require('node:fs');\
f.mkdirSync('.claude');\
f.writeFileSync('AGENTS.md',\
'# Instruções existentes\n\nRegra sintética preservada.\n');\
f.writeFileSync('.claude/settings.json',\
JSON.stringify({env:{EXEMPLO:'local'}},null,2)+'\n');\
f.writeFileSync('.gitignore','cache-do-projeto/\n');\
f.writeFileSync('exemplo.txt','conteúdo preparado\n')"
git add -- exemplo.txt
git diff --cached -- exemplo.txt
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit init --agents codex,claude --lang en --yes
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit next --intent run --lang en --json
git diff --cached -- exemplo.txt
```

Check it out. `AGENTS.md`, `.claude/settings.json` e `.gitignore` in synthetic
folder and compare the two outputs of `git diff --cached`. Human orientation
should remain present even if the kit adds a block to the `AGENTS.md`; other
configurations and prepared content should be preserved. Use the skill indicated
in `next` for the pending step and, when preparing the execution of an existing
project, follow `preparar-dev`.

Commands generate new folders and do not remove previous examples. The
application code and data of these projects are fictitious and are not part of
AgentDevKit's Git.

## Two projects from scratch, with three specs

Examples create a API HTTP of memory tasks and a terminal calculator. Each
project receives PRD, UX decision, design and roadmap; then each of the three
specs is written, implemented and tested in sequence. They are didactic
products: approvals and review are simulated and do not replace human decisions
or review in a real project.

At the root of this repository, with Git, network and Node.js 24+ with npm:

```sh
node tests/example-workflows.mjs
```

Command installs public version of `@pathbit/agentdevkit` indicated in
`package.json` from this repository, with the Codex, Claude and Copilot clients
in two new Git projects. Creates an exclusive folder in the temporary directory
of the system, outside Git, and informs the report path. No previous folder is
deleted. To test another published version, pass the version number as argument.

To validate a local tarball without consulting registry npm, use `node
tests/example-workflows.mjs 0.0.30 --tarball /caminho/pacote.tgz`. Inform the
exact version of tarball; without version, uses the `package.json`. The offline
mode of npm does not block network of other processes. `--output` accepts a new
folder with existing parent, outside Git or in `tmp/`, `temp/`, `.agent-tests/`
e `examples/generated/` source, as long as ignored and without staged files.
`git add -f` or competing changes in the rules of ignoring can reverse the
examples.

1. Open it. `REPORT.json` in the informed folder and choose `api-tarefas` or
   `cli-calculadora`.
2. Read `docs/PRD.md`, `docs/UX.md`, `docs/DESIGN.md` e `docs/ROADMAP.md`.
3. Read `docs/specs/01/SPEC.md`, `02/SPEC.md` e `03/SPEC.md`; the tests of each
   step remain in `tests/` and the results in `.agent-tests/`.
4. Within the chosen project, turn `node --test tests/*.test.mjs`. For the
   calculator, try `node src/calc.mjs sum 2 3` e `node src/calc.mjs mean 2 4`.

A API is exercised on a temporary local port by testing; it does not persist
data and is not a production-ready service. The generator code is versioned; by
default, projects, caches and reports are outside AgentDevKit checkout.

### Play manually with an agent

Create a temporary folder outside any Git repository and enter it. The command
below prints a new path; use `cd` with the path returned:

```sh
node -e "const fs=require('node:fs'),os=require('node:os'),p=require('node:path');console.log(fs.mkdtempSync(p.join(os.tmpdir(),'agentdevkit-manual-')))"
```

Confirm that the chosen folder does not belong to a Git repository and run:

```sh
git init
npm init -y
npx --yes @pathbit/agentdevkit init --agents codex,claude,copilot --lang en --yes
```

In the chosen agent, perform the steps and answer the questions before moving
on:

1. Ask. `configurar-projeto`♪ then ♪ `criar-prd`: set one API to create and list
   tasks in memory. Use `criar-ux-ui` to justify the absence of visual interface
   and `criar-design-doc` to decide the technical design.
2. Ask. `gerenciar-roadmap` to order three increments: API, creation of tasks
   and list of tasks.
3. For each increment, part `criar-spec`, answer the questions and review the
   criteria. `implementar-spec` and validate the tests before the next spec.
4. Compare your files and results with `api-tarefas` in the automatic example.
   To repeat with the calculator, use the sum, average and input validation
   specs.

The manual design decisions are yours; the automatic generator uses synthetic
data.

## Existing real projects

To check the installation in fixed public clones at the root of the repository:

```sh
npm run test:oss
```

The [project matrix][oss-project-matrix] pins commits for Hibernate ORM, EF6,
Rust, Go, Tailcat, Express, Requests, Zod and Chi. For
one project only, use for example `npm run test:oss -- --project express`. The
clones and reports stay in a new folder within `tmp/oss-compatibility/`. The
test validates the kit, including file preservation and Git index; it does not
compile or execute cloned applications. It requires network and can download
large projects. For other options and limits, see [tests](../tests/README.md).

## Maturity scenarios

At the root of AgentDevKit, with Node.js 24+ and Git:

```sh
npm run examples
npm run test:examples
```

The first command prepares eight projects; the second prepares and tests another
eight in a new temporary folder outside Git. Each command informs the path. To
execute only one scenario:

```sh
npm run test:examples -- --case somente-agentes
```

The copies show the selected customers at the source and their notes:

```text
<pasta temporária>/agentdevkit-maturity-<id>/
├── README.md                    índice dos cenários
├── REPORT.json                  prepared, passed ou failed
└── somente-agentes/
    ├── .pbai4devs/              recursos compartilhados
    ├── .claude/                 apontamentos do Claude
    ├── .codex/                  apontamentos do Codex
    ├── .cursor/                 apontamentos do Cursor
    ├── .github/                 apontamentos do Copilot
    └── .opencode/               apontamentos do OpenCode
```

With all customers selected, the kit also generates `.agents`, `.zcode`,
`.kimi-code`, `.minimax`, `.mimocode` e `.dsh`. Examples can copy existing
project settings such as `.vscode`. The generator templates and assets are the
versioned source.

| Scenery | Content |
| --- | --- |
| only-agents | Shared resources without application |
| discovery | PRD in draft |
| planned | Product and design defined without code |
| start-app | API with incomplete structure |
| app-configured | API, planning and configuration |
| maintenance | Application with synthetic release history |
| legacy | Layout and preexisting settings |
| monorepo | Two modules and paths with spaces |

Each execution creates its own folder and preserves previous projects and
reports, including human files added to them. An existing explicit destination
is refused before any change.

Tests exercise local scripts and APIs. Product approvals and gate reviews are
synthetic data; they do not prove human revision, Docker, visual interface,
deployment or other operating systems.

Details: [test maturity](../kit/scripts/testar-maturidade/README.md).

[reading-pt]: https://github.com/pathbit/AgentDevKit/blob/main/examples/README.md
[oss-project-matrix]: https://github.com/pathbit/AgentDevKit/blob/main/tests/fixtures/oss-projects.json
[reading-en]: README.md
[reading-es]: ../../es/examples/README.md
