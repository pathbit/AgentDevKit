---
description: "Check, packages and releases of AgentDevKit."
language: en
---

# Maintenance and releases

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

To update the kit in a project, use [installation](../guides/installation.md).
This guide explains how to maintain and publish the generator.

## Maintain fonts and guides

Edit `src/` for the code, `tests/` for the tests and `.pbai4devs/` for shared
resources. Document objective, prerequisite, example and expected result. Use
links to details and avoid repeating the same rule.

When changing layouts, review templates, compatibility and tests. When changing
commands, review help, languages and examples. Markdown starts with frontmatter
and H1. Results and scan captures remain ignored.

## Check without wasting CI

IC verifies Linux and distributes portability into independent groups:

| Profile | Liability |
| --- | --- |
| Linux / Node 24 | Sources, product, infrastructure, lint and real package. |
| Windows / Node 24 | CLI, projects, features and layout in separate jobs. |
| macOS / Node 24 | The same portability groups in separate jobs. |
| Linux / Node 26 | Compatibility smoke. |
| Three systems / Node 18.20.8 | Launcher selects Node 24.13.1 C.I. |
| macOS / Node 24 | Native gate of metadata, in addition to portable groups. |

The macOS profile uses the default runner `macos-15-intel`The label.
`macos-latest` use ARM64 and may have different queues; check out the [runners
available][runners] Local proofs must inform the architecture used.

The actual distribution is tested once in the full profile. All Windows and
macOS groups need to pass to approve the IC. Each group has its own log and
limit, which makes it easy to identify the test that failed. Old performances of
the same reference can be cancelled when replaced, without canceling an ongoing
publication. New suites must integrate a portable group or register an explicit
justification to perform only in the full profile.

The workflow [Security tools smoke][security-ci] installs the three scanners
with revised pins on Linux, macOS and Windows. Then it analyzes local fixtures
without network, with unsafe and corrected cases. This proof validates the
operation of the tools; it does not certify the security of an application.
Standardized reports are saved as artifacts, without binary or fixture sources.

`npm run verify` performs the full profile. `ci:portable` e `ci:smoke` they run
the other profiles locally. `npm run test:examples` verifies the scenarios in a
temporary folder outside Git when the change affects the generation.
[contribution](../CONTRIBUTING.md) explains the checks during development.

## When a test can be skipped

The IC profile runner requires observable result. Failure, cancellation, TODO,
skip for no reason and group without approved evidence interrupt the profile. An
exception should inform the requirement that prevents execution in that
environment.

- macOS proves ACL, xattr, system flags and aliases. Box fixtures and aliases
  depend on the actual behavior of the volume.
- Windows on NTFS proof DACL, alternative flows and aliases 8.3. Fixture should
  create an alias that solves the file.
- Linux proves xattr, ACL POSIX e `O_NOATIME` with a compatible volume, `attr`,
  `acl` and Python 3 when required. The full profile requires the three
  synchroniser xattr tests by name. A fixture simulates the lack of `getfattr`.
- `native-linux-ownership` runs five isolated cases with real UID exchange. The
  rest of the full IC profile runs as a common user.
- Linux and macOS prove bits POSIX, signals for groups and file names
  incompatible with Windows. For directory protection, Windows uses junctions
  when they represent the same border.
- File symlinks, hardlinks, GNU Make and Docker Compose require environment
  support. The limitation that prevented the proof appears in the log.

The backend records each deletion by file, test, and reason. In the installed
command, this results in `partial`; the release accepts only the platform
exclusions provided for the full profile. The IC executes the mandatory evidence
on the platform itself and fails if it is skipped.

## Generate a package

O [IC][ci] wheel in pushes and PRs; can also be started in **Run workflow**The
full profile produces `agentdevkit-<versão>.tgz`, `SHA256SUMS`, notes and
manifesto. The article includes commit, execution and checksum to identify
exactly what has been tested. SHA and the attempt of the run. Actions Downloads
require login, with 14 days retention. The installation uses the package named
in [public npm](packages.md); releases preserve artifacts and checksums for
auditing.

To investigate locally:

```console
npm run build
```

The result is in `.agent-tests/release/<versão>/`This command does not publish
anything. Never view tarball or its reports. `pack:release` remains available
with the same behavior.

