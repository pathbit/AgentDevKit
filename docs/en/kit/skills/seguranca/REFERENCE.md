---
description: "Security with local scanners, triage and control evidence."
language: en
---

# Local security

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Kit installation includes skills, rules, commands, and security profiles.
Scanners are prepared by explicit action; instruction files do not initiate
background audits, services, or downloads.

## How the components work together

The command [audit-safe][audit] organizes the work. [revision skill][review]
defines how to analyze and the [auditor][auditor] the script executes tools and
produces evidence; [rules][rules] they guide all the steps. [command
catalog](../../commands/README.md).

| Tool | Question that helps to answer |
| --- | --- |
| [Gitleaks][gitleaks] | Any evidence of secrets in the files analyzed? |
| [OSV-Scanner.][osv] | Does the local base know faults in the versions of the dependencies? |
| [Opengrep][opengrep] | Does the code match local rules? |

The tools run locally and do not require account or signature. `TOOL.json`.
Public binary and base downloads are separated from the analysis. cliente/modelo
AI remains its own; do not put secret values in the context of conversation.

## Prepare and execute

Use Node.js 24+ and the authorized project. [Preparing for safety][prepare]
installs the scanners and provides their operation:

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup security
```

For dependencies, download the basis of the ecosystems actually used. Example
for npm; replace with `Go` or supported selection corresponding to the project:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs update-data --ecosystems npm
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs check
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run
```

`run` Uses the three checks: `secrets`, `dependencies` e `sast`. To limit, use
[check-secret][secrets] or [check-dependencies][dependencies]. The analysis uses
local data; missing database does not authorize sending the project to an API.
Check in the report the version of the tool, the base and the scope effectively
read.

## What still needs to be proved

O [article on recurring failures][article] Motivates the themes below. Checks
depend on architecture and do not equal a certification.

| Theme | Proof required in the project |
| --- | --- |
| Server authorization | API direct refusal visitor and insufficient role. |
| Identifier access | User A does not read or change the feature of B. |
| Data isolation | Policies/RLS or Security Rules restrict access. |
| Secrets | Private credentials do not reach sources, bundles or logs. |
| Inputs and abuse | Validation, output, upload tests and flow limits. |

RLS is a PostgreSQL control used by Supabase; Firebase has Security Rules.
Privileged SDKs can cross these controls and need authorization on the server.
Hide an administrator button does not protect the API.

Use [review-authorisation][authorization] with different synthetic identities,
negative tests and local data. For entries, prefer parameterized queries,
context output encoding and upload limits; generic sanitization does not solve
all cases. Test the browser interface when it exists. Without executable
application, register these evidences as **not verified**.

## Interpret and correct

Runner returns `0` no findings, `1` with findings and `2` in failure or
incomplete verification. Read the status of each check: not applicable and not
executed do not mean approved. Local rules and supported formats limit coverage.

The report is in `.agent-tests/security/<execucao>/report.json`The auditor
distinguishes suspicions, confirmed failures and false positives. [Moulding and
moulding][threats] for new flows and [correct-vulnerability][fix] to repair the
cause with regression test. An exposed real credentials need revocation by the
responsible; not testing against external services. Close the delivery with
[independent review][gate].

[Skills](../README.md) · [& Tools](../../tools/README.md)

[audit]: ../../commands/auditar-seguranca/COMMAND.md
[review]: revisar-seguranca/SKILL.md
[auditor]: ../../agents/auditor-seguranca/AGENT.md
[rules]: ../../rules/seguranca/RULE.md
[gitleaks]: ../../tools/gitleaks/README.md
[osv]: ../../tools/osv-scanner/README.md
[opengrep]: ../../tools/opengrep/README.md
[prepare]: ../../commands/preparar-seguranca/COMMAND.md
[secrets]: ../../commands/verificar-segredos/COMMAND.md
[dependencies]: ../../commands/verificar-dependencias/COMMAND.md
[authorization]: revisar-autorizacao/SKILL.md
[threats]: modelar-ameacas/SKILL.md
[fix]: corrigir-vulnerabilidade/SKILL.md
[gate]: ../../commands/revisar-entrega/COMMAND.md
[article]: https://manodeyvin.com.br/p/5-vacilacoes-de-seguranca-que-a-ia

[reading-pt]: ../../../../../.pbai4devs/skills/seguranca/REFERENCE.md
[reading-en]: REFERENCE.md
[reading-es]: ../../../../es/kit/skills/seguranca/REFERENCE.md
