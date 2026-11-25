---
description: "Synchronized AgentDevKit publication in npm and GitHub Packages."
language: en
---

# Package in both registers

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit is a single package: [`@pathbit/agentdevkit`][package]It contains
the CLI and shared resources; the installation prepares the notes of the agents
chosen in the project.

Each version uses the same TGZ in both destinations, with the same number and
checksum.

| Destination | Visibility | Installation |
| --- | --- | --- |
| [public npm][package] | Public | `npx`, no login; default option. |
| [GitHub Packages][github] | Public | It requires GitHub authentication. |

In GitHub Packages, public means that the package is visible to everyone;
GitHub's npm registry requires token to download public packages as well.
[official authentication][github-auth] if you choose that fate.

Metadata identify PathBit as author, kit keywords and MIT license. README public
is generated without frontmatter and with absolute links of GitHub; the
versioned font preserves the YAML. `LICENSE` canonical accompanies the package
and is installed in `.pbai4devs/LICENSE`, without altering the consumer's
license. TGZ AgentDevKit.

## Install in project

Prepare them. [prerequisites](../guides/prerequisites.md)Then choose your
destination:

```console
npx @pathbit/agentdevkit init
```

The command above uses public npm without login. For GitHub Packages, do the
[initial authentication](../guides/installation.md#github-packages) and execute:

```console
npx --registry=https://npm.pkg.github.com @pathbit/agentdevkit init
```

To repeat an installation, set the version after the name, like
`@pathbit/agentdevkit@0.0.12`In both destinations.

Add `--agents codex,claude` to select customers, `--dry-run` to simulate or use
`update`, `doctor` e `sync --check` in place of `init`. There is no need to
install globally or add the kit to the application dependencies. To check the
versions:

```console
npm view @pathbit/agentdevkit versions --json
```

If a mapping of `@pathbit` to prevent switching destination, follow the
[registry diagnosis][fix].

## Publish by Actions

The publication uses the same TGZ approved by IC in both registers. Workflow
checks version, origin and integrity; an existing version is only accepted when
it contains the same bytes. Do not repackage or replace a published version.

Workflow prioritizes repository secret `NPMJS_TOKEN`, received by the internal
variable `NPM_TOKEN` only in publication. Token needs to allow publishing in
scope `@pathbit`; credentials never enter the versioned files.

The step of GitHub Packages uses `GITHUB_TOKEN` with `packages: write` and
confirms public visibility. Tokens from one registry are not sent to the other.
npm continues to use `NPMJS_TOKEN` or OIDC, with proof of anonymous consumption;
GitHub proofs use own authentication.

Without this secret, workflow uses OIDC. Set up **Trusted Publisher** npm:

| Field | Value |
| --- | --- |
| Organisation or user | `pathbit` |
| Repository | `AgentDevKit` |
| Workflow filename | `release.yml` |
| Allowed action | Direct publication with `npm publish` |

Fallback receives `id-token: write`. The npm requires CLI 11.5.1+ and Node
22.14+; the project uses Node 24. Configure the trust relationship after the
package exists; the first publication can use the secret `NPMJS_TOKEN`.

By default, a tag posts in both destinations. To complete the GitHub Packages of
an existing tag, replace `vX.Y.Z` by the desired tag:

```console
gh workflow run Release -f tag=vX.Y.Z -F package_only=true -f registry=github
```

If the artifact has expired, reexecute the IC from push to the main branch for
the exact commit pointed by the tag. `registry` accepted `both`, `npm` or
`github`. `package_only` prevents changing the existing release; each registry
refuses versions with different bytes and skips the publication if the same
version is already correct.

After uploading to npm, the job consults the published name and version and
downloads the uncredited tarball in initially empty cache. SHA-256 of the bytes
downloaded with the approved artifact and reuses the isolated cache to execute
`--version`, `init`, `doctor` e `sync --check` offline from the checked tarball.
Resolution by name and execution are separate proofs. Also confirm that `latest`
points to the stable version and that the tarball is downloadable; visible
metadata alone do not prove a functional installation. If the record does not
yet make the package available, wait for the verification without automatically
republishing the same version. `E404` e `ETARGET` the tarball download is
repeated within the same limited window.

GitHub Packages checks the same commands with authentication. Metadata should
indicate public visibility and association to the correct repository. Partial
failure allows you to repeat only the pending destination using the original
artifact; never recreate a published version with another content.

[Wiki](../README.md) · [Maintainer](maintenance.md) ·
[Installation](../guides/installation.md)

[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[github]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[fix]: ../guides/troubleshooting.md#download-platform-or-failing-tool

[reading-pt]: ../../maintainers/packages.md
[reading-en]: packages.md
[reading-es]: ../../es/maintainers/packages.md