The profile `verify` tests the tarball you built. To use the same candidate in
directed checks, pass the absolute path of the file `.tgz` how
`AGENTDEVKIT_TARBALL` a `npm run test:distribution`. The test records the check
in `.agent-tests/release-artifact-verification.json`. Without the variable, the
distribution test generates its own temporary package.

In the compatibility suites, report `--tarball <arquivo>` a `npm run test:oss
--` or `npm run test:docs --`. To test the update, please inform `--from-version
<versão publicada> --to-tarball <arquivo>` a `npm run test:upgrade --`. Register
SHA- 256 of the candidate with the evidence.

## Publish a version

1. Update version and lockfile, changelog, examples and delivery scope.
2. Complete tests, documentation, and independent review. Use the candidate
   checkout tarball in the installation, compatibility, and matrix tests. For
   the update test, start in the latest published version and finish in the same
   candidate tarball.
3. Validate commit in `develop` and promote it to `main`. Follow the IC of
   `main` And when the version changes, the release workflow.

The full profile requires strict concurrent recovery tests. If any fails, the
package remains unapproved for publication. [roadmap](../product/roadmap.md) and
[tests](../tests/README.md).

After all the IC matrix passes, automation creates the tag `v<versão>` in the
verified commit and starts the release workflow. A published version-free push
does not generate another release. An existing tag is not moved: if the version
has changed and the tag points to another commit, the automation fails to
revision. Lower versions than those already registered are also not published
automatically. If a push cancels the previous IC and the version does not yet
have a tag, the next approved IC of the main branch can publish the version in
its own commit.

O [release workflow][release] locates the approved IC of a push in the main
branch, checks the commit and lowers its article by ID. Checks origin, version
and checksum before publishing. Do not repeat the suite or repackage. Also send
the same package to [public npm and GitHub Packages](packages.md), confers
integrity on both destinations and tests version, installation, diagnosis and
synchronization. The consumption by npm is anonymous; by GitHub, authenticated.

The tag `v<versão>`, the release of GitHub and the packages in both records
identify the same delivery. Manual execution also requires the tag; do not
create another tag for one version or move a previously published tag.
Publications made outside of this stream do not automatically create tags.

To consult the files of a version at the same checkout:

```console
git fetch --tags
git show v0.0.19:package.json
git diff v0.0.19..main -- src/
```

In an attended project, fix the desired package version and review the plan
before applying it:

```console
npx @pathbit/agentdevkit@0.0.19 update --dry-run --json
```

The command uses that version of the kit; do not automatically revert the Git
history or project files themselves. Check the conflicts and backup before
applying a previous version.

If the article has expired or a job from the CI has failed, use **Re-run all
jobs** in the original press IC and wait for all jobs. **Re-run failed jobs**
can keep the package from a previous attempt, which release does not accept.
Then rerun the release. A manual execution of IC serves for diagnosis, but does
not replace that origin. An existing release is not overwritten.

If upload fails after draft creation, it remains private. Check the draft before
trying again: the publisher does not replace an existing release, even in draft.
Remove only the incomplete draft of this attempt after checking the source;
never delete a published release to repeat the stream.

If you don't release it yet, use **Re-run failed jobs** or `gh workflow run
release.yml --ref vX.Y.Z` with the actual tag. Publication prioritizes the
secret `NPMJS_TOKEN` repository; without it, use OIDC,
[publication](packages.md). If tag creation or trigger fails, see execution
**Automatic release tag**. A tag in the correct commit can be resumed without
moving it; if it points to another commit, investigate before any publication.

If the release already exists and only the package is missing in one record, use
the mode `package_only` described in [npm
package](packages.md#publish-by-actions)He doesn't try to recreate the
existing release.

Executions completed with failure can be removed upon request, without deleting
approved executions, tags or releases. Check the list and preserve execution
identifiers and releases kept prior to cleaning.

## Check public delivery

Check out the version in [package page][package] and install by name on a
disposable project, following [npm package](packages.md). Test selection,
`doctor` e `sync --check`. Compare the integrity of the record with the approved
artifact; an IC approval does not replace the actual installation by the record.

[Wiki](../README.md) · [Community](community.md)

[ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/ci.yml
[release]: https://github.com/pathbit/AgentDevKit/actions/workflows/release.yml
[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[security-ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/security-tools.yml
[runners]: https://docs.github.com/en/actions/reference/runners/github-hosted-runners

[reading-pt]: ../../maintainers/maintenance.md
[reading-en]: maintenance.md
[reading-es]: ../../es/maintainers/maintenance.md
