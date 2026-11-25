---
description: "Shared minimum automation utilities Node.js."
language: en
---

# Utilities

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`runtime.mjs` centralizes the requirement Node.js 24+, repository root and file
identification run. Do not install runtimes or configure the host. Also search
optional executables in PATH without starting a shell.

`managed-content.mjs` delimits the Markdown blocks that the kit can manage.
`managed-toml.mjs` reads blocks of ancient Gemini facilities CLI to validate and
remove references whose property was registered. `managed-toml-parser.mjs` use
`smol-toml.cjs` to validate the document before locating the prompt and
recognizing its managed block. [smol-toml
1.9.1](https://github.com/squirrelchat/smol-toml), distributed
`smol-toml.LICENSE` (BSD-3-Clause), without dependence on the consumer project.
The removal of a block can reserialize the value of the TOML prompt.

`gitignore.mjs` It detects conflicting rules and coordinates local migration.
`legacy-exclude.mjs` recognizes the exact block of the version 0.0.21 with a
single worktree. `legacy-exclude-write.mjs` record a private copy of the
original before publishing the preserved rules. Conflicts are pending for
review.

`collectErrorDiagnostics`, in `error-reporting.mjs`, collects own data without
running getters or traps of proxies; unsafe data or beyond the limit are
signaled as truncated. Other accesses to errors are not covered.

`recovery-effects.mjs` classifies the options analysed for the CLI apply the
recovery barrier before you hurry. `plugins list` e `plugins info` They're
appointments. `tools` and actions `plugins install` e `plugins check` Planning
can use a private internship.

`project-recovery.mjs` inspects, initiates, completes and resolves operations in
the journal shared by CLI and by direct sync. `recovery-store.mjs`,
`recovery-records.mjs` e `recovery-backup.mjs` they handle the storage, the
records and the backup verification.

`adapters.mjs` reads customer policy and generates `espelhos.conf`.
`adapter-manifest.mjs` provides the canonical header that the inspector also
uses to recognize the selection without customers.

`claude-legacy-exact.mjs` It recognizes only one exact legacy format of
reference Claude. Recognition does not attribute ownership or proof of
activation of the rule.

`catalog.mjs` identifies syntax errors from JSON external along the way, without
including excerpts from the content. Other diagnoses are not covered. In syntax
errors, readers JSON sites of `preparar-ferramentas` e
`gerenciar-skills-externas` inform the file type without copying its content or
path. Reading errors keep your code and message; other parsers are not covered.

`xattr-probe.mjs` query specific attributes and ACLs in macOS and detect
listable attributes on Linux. Inconclusive results do not prove absence.
`native-metadata.mjs` treats the preparation, verification and publication of
substitutions with metadata, including DACL and alternative flows in NTFS.

`file-owner.mjs` identifies files POSIX whose owner would change or whose
reading by the owner cannot be assumed. Groups, ACLs and competing changes
require additional verifications.

`state-path.mjs` identifies the current state or legacy without sharing data;
two simultaneous folders or symbolic links require resolving the conflict before
use.

[reading-pt]: ../../../../../.pbai4devs/scripts/lib/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/lib/README.md
