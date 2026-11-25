---
description: "Local security tools and skills and open source."
language: en
---

# Safety references

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The kit checks run on the project computer. They do not require account,
signature, or sending code to a service. Tool Downloads and Public Bases are
explicit steps; the analysis uses local files.

## Selected Tools

| Tool | Origin and license | Function |
| --- | --- | --- |
| [Gitleaks][gitleaks] | Community, MIT | Secrets in files and Git. |
| [OSV-Scanner.][osv] | Google, Apache-2.0 | Dependencies, based on OSV local. |
| [Opengrep][opengrep] | Consortium, LGPL-2.1 | Code, with local rules. |

The catalogue fixes revised versions and hashes. `install` Checks the download;
`check` confers local torque; `update` applies the revised pin in the catalog.
None of the three require Python installed. Gitleaks upstream is focused on
maintenance and fixes; this should be considered in the next revisions.

OSV you should use `--offline`Not just `--offline-vulnerabilities`. The database
needs to be prepared before: no data is not clean result. Opengrep uses local
configuration and deactivated version check; do not use `--config auto`. The
audit command normalizes the results and removes secrets and code snippets from
the reports.

## Complements by need

| Tool | License | When you consider |
| --- | --- | --- |
| [Trivy][trivy] | Apache-2.0 | Images, IAC and SBOM. |
| [ZAP][zap] | Apache-2.0 | Application running; requires Java. |
| [DevSkim][devskim] | MIT | .NET projects; requires local runtime. |

These supplements are not installed by the group `security`An adoption requires
testing your local mode, dependencies, version and license. ZAP, installation
does not initiate proxy, daemon or attack; configure test identities and local
target. In Trivy, `--offline-scan` It doesn't block every base update on its
own.

Analysis services that require account stay out of this flow. CodeQL CLI does
not meet the open source requirement; Bandit and Python routines stay out of the
adopted runtime. A free option is not automatically open source.

## Market Skills

| Source | Appeal | Treatment |
| --- | --- | --- |
| [OpenAI][openai] | Practices and Threats | Apache-2.0 by folder. |
| [GitHub][copilot] | Safety review | MIT. |
| [Trail of Bits][tob] | Background and diffs | CC-BY-SA-4.0; candidate. |

The [catalogue pins and licenses][catalog] avoid importing a mobile source. The
four own security skills already accompany the kit; external references are
optional and read by task, without copying text to customers. Preserves
attribution and share-alike of Trail of Bits features. A static list of CVEs in
a skill does not replace an updated base.

## The article as a starting point

O [shared article][article] The kit addresses these questions with specific
checks:

- PostgreSQL/Supabase use RLS and policies; Firebase uses Security Rules.
  Privileged roles and server SDKs need own controls.
- Hide a button does not authorize an operation. Test without session and with
  two users or tenants, including access to the object of another identity.
- Variables sent to the bundle are public; server variables are not
  automatically exposed. A confirmed secret requires removal and rotation.
- Input validation, parameterized queries, output encoding, upload controls and
  usage limits solve different risks.

Technical references are: [RLS][rls], [Firebase Rules][firebase],
[authorisation][authz], [secrets][secrets] e [uploads][uploads]. The kit does
not use the article statistics as proof of project security.

[Flow safety](security.md) · [Resources](resources.md)

[gitleaks]: https://github.com/gitleaks/gitleaks/tree/v8.30.1
[osv]: https://github.com/google/osv-scanner/tree/v2.7.1
[opengrep]: https://github.com/opengrep/opengrep/tree/v1.33.1
[trivy]: https://github.com/aquasecurity/trivy
[zap]: https://www.zaproxy.org/docs/desktop/start/features/
[devskim]: https://github.com/microsoft/DevSkim
[openai]: https://github.com/openai/skills
[copilot]: https://github.com/github/awesome-copilot
[tob]: https://github.com/trailofbits/skills
[catalog]: ../../../.pbai4devs/external-skills/CATALOG.json
[article]: https://manodeyvin.com.br/p/5-vacilacoes-de-seguranca-que-a-ia
[rls]: https://supabase.com/docs/guides/database/postgres/row-level-security
[firebase]: https://firebase.google.com/docs/rules
[authz]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[secrets]: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
[uploads]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

[reading-pt]: ../../guides/security-references.md
[reading-en]: security-references.md
[reading-es]: ../../es/guides/security-references.md
