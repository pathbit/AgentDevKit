---
description: "Guidance and verification of the order prior to implementation."
language: en
---

# Order before implementation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The project must be based on product and design decisions, pass through roadmap
and spec and complete the technical configuration before the application code.

## Acceptance criteria

- AC-001: `next` guides roadmap and spec before the technical configuration and
  does not assume approval or choose an ambiguous spec.
- AC-002: The prior verification informs lock if the preparation status or
  configuration is missing, invalid or pending; it does not modify Git.
- AC-003: Skills require proof of infrastructure before implementing and
  registering evidence of an application that does not yet exist as pending.
- AC-004: Existing projects, human files, links and index are preserved; testing
  and review cover decisions, gaps and resume.

The registered status does not prove evidence by itself. Instructions and
scripts do not prevent arbitrary writing by an agent who ignores them; this
protection depends on the permissions or hooks of the client used.

[reading-pt]: ../../../specs/preimplementation-order/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/preimplementation-order/SPEC.md
