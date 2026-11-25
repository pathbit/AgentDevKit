---
description: "Discovery formats and limits of customer adapters."
language: en
---

# Compatibility

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`.pbai4devs` is the unique source. Customers receive native references and
metadata; tools, scripts, templates and downloads stay in the hub. A link guides
reading without ensuring that the client imports its content.

## Choose customers

Use `--agents codex,claude` on installation. Then see `agents` or change the
selection with `agents add <ids>`, `agents remove <ids>` or `agents <lista>`. A
CLI records the selection in the local project state. `all` includes all active
customers. `none` installs only the hub and `AGENTS.md` and is the default of an
installation without selection. Updates and synchronisations reuse the saved
selection.

| Client | ID | Project Destinations |
| --- | --- | --- |
| [Codex][codex] | `codex` | `.codex`, `.agents` |
| [Claude][claude] | `claude` | `.claude` |
| [Cursor][cursor] | `cursor` | `.cursor` |
| [Copilot][cp] | `copilot` | `.github`. `.vscode` It's optional. |
| [OpenCode V2][opencode] | `opencode` | `.opencode` |
| [Antigravity][antigravity] | `antigravity` | `.agents` |
| [ZCode][zcode] | `zcode` | `.zcode` |
| [Kimi Code][kimi] | `kimi` | `.kimi-code` |
| [MiniMax Code][minimax] | `minimax` | `.minimax` |
| [MiMo Code][mimo] | `mimo` | `.mimocode` |
| [DeepSeek Harness][deepseek] | `deepseek` | `.dsh` |

ID allies: `vscode` → `copilot`, `claude-code` → `claude`, `kimi-code` → `kimi`,
`xiaomi` → `mimo`. Folder names are not IDs. Shared folders remain if one
chooses to need them. The hub remains complete even with few selected clients.

## Migrate legacy folders

`antigravity-legacy` e `kimi-legacy` converge to `antigravity` e `kimi`- Since
`0.0.36`, the Gemini CLI exited the selection and the kit uses `.agent`, `.kimi`
e `.gemini` design only to recognize old installations. `update` saves the other
selected customers. If you used only Gemini before CLI♪ Simulate ♪ `agentdevkit
update --agents antigravity --dry-run`. Use the ID of another client listed in
`agentdevkit agents` or `none` to stay alone with the hub. The plan withdraws
the proven contribution of the kit and preserves its own content, including
files with divergence in the Git index. [Transition announced by
Google][gemini-transition]

## Copilot on project and machine

- **Project.** Resources in `.github/skills/`, `.github/agents/` e
  `.github/instructions/`- Use it. `AGENTS.md` or
  `.github/copilot-instructions.md` as input of instructions.
- **Settings CLI on the project.** `.github/copilot/settings.json` It can be
  shared. `.github/copilot/settings.local.json` He keeps local settings.
- **Configuration and personal resources.** A CLI use `~/.copilot/` by default.
  `COPILOT_HOME` select another home directory.
- **Editor.** `.vscode/` is optional for VS Code settings.

The kit writes the project notes in `.github` and use `AGENTS.md` as a shared
entry. `copilot` also registers `.vscode` for diagnosis, without creating the
folder. The home folder and configuration files of the CLI are administered by
the user. CLI also recognizes skills from the project in `.agents/skills` e
`.claude/skills`. [Skill Paths][cp] · [Settings CLI][cp-config] · [Repository
instructions][cp-instructions]

Use `copilot skill list` e `copilot instruction list` at the root of the
repository to consult the local discovery, if your version of CLI to offer these
commands.

## Native Formats

The groups are preserved when the discovery allows. `grupo/` represents optional
categories; `nome` is the unique identifier of the resource. The paths are
relative to the client folder, except where specified.

- Codex: `.agents/skills/grupo/nome/SKILL.md` and references grouped into
  `.codex`. Select only Codex uses `.agents` If this route is blocked, the skill
  uses `.codex/skills`, recognized by Codex porter 0.171.0. Markdown profiles in
  `.codex/agents` Codex native subagents use TOML files. [Loader][codex-roots] ·
  [Subagents][codex-agents]
- Claude: `skills/nome/SKILL.md`, `commands/grupo/nome.md`,
  `rules/grupo/nome/RULE.md` e `agents/nome.md`.
