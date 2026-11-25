---
description: ">-"
  Empacotamento, verificações do CI e publicação do artefato aprovado.
language: en
---

# Release

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`assets.mjs` generates tarball, checksum, notes and manifesto in
`.agent-tests/release/<versão>/`. Requires Node.js 24+ and npm. Notes include
npx commands versioned for npm and GitHub Packages, host authentication and
links to installation and prerequisites.

`pipeline.mjs full` check product, infrastructure, Markdown and exact tarball
once. The profile prepares the CLI `skills` to test the actual integration with
a local fixture. The infrastructure report records the unique tests of another
platform as partial. Pipeline accepts only the predicted omissions. `full` check
the Linux cases. `portable-resources` performs the infrastructure delegated to
macOS and Windows, and `native-macos-metadata` checks the native preservation in
a separate gate. Missing faults or tools block the verification. `portable`
executes all portability groups locally; in the IC, `portable-cli`,
`portable-source-integration`, `portable-selection`,
`portable-selection-lifecycle`, `portable-selection-codex`,
`portable-selection-all-root`, `portable-selection-all-leaf`,
`portable-projects`, `portable-projects-git`, `portable-projects-callbacks`,
`portable-projects-matrix`, `portable-recovery`, `portable-recovery-metadata`,
`portable-migration`, `portable-cli-line-endings`, `portable-resources`,
`portable-resources-clients`, `portable-claude-rule-cli`,
`portable-resources-managed`, `portable-managed-content`,
`portable-managed-lifecycle`, `portable-managed-protection`,
`portable-legacy-toml`, `portable-retired-client-migration`,
`portable-sync-core`, `portable-sync-core-updates`, `portable-sync-ownership`,
`portable-sync-preservation` e `portable-layout` run in separate jobs on Windows
and macOS. The four sync profiles run the seven input point modules
`tests/TEST.mjs` Synchronizer. The two core profiles forward to `BASE.mjs` e
`UPDATES.mjs`, respectively. On Windows, `portable-cli` confers whether the
installation and direct sync preserve the DACL from updated files in NTFS, using
an explicit read rule in fixture. `portable-source-integration` isolates the
convergence test between the CLI and direct synchronization, including the
preservation of the ignore and the Git index. Managed content tests, life cycle
and protection of human changes share fixture and perform in dedicated jobs.
Isolated callbacks and matrix tests are separated to limit the duration of each
job. CRLF They have jobs
The pipeline limits each process to 50 minutes on Windows and 40 on other
systems. The verification job has up to 60 minutes to perform all your steps.
Portable profiles use the output TAP in Actions to record failures as the tests
end. The five cases of obstruction are preserved; the three root and group cases
and the two leaf of the all selection are in separate profiles. `full` still
runs all the suites. `smoke` Check out Node 26. `check` Checks the resources.

`auto-tag.mjs` waiting with limited rereading if API not yet show the tag you
just created. Release is only triggered after confirming that the tag points to
the IC approved commit.

`publish.mjs resolve` locates an approved push IC from the same tag commit. The
solver waits up to 65 minutes if the execution is still ongoing. `publish`
confers origin and hashes, and publishes the same bytes. Absence of valid
artifact requires executing the IC; publication does not generate another
package.

`packages.mjs` publishes the same tarball in public npm and GitHub Packages, and
verifies the CLI installed for each record. npm consumption is anonymous; in
GitHub, authenticated. Manual mode `package_only` meets already published tags
without re-creating the release. See [the two
registers](../../maintainers/packages.md).

Workflow prioritizes secret `NPMJS_TOKEN`received as `NPM_TOKEN` in the npm
publication; without it, uses OIDC. GitHub Packages uses its own workflow token,
without sharing credentials among hosts. No secret or result is versioned. See
[maintainer](../../maintainers/maintenance.md).

The build prepares the files in temporary area and preserves a divergent
previous output. A repeat accepts the same content, including the legacy
manifest with a check mark in the recognized format, without rewriting it. The
old tag does not replace the checks of the current execution.

After checking the tarball, the full profile creates a marked copy in a unique
runner directory without changing the source manifest. In the IC, the explicit
option `--github-output` informs as you upload the path of this copy; the option
requires `GITHUB_OUTPUT` ed `RUNNER_TEMP` and out of the project. Failures or
changes in the source directory are not resolved by replacing existing files.

Static symbolic links in `.agent-tests` or in the folder `release` If cleaning
fails, preserve the informed paths and review the waste before attempting again.
Checks are not atomic against concurrent changes nor prove ACLs or extended
attributes.

[reading-pt]: ../../../../scripts/release/README.md
[reading-en]: README.md
[reading-es]: ../../../es/scripts/release/README.md
