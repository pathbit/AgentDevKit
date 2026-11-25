---
description: "How to report problems and propose improvements for AgentDevKit."
language: en
---

# Participate in evolution

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use [AgentDevKit issues][issues] to report problems and suggest improvements.
Look for similar reports before opening a new one. A reproducible reaction or
example in the existing issue helps to gather the context.

## Report a problem

Choose [Report a problem][bug]. The form requests version of the kit, system,
agente/editor, command or action, steps, expected and observed result. Logs are
optional: only include the required snippet and remove private data.

If you don't know information, explain this. A small example that reproduces the
problem is usually more useful than an entire repository.

## Propose an improvement

Choose [Suggest an improvement][feature] and describe the problem before the
solution. Tell who benefits, an example of use and how to recognize the result.
The form also accepts improvements in documentation.

Issues are not executed automatically by agents. A proposal needs sorting and
scope definition before it becomes implementation or release. There is no
deadline for promised service.

## Accompanying and contributing

The Labels `bug`, `enhancement` e `documentation` help classify the subject.
Maintainers can ask for information, gather duplicates and link the change to a
PR. [roadmap](../product/roadmap.md) for the registered scope.

To contribute code or documents, follow [Contribute][contrib]. The PR model asks
for problem, change and verification. After the review, the changes pass by the
IC; the publication follows the [release flow](maintenance.md).

Issues and attachments to a public repository are public. Do not send tokens,
passwords, personal data or access to services. Local test results continue
outside Git, as the [tool guide](../guides/tools-and-testing.md).

[Wiki](../README.md) · [Troubleshooting](../guides/troubleshooting.md)

[issues]: https://github.com/pathbit/AgentDevKit/issues
[bug]: https://github.com/pathbit/AgentDevKit/issues/new?template=bug_report.yml
[feature]: https://github.com/pathbit/AgentDevKit/issues/new?template=feature_request.yml
[contrib]: ../CONTRIBUTING.md

[reading-pt]: ../../maintainers/community.md
[reading-en]: community.md
[reading-es]: ../../es/maintainers/community.md
