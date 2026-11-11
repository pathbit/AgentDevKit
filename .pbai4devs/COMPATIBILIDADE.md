---
description: Formatos de descoberta e limites dos adaptadores de clientes.
---

# Compatibilidade

`.pbai4devs` é a fonte única. Os clientes recebem referências e metadados
nativos; ferramentas, scripts, templates e downloads ficam no hub. Um link
orienta a leitura, sem garantir que o cliente importe seu conteúdo.

## Escolher clientes

Use `--agents codex,claude` na instalação ou `agents codex,claude` para alterar
depois. `--clients` e `clients` são aliases. A CLI salva os IDs no projeto;
`all` inclui todos, inclusive os legados. Sem seleção explícita, reutiliza a
salva; sem ambas, usa `all`. Não há detecção automática do agente em execução.

| Cliente | ID | Pastas necessárias |
| --- | --- | --- |
| [Codex][codex] | `codex` | `.codex`, `.agents` |
| [Claude][claude] | `claude` | `.claude` |
| [Cursor][cursor] | `cursor` | `.cursor` |
| [Copilot][cp] | `copilot` | `.github`, `.vscode` |
| [OpenCode V2][opencode] | `opencode` | `.opencode` |
| [Gemini CLI][gemini] | `gemini` | `.gemini` |
| [Antigravity][antigravity] | `antigravity` | `.agents` |
| Antigravity legado | `antigravity-legacy` | `.agent`, `.agents` |
| [ZCode][zcode] | `zcode` | `.zcode` |
| [Kimi Code][kimi] | `kimi` | `.kimi-code` |
| Kimi legado | `kimi-legacy` | `.kimi` |
| [MiniMax Code][minimax] | `minimax` | `.minimax` |
| [MiMo Code][mimo] | `mimo` | `.mimocode` |
| [DeepSeek Harness][deepseek] | `deepseek` | `.dsh` |

Aliases de IDs: `vscode` → `copilot`, `claude-code` → `claude`,
`kimi-code` → `kimi`, `xiaomi` → `mimo`. Nomes de pastas não são IDs.
Pastas compartilhadas permanecem se algum escolhido precisar delas.
`.vscode` recebe apenas seu `.gitignore` local. O hub continua completo;
seleção altera derivações, sem apagar arquivos próprios dos clientes.

## Formatos nativos

Os grupos são preservados quando a descoberta permite. Abaixo, `grupo/`
representa categorias opcionais; `nome` é o identificador único do recurso.
Os caminhos são relativos à pasta do cliente, exceto onde indicado.

- Codex: `.agents/skills/grupo/nome/SKILL.md` e referências agrupadas em
  `.codex`. `AGENTS.md` apresenta o hub; demais tipos são referências.
- Claude: `skills/nome/SKILL.md`, `commands/grupo/nome.md`,
  `rules/grupo/nome/RULE.md` e `agents/nome.md`.
- Cursor: `skills/grupo/nome/SKILL.md`, `rules/grupo/nome.mdc`,
  `agents/nome.md` e `commands/nome.md`.
- Copilot: `skills/nome/SKILL.md`, `agents/nome.agent.md`,
  `instructions/grupo/nome.instructions.md` e
  `prompts/grupo/nome.prompt.md` para Local.
- OpenCode: `skills/grupo/nome/SKILL.md`, `commands/grupo/nome.md`,
  `agents/grupo/nome.md`; regras como referências.
- Gemini: `skills/nome/SKILL.md`, `commands/grupo/nome.toml`,
  `agents/nome.md`; regras como referências.
- Antigravity: skills e regras agrupadas, agentes planos registrados nos
  manifestos; comandos como referências. `.agent` é a opção legada.
- ZCode: `skills/nome/SKILL.md`, comandos diretos; demais tipos são referências.
- Kimi: `skills/grupo/nome/SKILL.md`; comandos exigem plugin, não configurado
  pelos apontamentos. `.kimi` é a opção legada.
- MiniMax e DeepSeek: `skills/nome/SKILL.md`; demais tipos como referências.
- MiMo: `skills/grupo/nome/SKILL.md`, agentes e comandos diretos;
  regras como referências.

Claude documenta skills no nível `skills/nome`; sua descoberta de arquivos
`.claude` em subprojetos não confirma grupos dentro de `skills/`. Gemini,
MiniMax, Copilot CLI/SDK e DeepSeek usam filhos imediatos. ZCode exige skills
planas em plugins. Mantemos esses layouts; não presumimos recursão em agentes ou
comandos quando o fornecedor só documenta arquivos diretos.

Antigravity busca um nível por padrão. Os arquivos `.agents/skills.json`,
`rules.json` e `agents.json` registram explicitamente cada referência;
o sincronizador os atualiza ao criar, mover ou remover recursos. Eles são
manifestos nativos, distintos dos catálogos internos homônimos em `.pbai4devs`.

OpenCode V2 percorre até seis níveis de skills. Kimi percorre agrupadores sem
`SKILL.md`; um diretório que já define uma skill não é uma categoria comum.
Esses limites devem ser respeitados ao criar grupos.

Prompts `.prompt.md` pertencem ao harness Local do VS Code, anunciado para
remoção em fevereiro de 2027. No Copilot, use skills para rotinas invocáveis.
`GEMINI.md` importa `AGENTS.md`; `CLAUDE.md` aponta para esse mesmo guia.

O instalador gera a seleção e a política em `espelhos.conf`; `sincronizar`
reconstrói os apontamentos somente com Node e os arquivos do hub instalado.
`--check` não altera arquivos. `--force` faz backup ignorado antes de substituir
conteúdo próprio que conflite com caminhos gerenciados.

As fontes confirmam formatos, não execução de cada cliente. Valide descoberta,
invocação e resultado no cliente escolhido antes de considerar uma integração
comprovada. As razões e fontes por adaptador também ficam em
`templates/clients/ADAPTERS.json` no hub de fontes do AgentDevKit.

[codex]: https://learn.chatgpt.com/docs/build-skills
[claude]: https://code.claude.com/docs/en/skills
[cursor]: https://cursor.com/docs/skills
[cp]: https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/skills
[opencode]: https://opencode.ai/docs/skills
[gemini]: https://geminicli.com/docs/cli/skills/
[antigravity]: https://antigravity.google/docs/customization-discovery
[zcode]: https://zcode.z.ai/en/docs/skill
[kimi]: https://moonshotai.github.io/kimi-code/en/customization/skills
[minimax]: https://github.com/MiniMax-AI/minimax-code
[mimo]: https://mimo.xiaomi.com/mimocode/skills
[deepseek]: https://github.com/deepseek-ai/deepseek-harness
