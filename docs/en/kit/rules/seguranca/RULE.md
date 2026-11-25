---
trigger: always_on
description: "Preserve access controls, data and entries during changes."
language: en
---

# Security

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

When playing authentication, permissions, data, entries or dependencies, use
[review-safe](../../skills/seguranca/revisar-seguranca/SKILL.md). Access
decisions belong to the server and resource, not only to the interface.
RLS/policies in PostgreSQL and Security Rules in Firebase according to stack.

Validate entries, use parameterized queries and code outputs through context.
Uploads and abuse limits require own rules. Do not treat all public key as a
secret or expose real credentials in code, bundles, logs or evidence.

Scanners indicate signs; do not replace analysis and authorization tests. Do not
suppress unsorted findings, do not disable controls to pass tests and do not
declare security for an unexecuted scenario.

[reading-pt]: ../../../../../.pbai4devs/rules/seguranca/RULE.md
[reading-en]: RULE.md
[reading-es]: ../../../../es/kit/rules/seguranca/RULE.md
