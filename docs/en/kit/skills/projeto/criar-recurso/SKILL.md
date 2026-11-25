---
name: criar-recurso
description: "It forwards creations and creates documents, models or new features."
language: en
---

# Create Resource

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

If the request is a template, work on `.pbai4devs/templates/` without starting
product definition. Send real documents to the corresponding skill. For
documents, start with inventory and plan of `atualizar-documentacao`.

Check if the feature already exists and use the specific skill when available:
`criar-skill`, `criar-agente`, `criar-comando`, `criar-regra`, `criar-prd`,
`criar-ux-ui`, `criar-design-doc` or `criar-spec`. Preserve the prerequisites.
For supplier knowledge, see `usar-skills-externas` and reuse the cured catalog,
keeping downloads out of the versioned instructions.

For other types, clarify purpose, audience, exit and doubts that affect
decisions. Just create what is necessary: `.pbai4devs/<tipo>/<nome>/<TIPO>.md`
for agents’ resources; `.pbai4devs/templates/<nome>/TEMPLATE.md` for templates;
real documents in the agreed destination, only when the project starts. In each
new Markdown, including templates, include frontmatter YAML suitable and H1.
Scripts and settings use their own format in the same organization by name.
Support Scripts follow `executar-script`: Write `.mjs` for Node.js 24+, reusing
the common code without variants by operating system. Application code follows
`implementar-spec`.

Tools use `.pbai4devs/tools/<nome>/TOOL.json` and a `SCRIPT.mjs` Fine delegating
to `preparar-ferramentas`. Define official origin, download method, update,
platforms and probe; do not duplicate the installer. Only settings, scripts and
tabs are versioned; packages and logs stay in `.local/`- Use it. `envPaths` only
for directories supported by the application, without changing `HOME`.

Keep instructions short and use references for optional details. Use
`verificar-trabalho` to choose and run the applicable proofs. Follow the
structure and quality rules; update the indexes if you change the inventory.
When creating a first-level folder in `.pbai4devs`, include a README short about
purpose, items and time of use. Mirror only skills, agents, commands and rules;
templates, scripts, local tools, state and guides stay in `.pbai4devs`. Check if
new sources are allowed by `.gitignore` local. For new native types or files,
update the [templates](../../../templates/gitignore/TEMPLATE.md). Finish with
`sincronizar-agentes` e `--check`. Documents and auxiliary resources are never
mirrored. Please inform the file and to-dos.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-recurso/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/criar-recurso/SKILL.md