- Cursor: `skills/grupo/nome/SKILL.md`, `rules/grupo/nome.mdc`, `agents/nome.md`
  e `commands/nome.md`.
- Copilot: `skills/nome/SKILL.md`, `agents/nome.agent.md`,
  `instructions/grupo/nome.instructions.md` for global or global rules,
  `rules/grupo/nome/RULE.md` for explicit references and
  `prompts/grupo/nome.prompt.md` to Local.
- OpenCode: `skills/grupo/nome/SKILL.md`, `commands/grupo/nome.md`,
  `agents/grupo/nome.md`; rules as references.
- Antigravity: skills and grouped rules, flat agents registered in manifests and
  commands as references. The client reads `AGENTS.md` e `GEMINI.md` in the
  project, besides using `~/.gemini/config/` for personal preferences. Teams can
  configure personal folders with `.gemini/config.json` on the project.
  [Discovery at Antigravity][antigravity]
- ZCode: `skills/nome/SKILL.md`, `agents/nome.md` e `commands/nome.md`. Each
  profile of the kit declares the tools its function uses. If the project has
  already set an agent in the same path, the kit preserves the file. Rules
  remain as references. [ZCode subagents][zcode-agents]
- Kimi: `skills/grupo/nome/SKILL.md` e `agents/nome.md`. Customer also accepts
  `.agents`. Commands require plugin configuration. [Kimi agents][kimi-agents]
- MiniMax and DeepSeek: `skills/nome/SKILL.md`; other types as references.
- MiMo: `skills/grupo/nome/SKILL.md`, agents and direct commands; rules as
  references.

New OpenCode profiles use `permissions` V2 format, with actions such as `shell`
e `edit`. The previous reviewer retains its legacy format; check out the
[permission migration](https://opencode.ai/docs/permissions/) in the version
used. Terminal permission does not isolate paths by itself: the profile and
scripts remain responsible for respecting the authorized scope.

Claude documents skills at the level `skills/nome` and recursive discovery in
`.claude/agents/`. The kit uses flat agents. Cursor also recognizes skills at
the roots of other customers. With multiple clients selected, please refer to
the editor's list to identify repeated names. [Claude's
subagents][claude-agents] · [Cursor Skills][cursor]

When a skill and a legacy command of Claude have the same name, the skill
receives the bar invocation. This occurs with `atualizar-documentacao`,
`documentar-legado`, `preparar-dev` e `proximos-passos`. To use the
orchestration of the homonymous command, enter the `COMMAND.md` from the hub.
[Precedence of names in Claude][claude-skills]

MiniMax, Copilot CLI/SDK and DeepSeek use immediate children. ZCode requires
flat skills in plugins. We maintain these layouts; we do not assume recursion in
agents or commands when the vendor only documents direct files.

In published npm packages `0.0.21` e `0.0.30`, Copilot rules generated without
YAML explicit native use `applyTo: '**'` regardless of `trigger` The behavior of
the developing local code is described below. Check the metadata generated;
loading varies between customers.

