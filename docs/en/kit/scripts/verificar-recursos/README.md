---
description: "Verification of shared resources and their notes."
language: en
---

# Check resources

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs --source-only
node --test .pbai4devs/scripts/verificar-recursos/tests/TEST.mjs
```

Requires Node 24+. Checks mirrors, frontmatter/H1, local links and tool guides.
Ignore downloaded packages and temporary results, including Playwright in any
box. Common Fixtures remain checked. Includes root Markdown, from `docs/`,
`src/`, `bin/`, `tests/`, `scripts/`, `examples/` and GitHub contribution
templates. Delete `examples/generated/`. This collection uses only the directory
that is informed without looking for another Git repository. It uses the local
Markdown lint when installed and informs its absence. It does not install or
synchronize features. Tests and fixtures are versioned; temporarys stay in
`.agent-tests/`.

`--source-only` validates the sources without requiring catalogs, manifests or
generated clients. References to derivative indexes are checked by the catalog
in memory; links to nonexistent sources remain errors.

[reading-pt]: ../../../../../.pbai4devs/scripts/verificar-recursos/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/verificar-recursos/README.md
