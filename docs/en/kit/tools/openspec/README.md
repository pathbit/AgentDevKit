---
description: "Validation and archiving of deltas with the CLI OpenSpec."
language: en
---

# OpenSpec

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The plugin installs the CLI [OpenSpec, Fission AI][source], under [license
MIT][license]. The installer gets `@fission-ai/openspec` and check the torque
`openspec` with `--version`. The installation requires explicit selection.

At the project root with AgentDevKit installed:

```console
npx @pathbit/agentdevkit plugins install openspec
npx @pathbit/agentdevkit plugins check openspec
```

In a project with a completed OpenSpec change, replace `entrega` by the ID of
the change and review the delta before performing the filing.

```console
node .pbai4devs/tools/bin/openspec.mjs validate entrega --type change --strict
node .pbai4devs/tools/bin/openspec.mjs archive entrega --yes
```

Archive applies the approved deltas to the current specs and moves the switch to
`openspec/changes/archive/`. O `--yes` confirms write without prompt. To adopt
OpenSpec in a new project, choose and run your preparation stream separately.
The plugin leaves OpenSpec configuration in charge of the project.

[Documentation CLI][cli] · [& Tools](../README.md)

[source]: https://github.com/Fission-AI/OpenSpec
[license]: https://github.com/Fission-AI/OpenSpec/blob/v2.1.1/LICENSE
[cli]: https://github.com/Fission-AI/OpenSpec/blob/v2.1.1/docs-lab/reference/cli.md

[reading-pt]: ../../../../../.pbai4devs/tools/openspec/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/openspec/README.md
