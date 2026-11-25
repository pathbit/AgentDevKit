---
description: "Recovery from Node.js by JavaScript without global installation."
language: en
---

# Prepare the runtime

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Initializer uses Node.js 18+ to prepare Node.js 24+ and local npm. On Windows,
it selects a version with removal correction in Unicode paths. Use Node.js LTS
24.13.1+ or 26+. If the bootstrap process itself is of an affected version, it
can use a cache compatible runtime. Otherwise, update Node by the system
manager. If Node/npm are completely missing, the agent must install them by the
operating system manager before running JavaScript or npx.

With Node available, run at project root:

```text
node .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --runtime-only
```

The mode `--runtime-only` print `node=<caminho absoluto>` without installing
tools. No options, continues with `setup`; accepts group or name. To prepare
runtime, diagnose and execute a script in sequence, see
[`--executar`](../executar-script/README.md)The plan and `--no-install` do not
lower runtime; do not restrict the effects of the processes that are executed.

The flow reuses a healthy runtime or local cache. If necessary, low Node 24 of
`nodejs.org`, check SHA-256 and extract using `tar` native. Windows uses ZIP;
macOS/Linux use tar.gz. No Bash or PowerShell scripts, permanent change of PATH
or global installation in this stream.

Probes preserve `NODE_OPTIONS`. When this variable is filled in, they isolate
their common stdout response. Asynchronous preloads and custom npm that depends
on internal details of Node can still prevent verification. Ambitional responses
are refused without downloading a runtime; `--raw` does not isolate the preload
output.

The cache is in `.pbai4devs/tools/.cache/runtime/`. Download, integrity or
validation failures preserve the previous runtime. Files and links outside the
distribution are refused. `tar` must be available on the system.

Browsers, desktop permissions and FFmpeg depend on the task and are not
installed or activated by this booter.

Source: [Official distributions of the Node.js][node].

[node]: https://nodejs.org/dist/latest-v24.x/

[reading-pt]: ../../../../../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[reading-en]: BOOTSTRAP.md
[reading-es]: ../../../../es/kit/scripts/preparar-ferramentas/BOOTSTRAP.md
