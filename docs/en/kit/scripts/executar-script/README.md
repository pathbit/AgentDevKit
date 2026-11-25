---
description: "Common Node script executioner for the project."
language: en
---

# Run Script

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use Node 24+ with a repository folder or file. Short names are first searched at
the project root. To call a kit automation, pass the explicit path in
`.pbai4devs/scripts/`. The command works in the three OSs:

```console
cd .pbai4devs/scripts/preparar-ferramentas
node BOOTSTRAP.mjs --executar --plan .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs
node BOOTSTRAP.mjs --executar .pbai4devs/scripts/preparar-ferramentas list
cd ../../..
```

`--executar` prepares Node/npm, diagnose and then only call the selector.
Diagnostic failure interrupts operation, including if there is invalid tool
configuration unrelated to target; inspect failure. Successfully diagnosis
indicates completed inventory, not that all target dependencies are ready. Com
`--no-install`, bootstrap uses the current runtime, the first Node of PATH or
the cache, provided it is compatible, without downloading or installing runtime.
This option does not restrict network or facilities by diagnosis or child
script. The plan also does not download, install or diagnose, and uses the same
runtime options. The target, its arguments and output code are preserved.
`--executar` gathers the runtime path, diagnosis, selector header and target
output; it is not a JSON single nor a gross output from the target. The direct
selector also includes its own header.

Use `--raw` before the name of the script to send to stderr the metadata and the
kit diagnosis, keeping the output of the target in stdout:

```sh
node .pbai4devs/scripts/executar-script/SCRIPT.mjs --raw .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
cd .pbai4devs/scripts/preparar-ferramentas
node BOOTSTRAP.mjs --executar --raw .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
cd ../../..
```

In this mode, runtime, plane, diagnosis and header go to stderr, next to the
target errors; stderr can contain mixed formats. Without other environment
outputs, `--raw --plan` e `--raw --help` leave stdout empty and show plan or
help in stderr. Options after name belong to target, including `--raw` e
`--plan`.

Preloads or environment instrumentation such as `NODE_OPTIONS`, you can write in
stdout before the kit process `--raw`, including in plan or help, or interfere
in the identification of runtime. To process strict bytes, control this
environment; the kit preserves `NODE_OPTIONS` and does not automatically remove
it.

With Node 24+ already available, the selector can be called directly:

```console
node .pbai4devs/scripts/executar-script/SCRIPT.mjs --plan .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs list
```

`--plan` shows the file without running it. Arguments and output code are
preserved; failures do not try another runtime. Scripts shell/Python and
symbolic links are refused. `.js`/`.cjs` Existing use the same Node.

With Node 18+, the [bootstrap JavaScript](../preparar-ferramentas/BOOTSTRAP.md)
accepted `--runtime-only` and prepares Node 24+ before operation requested.
Node/npm, the agent first installs runtime by the OS mechanism. The default
bootstrap mode also prepares the tools; book it to setup.

`testar-navegador` keeps Playwright executable specified on `SCRIPT.conf`;
without `--plan`, returns 69 for the agent to use the connector without running
the file. When present, `SCRIPT.conf` requires a single entry `executor=node` or
`executor=playwright-mcp`; comments `#` are allowed. Empty, unknown or duplicate
settings fail before running any script.

[reading-pt]: ../../../../../.pbai4devs/scripts/executar-script/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/executar-script/README.md
