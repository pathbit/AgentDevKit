---
description: "Install and check external skills from the revised catalog."
language: en
---

# Manage external skills

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use Node.js 24+ and prepare the CLI with `node
.pbai4devs/tools/skills/SCRIPT.mjs install`. Commands accept an ID from
[catalog](../../../../../.pbai4devs/external-skills/CATALOG.json):

```console
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs list
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs discover cloudflare-web-perf
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs install cloudflare-web-perf
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs check cloudflare-web-perf
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs read cloudflare-web-perf
```

`list`, `check` e `read` They don't access the network. `discover` list the
source fixed using the CLI Officer. `install` reuses the verified copy; `update
<id>` applies the revised catalog pin or restores changed local content. Review
source, license and instructions before changing an entry to `reviewed`.

Na CLI kit installed, prepare the prerequisite with `agentdevkit plugins install
skills`- Use it. `plugins info <id>` to consult the origin and revision, and
`plugins install <id>` or `plugins check <id>` to operate on the revised entry.
Candidate entries serve the evaluation.

Downloads use `skills add` with `--agent universal --copy --yes`, in isolated
folder. The manager checks source, SHA, path and content; preserves the previous
installation when preparation fails. It does not call `skills update`, does not
execute skill scripts and does not change the catalog or mirrors.
`.agents/skills` inside the download is the format of CLI universal; it stays in
the cache of `.pbai4devs`without occupying the mirror `.agents` the project.

Offline test: `node --test
.pbai4devs/scripts/gerenciar-skills-externas/tests/TEST.mjs`.

[reading-pt]: ../../../../../.pbai4devs/scripts/gerenciar-skills-externas/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/gerenciar-skills-externas/README.md
