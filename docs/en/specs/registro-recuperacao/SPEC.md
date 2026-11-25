---
description: "Conservative validation of immutable recovery records."
status: aprovado
language: en
---

# Recovery log

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

First component of [conservative recovery](../recuperacao-conservadora/SPEC.md).
This increment is a pure function: does not read or write files, does not change
installation or sync and does not yet protect projects. The user's general
authorization covers the increment; the historical rollback contract remains
unchanged. [PRD](../../product/prd.md), a [UX](../../product/ux-ui.md), o
[design](../../product/design.md) e o [roadmap](../../product/roadmap.md)
They're still valid.

## Contract

Receive records as name pairs and bytes, already obtained by a caller. Accept
only canonical names `<geração de 12 dígitos>.<tipo>.json`, starting in
generation 1, and the guys `claim`, `begin`, `done` e `resolved`Each record is
JSON canonical UTF-8, no spaces and finished by a line break. Keys appear in
order `version`, `generation`, `id`, `kind`, followed by the keys below; no
extra fields are accepted. The version is `1` And the ID is UUID tiny v4.

| Type | Additional keys in order |
| --- | --- |
| `claim` | `previous`: `null` or hash from the previous terminal. |
| `begin` | `claim` e `manifest`: Small hexadecimal hashes. |
| `done` | `begin`: SHA-256 bytes of `begin`. |
| `resolved` | `claim`: hash; `begin`: hash or `null`. |

`claim.previous` é `null` in the first generation. `begin` points to the hashes
of the `claim` and the manifest; `done` hash of bytes of `begin`; `resolved` the
hashes of `claim` and `begin`, or `null` when this does not exist. Each
generation must have its own ID and `claim`; `done` requires `begin`; `done` e
`resolved` previous generations must be completed or resolved. without terminal,
the last generation is pending. Without records, is ready. Any error, unknown
name, duplicate, truncation, JSON non-canonical, inconsistent hash, incomplete
sequence or exceeded limit returns `invalid`. Do not print record data. Limit
size per record and total entries (4.000), 4.096 bytes per record and 1 MiB in
total; accept only bytes and explicit names without shared memory. `ready`
returns `generation` e `head` (end hash or `null` for empty list; when there are
records, it also returns `terminal` e `resolvedCount`. `pending` returns
`generation`, `id` e `phase`; `invalid` returns `reason` with fixed code. The
output does not play bytes or arbitrary fields of the content received.

The input must be a common array of the same JavaScript context, without own
iterator or gaps. Each entry must have its own data properties `name` e `bytes`,
without getters or proxies; bytes must be `Uint8Array` or `Buffer`, including
subclasses, with `ArrayBuffer` not shared. Rejected entries do not execute
getters or iterators provided by the caller.

`ready` means only that the received list is coherent and does not contain
pending operation. An empty list or tail omitted does not prove that the disk
log is empty or complete; the chain does not prevent tampering. A future caller
should verify its reading and treat any different state of `ready` the format
does not distinguish the human motive from a resolution and does not allow to
ignore the plan or the current content of the project.

SHA-256 detects divergence, does not prevent tampering by those who write the
journal. This function does not validate files, links, permissions, backup or
durability. The future protocol needs safe reading, exclusive publication,
failure handling and integration before any warranty. [Node
documentation](https://nodejs.org/api/fs.html#file-system-flags) informs that
exclusivity may not work on network file systems. Before integration, define
connection to project and secure retention: a legitimate diary can reach the
limits and, today, it would be refused. There is no compaction or automatic
cleaning in this component.

## Acceptance criteria

- **AC-001:** Empty, pending, completed, resolved tests and multiple generations
  validate the states and do not alter the bytes provided.
- **AC-002:** Tests reject duplicates, holes, invalid transitions, unknown
  versions and names, truncated data and divergent hashes.
- **AC-003:** Limits, UTF-8 invalid, JSON with duplicate or extra fields and
  non-canonical formats fail conservatively without printing content.
- **AC-004:** The same tests pass on macOS and Linux; Windows is registered as
  not checked until a real run. No integration is alleged.
- **AC-005:** In three rounds, 16 processes compete for an exclusive creation;
  only one wins in each round in the tested system. This does not prove
  exclusivity in network file systems or ensures future integration.

Run `node --test tests/recovery-records.test.mjs
tests/recovery-exclusive.test.mjs` with Node 24+. Save logs in
`.agent-tests/registro-recuperacao/`. Tests, spec and code are versionable;
results and fixtures stay out of Git. Release depends on complete integration,
review and proofs, including strict rollback tests.

[reading-pt]: ../../../specs/registro-recuperacao/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/registro-recuperacao/SPEC.md
