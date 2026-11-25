---
description: "Index of the shared structure of the agents."
language: en
---

# AgentDevKit resources

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`.pbai4devs` is the shared source of the resources installed by AgentDevKit. For
the work order and commands, read [INSTRUCTIONS.md](INSTRUCTIONS.md). The local
catalogue `catalog.json` is generated from the sources by the syncer. It
includes features, tools, automations, templates and external references.
`skills.json`, `rules.json` e `agents.json` are auxiliary indexes of the
sources. Selected clients use their notes directories. `state/agentdevkit.json`
save the selection in `clients`, with chosen IDs or one of the modes `all` e
`none`. The local manifesto `espelhos.conf` records how the synchroniser designs
this selection. Catalogs, manifests and status are local derivatives. Native
folders can also contain human files. The team decides what to version. In the
kit repository, the product code is in `src/`, `bin/`, `tests/` e
`scripts/release/`, at the root. Use `agents` to consult, `agents add <id>` to
add and `agents remove <id>` to withdraw customers. `none` prepares only the hub
and `AGENTS.md`. `all` includes active customers.
The hub is complete; customers can share necessary folders.

| Folder | What's it for? |
| --- | --- |
| [Skills](skills/README.md) | Task procedures and their creators |
| [agents](agents/README.md) | Profiles for review and delegation |
| [commands](commands/README.md) | Use and referral cases |
| [rules](rules/README.md) | Guidelines implemented by context |
| [templates](templates/README.md) | Templates for future documents |
| [scripts](scripts/README.md) | Automations and tool selection |
| [tools](tools/README.md) | Versioned definitions and ignored local installations |
| [external-skills][externas] | Curated catalog and local downloads |

Only `SKILL.md`, `AGENT.md`, `COMMAND.md` e `RULE.md` in your folders have notes
in the tools. The source is grouped; the destinations use the registered layout.
[compatibility](COMPATIBILIDADE.md) Customers. Auxiliary resources and guides
remain exclusively in `.pbai4devs`. The license of the kit is in `LICENSE`
inside this hub after `init` or `update`. It comes from the package and does not
replace the license of the consumer project. `scripts/<nome>/tests/`; store
results in directory ignored by project or temporary outside the repository.
`.gitignore` from this folder only controls your tree; the kit preserves
ignored, index and `.git/info/exclude` Humans. Migration can only remove the
recognized legacy block from version 0.021. Customers do not receive new
ignores. Notes and artifacts may be visible in Git. Check with `git status` e
`git check-ignore -v -- <caminho>`; `git ls-files -- <caminho>` identifies files
already tracked, which are not removed from the index by an ignore rule.
[templates](templates/gitignore/TEMPLATE.md) if the project needs to
Additional rules. Use `agentdevkit plugins list` to consult external tools and
skills. Use the respective guides to prepare a local installation or check the
origin of an input. [& Tools](tools/README.md) · [External Skills][externas]

Templates follow each phase. After implementing, use `atualizar-documentacao`
and the command `revisar-entrega` to close documentation, review and evidence.

Use the [command sync](commands/sincronizar/COMMAND.md) to update notes; script
also accepts `--check` to just check. [examples of
maturity](scripts/testar-maturidade/README.md) are in a temporary folder outside
Git, with copies of the structure and local reports.

[externas]: external-skills/README.md

[reading-pt]: ../../../.pbai4devs/README.md
[reading-en]: README.md
[reading-es]: ../../es/kit/README.md
