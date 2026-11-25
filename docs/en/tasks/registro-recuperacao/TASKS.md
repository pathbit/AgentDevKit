---
description: "Tasks of the component validation of recovery records."
status: em andamento
language: en
---

# Recovery log

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Spec: [recovery-recording](../../specs/registro-recuperacao/SPEC.md)Release:
pending.

- [x] Set format and limits of unchangeable records.
- [x] Implement and test the pure validator on macOS and Linux, including a
  synthetic history of a thousand operations and corrupted entries.
- [x] Verify unique concurrent creation in local file system.
- [-] Review diff and validate the component on Windows.
- [-] Sort commands for the future barrier: the isolated component covers
  options from CLI, but it does not block mutations or classify direct sync.
- [ ] Integrate publication, safe reading, backup and blocking to CLI and sync.
- [ ] Correct and prove the eleven strict scenarios of recovery and cleaning.

Local evidence: `.agent-tests/registro-recuperacao/prova-5bq7Fj/`. Local tests
do not prove behavior on network file systems.

[reading-pt]: ../../../tasks/registro-recuperacao/TASKS.md
[reading-en]: TASKS.md
[reading-es]: ../../../es/tasks/registro-recuperacao/TASKS.md
