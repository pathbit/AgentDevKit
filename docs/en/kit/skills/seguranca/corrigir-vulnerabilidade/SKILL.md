---
name: corrigir-vulnerabilidade
description: "Corrects a validated finding and proves the cause was removed."
language: en
---

# Correct Vulnerability

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Get the find and your evidence of [review-safe](../revisar-seguranca/SKILL.md).
Confirm the path of abuse and the authorized scope. Clear doubts and present the
plan before editing, respecting approvals already given.

Correct the cause, preserve the legitimate contract, and add a regression test
that fails before and after. Do not silence the rule or delete file just to
leave the scanner green; document false positives with justification. If the
correction covers another discovered scenario, add also a versionable automated
test for it; a single test only complements the test.

Use [implementation-spec](../../specs/implementar-spec/SKILL.md) when there is
spec and [check-work](../../projeto/verificar-trabalho/SKILL.md) for the tests.
Repeat the relevant scanner and the original scenario. Web changes require
browser; authorization requires the matrix of
[permissions](../revisar-autorizacao/SKILL.md).

If there is a real secret, do not play it. Please inform the person responsible
for revoking and rotating the appropriate channel; removing from the code does
not invalidate the credentials. Do not change accounts, Git history or external
services without explicit scope.

Output: correction, test, residual risk and updated documentation. Close with
[review-delivery](../../../commands/revisar-entrega/COMMAND.md), including
independent review and ignored evidence in `.agent-tests/security/`.

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/corrigir-vulnerabilidade/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/seguranca/corrigir-vulnerabilidade/SKILL.md