In the published version `0.0.21`, the Cursor Git rule uses `alwaysApply: true`,
although the origin indicates decision by relevance. [Cursor
rules](https://cursor.com/docs/rules), this configures application in all
sessions. The local candidate aligns the metadata; check out the installed
version before relying on the desired scope.

Antigravity seeks a level by default. Files `.agents/skills.json`, `rules.json`
e `agents.json` explicitly record each reference; the syncer updates them when
creating, moving or removing resources. They are native manifests, distinct from
the internal homonym catalogs in `.pbai4devs`.

OpenCode V2 runs up to six skill levels. Kimi runs groups without `SKILL.md`; a
directory that already defines a skill is not a common category. These limits
must be respected when creating groups.

Prompts `.prompt.md` They belong to the local harness of the VS Code, announced
for removal in February 2027. In Copilot, use skills for invocable routines.
`GEMINI.md` import `AGENTS.md`; `CLAUDE.md` points to that same guide.

With Claude and Copilot selected, the Copilot CLI can receive equivalent
references from `.claude/rules` e `.github/instructions`. The two routes are
maintained for their respective customers; the instruction support varies
between [Copilot
environments](https://docs.github.com/en/copilot/reference/custom-instructions-support).
In local test with Copilot CLI `1.0.109`, references `.claude/rules` manuals and
with glob also entered the initial context. Do not assume that the metadata of
the Copilot route restrict the references coming from other customers.

When selecting a custom agent, confirm that the client has read your shared
source: loading a note does not prove this reading. Automatic inclusion by `@`
no Copilot CLI is documented for specific instruction files, not for all agent
files. See [Copilot file references
CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions#referencing-other-files).

No [Claude Code](https://code.claude.com/docs/en/memory)- Just... `paths`
delimits a rule in `.claude/rules`; references without this field enter the
initial context. `0.0.21` and a previous local candidate generated conditional
notes without `paths`; in this candidate, a session carried out rules `manual`,
`model_decision` e `glob` on startup. The local sync now generates global rules
only for `always_on`; for `glob`, demands `paths` Claude explicit and valid.
`manual`, `model_decision` e `glob` without this mapping are available for
explicit reading. unproven legacy references are preserved and require review.

In the Copilot, `always_on` use `applyTo: '**'` e `glob` Holds the rule pattern.
By default, `manual` e `model_decision` stay in `.github/rules` for explicit
consultation; no automatic decision equivalent proved. In the local test,
instructions without `applyTo` They also entered the initial context. [Copilot
CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
does not expand references `@` within `*.instructions.md`; a link to the shared
source also does not prove its reading. In one test, the client announced
contextual discovery for a glob file, but there was no observed reading of the
source. In another session, the client read the source for the corresponding
file; this does not guarantee the same behavior in all sessions. Check the
reading when the rule application is required.

YAML native explicit prevails. To complement a human file, the frontmatter needs
to be identical to YAML native, with `applyTo` literally in quotes and
optionally, `description` literal quotes. Different or ambiguous scope blocks
synchronization and preserves the files.

Ancient notes are only removed with proven property and integrity; if they are
in the Git index, the operation blocks without changing it. Old instructions
edited or without proven property remain and can remain active; review them
manually.

The installer generates the selection and policy in `espelhos.conf`;
`sincronizar` reconstructs notes only with Node and the hub files installed.
`--check` does not change files. When repairing managed files, `--force` can
create local backup; its visibility to Git depends on existing ignores.
Conflicts with human content remain blocked. Customers' human resources and
links are preserved; a preserved route does not receive new notes.
`.codex/skills` Keep pointing to your skills and the Codex gets the kit in
`.agents/skills`. When the main route becomes available again, obsolete
alternative notes are only removed with proven property. Human content and Git
index are preserved; if both routes are blocked, the operation informs the
conflict without replacing them.

Fonts confirm formats, not execution of each client. Validate discovery,
invocation and result in the chosen client before considering a proven
integration. Reasons and fonts per adapter also stay in
`templates/clients/ADAPTERS.json` in AgentDevKit font hub.

[codex]: https://learn.chatgpt.com/docs/build-skills
[claude]: https://code.claude.com/docs/en/skills
[cursor]: https://cursor.com/docs/skills
[cp]: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
[cp-config]: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference
[cp-instructions]: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
[codex-roots]: https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/ext/skills/src/host_roots.rs#L127-L164
[codex-agents]: https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents
[claude-skills]: https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name
[claude-agents]: https://code.claude.com/docs/en/sub-agents#choose-the-subagent-scope
[zcode-agents]: https://zcode.z.ai/en/docs/subagents#configuration-scope
[opencode]: https://opencode.ai/docs/skills
[gemini-transition]: https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/
[antigravity]: https://antigravity.google/docs/customization-discovery
[zcode]: https://zcode.z.ai/en/docs/skill
[kimi-agents]: https://moonshotai.github.io/kimi-code/en/customization/agents.html
[kimi]: https://moonshotai.github.io/kimi-code/en/customization/skills
[minimax]: https://github.com/MiniMax-AI/minimax-code
[mimo]: https://mimo.xiaomi.com/mimocode/skills
[deepseek]: https://github.com/deepseek-ai/deepseek-harness

[reading-pt]: ../../../.pbai4devs/COMPATIBILIDADE.md
[reading-en]: COMPATIBILIDADE.md
[reading-es]: ../../es/kit/COMPATIBILIDADE.md
