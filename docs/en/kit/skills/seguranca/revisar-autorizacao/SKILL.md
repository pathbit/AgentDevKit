---
name: revisar-autorizacao
description: "Checks identity, resource permissions, and user isolation."
language: en
---

# Review authorisation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Identify subjects, roles, resources and operations allowed. Read routes,
middleware, data policies and testing; do not deduct authorization from the
interface. If the contract does not exist, gather questions before proposing
changes. Use the language saved in the kit state. Differentiate observed
behavior of potential impact and justify gravity by proven exposure; when use or
reach is not known, please inform this limitation.

Check out server authentication and authorization for each sensitive operation,
including manipulable IDs, batch operations and administrative actions.
PostgreSQL/Supabase, review RLS, police, roles and privileged accesses. In
Firebase, review Security Rules and privileged SDKs; are distinct controls.

With synthetic accounts in the authorised local environment, prove at least:

- Unauthenticated visitor receives the intended refusal.
- User A accesses its resource and does not access that of B changing the
  identifier.
- Common user does not obtain administrative action by API direct.
- Lists, changes and exclusions follow the same isolation.

Use tests of API and, when there is interface, browser according to
[check-work](../../projeto/verificar-trabalho/SKILL.md). Do not create real
accounts or use production data for this test. No executable application or test
identities, register **not verified**. Deliver permission matrix, results and
unsecreted finds in `.agent-tests/security/`, using
[template](../../../templates/revisao-seguranca/TEMPLATE.md).

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/revisar-autorizacao/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/seguranca/revisar-autorizacao/SKILL.md
