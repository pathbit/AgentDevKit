---
trigger: always_on
description: "Organization, concision and synchronization of shared resources."
language: en
---

# Structure

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use the specific skill or `criar-recurso`. Reuse before creating. Keep a source
per resource, a folder by name, and a main file by type. Write short
instructions; load optional details only when needed.

After creating, changing, renaming or removing hub resources, run
`sincronizar-agentes` and its `--check`. Register agency customers in templates
in `.pbai4devs/templates/clients/`, without treating tools as destinations.
Product documents outside the hub follow their own indexes; changing them does
not require synchronizing agents. Mirrors contain metadata and notes. Mirrors
only the main ones `SKILL.md`, `AGENT.md`, `COMMAND.md` e `RULE.md`. Do not
replicate templates, scripts, tools, status, tests, docs or guides. Notice with
`--force` when necessary: managed destinations can be overwritten and cleaned;
preserve native source and files outside this scope. `.pbai4devs` There's a
README short about its use. Each folder created in `docs/`, including necessary
ancestors, has a README concise about purpose and public; preserve existing
files. Guides `README.md` e `INSTRUCTIONS.md` They're just in `.pbai4devs`,
without mirroring. Automations follow `executar-script`: Identify OS, runtimes
and connectors; reuse installed scripts and tools before generating code in
conversation.
While configuring agents, keep product documents as templates. Shared tests are
next to each script in `tests/`; AgentDevKit's own tests are in `tests/`, at the
root. In tools, view fonts; downloads and logs stay in `<nome>/.local/`, cache
in `.cache/`, Launchers in `bin/`. Do not duplicate the installer or mirror
these features in the tools. Keep local derivatives and ignored by the syncer.
New fonts need to remain versionable; check out the result with Git.

[reading-pt]: ../../../../../.pbai4devs/rules/estrutura/RULE.md
[reading-en]: RULE.md
[reading-es]: ../../../../es/kit/rules/estrutura/RULE.md
