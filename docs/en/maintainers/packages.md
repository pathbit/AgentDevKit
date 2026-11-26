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

[npm Trusted Publishing][trusted-publishing] uses OIDC and generates
provenance automatically. Register `pathbit/AgentDevKit` with workflow
`release.yml`, leave the environment blank, and enable **Allow npm publish**.

After registering the relationship on npm, set the repository variable
`NPMJS_AUTH_MODE=oidc` in GitHub. Without the variable, the workflow uses
`NPMJS_TOKEN` when available. OIDC uses `id-token: write`, npm 11.5.1+,
and Node.js 22.14+. The runner uses Node.js 24.

GitHub Packages uses `GITHUB_TOKEN` with `packages: write`. The npm job
checks the public download without credentials.

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

The job downloads the public tarball from npmjs without credentials, checks
its bytes, and runs `--version`, `init`, `doctor`, and `sync --check` in an
isolated cache. It confirms that `latest` points to the published version or
a newer stable release. An older version can be verified if the same bytes
exist. While npm prepares the download, the job waits for availability
without attempting another publish.

GitHub Packages checks the same commands with authentication. Metadata should
indicate public visibility and association to the correct repository. Partial
failure allows you to repeat only the pending destination using the original
artifact; never recreate a published version with another content.

[Wiki](../README.md) · [Maintainer](maintenance.md) ·
[Installation](../guides/installation.md)

[trusted-publishing]: https://docs.npmjs.com/trusted-publishers/
[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[github]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[fix]: ../guides/troubleshooting.md#download-platform-or-failing-tool

[reading-pt]: ../../maintainers/packages.md
[reading-en]: packages.md
[reading-es]: ../../es/maintainers/packages.md
