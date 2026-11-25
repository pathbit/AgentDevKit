---
description: "Revised catalog and local copies of external skills."
language: en
---

# External Skills

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

[CATALOG.json](../../../../.pbai4devs/external-skills/CATALOG.json) records
unchangeable origin, commit, file, name,
license, purpose and local revision. `reviewed` Indicates curatorship for the
described use. User instructions and project rules prevail. Inputs `candidate`
are available for consultation and source evaluation.

Use the [manager](../scripts/gerenciar-skills-externas/README.md) to list,
discover, install, check or read an entry. CLI `skills` by the tool manager.
Node.js 24+ is the common runtime. CLI, `agentdevkit plugins list` e `plugins
info <id>` the manager details the preparation of a revised entry.

The complete copies remain in `.local/<id>/`, with references and licenses
included by origin. CLI official download and copy; no skill is mirrored in
`.pbai4devs/skills/`, client folders or global directories. Only catalog, guides
and own automations are versioned. `licenseSource` points to the license
declaration in the same commit, including when it is at the root of the
repository and does not come next to the skill folder.

Updates require reviewing and registering a new SHA in the catalog. Reading a
skill does not execute its instructions: apply it only to the relevant task.
Evidence remains in `.agent-tests/`; publication, global installation and
external flows that alter the project depend on the corresponding request. Spec
Kit and OpenSpec follow their own flows and are not initiated by this catalogue.

Notes from each entry record additional dependencies and remote content. Pin
freezes copied files; searched rules later on `main` They need a new reading
before use.

## Local security

OpenAI Security Best Practices, OpenAI Security Threat Model and GitHub Security
Review have revised entries for local reading. The catalog records your limits:
do not treat old watchlists as current base or include secrets in reports. The
kit stream uses local scanners and does not require external account. Trail of
Bits Differential Review is a candidate reference CC-BY-SA-4.0; preserve
attribution and license without copying its contents to MIT files.

See [curatorship and adoption criteria][security].

## Other sources and flows

| Source | Application |
| --- | --- |
| [Vercel](https://vercel.com/docs/agent-resources/skills), [CLI Skills](https://github.com/vercel-labs/skills) | Discovery and download by CLI I'm ready. |
| [Cloudflare](https://github.com/cloudflare/skills), [Skills APIs](https://developers.cloudflare.com/agents/tools/skills/) | Local catalog and runtime APIs are distinct features. |
| [Microsoft](https://github.com/microsoft/skills), [Anthropic](https://github.com/anthropics/skills), [OpenAI](https://github.com/openai/skills) | Task references; check out licenses and dependencies of each folder. |
| [Oracle](https://github.com/oracle/skills) | Candidates for bank and Grail; use depends on stack. |
| [Tech Leads Club](https://github.com/tech-leads-club/agent-skills) | Community source; review license and evidence destinations. |
| [Spec Kit](https://github.github.com/spec-kit/), [code](https://github.com/github/spec-kit) | Take advantage of phases, artifacts and convergence; CLI Python/uv Stay out of the adopted Node runtime. |
| [OpenSpec](https://openspec.dev/), [code](https://github.com/Fission-AI/OpenSpec) | Own flow of proposal/design/tasks/verify; `init` depends on explicit decision because it changes the project. |
| [Dotcontext](https://github.com/vinilana/dotcontext), old [AI Coders Context](https://www.npmjs.com/package/@ai-coders/context) | Manually evaluate flow PREVC e `.context`; CLI, MCP, harness and optional hooks can change destinations. |

The revised entries of Microsoft, Anthropic and OpenAI are identified in the
catalog. Vercel Writing Guidelines should only contribute to compatible
editorial principles: their standards MDX/TypeScript and assignment of agents do
not replace the local standards of Markdown, Node and Git authorship.

[security]: ../../guides/security-references.md

[reading-pt]: ../../../../.pbai4devs/external-skills/README.md
[reading-en]: README.md
[reading-es]: ../../../es/kit/external-skills/README.md
