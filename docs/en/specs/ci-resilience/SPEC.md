---
description: "Portable execution and reliable publication after IC failures."
language: en
---

# Pipeline Reliability

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Checks should identify the cause of failures and offer margin for different
speed runners without reducing coverage or releasing a package before all jobs
are approved.

## Acceptance criteria

- AC-001: Portable tests run in independent groups on Windows and macOS; a
  failure in any group fails the IC. The local command continues to run all
  groups and critical suites remain covered.
- AC-002: Test and publication processes report errors and useful signals
  without exposing credentials. Time out remains flawed.
- AC-003: The release awaits the IC for the period configured with margin for
  duration and queue; it continues to require the commit artifact and the
  approved attempt and does not accept IC fail or from another source.
- AC-004: Linux, Windows and macOS run the actual IC checks; both records
  receive and check the same approved package if it is released.
- AC-005: The documentation explains the profiles and how to repeat all jobs
  when recovering the artifact from a previous attempt.

## Verification

Perform limit regression tests, failures, groups and publication, in addition to
the full local profile. Follow the actual runners and release to completion;
register results and independent review on the delivery gate.

[reading-pt]: ../../../specs/ci-resilience/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/ci-resilience/SPEC.md
