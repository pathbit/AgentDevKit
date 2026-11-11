---
description: Formatos de descoberta e limites dos adaptadores de clientes.
---

# Compatibilidade

`.pbai4devs` é a fonte única. Os clientes recebem referências e metadados
nativos; ferramentas, scripts, templates e downloads ficam no hub. Um link
orienta a leitura, sem garantir que o cliente importe seu conteúdo.

Os grupos são preservados quando a descoberta permite. Na tabela, `grupo/`
representa categorias opcionais; `nome` é o identificador único do recurso.

| Cliente | Skills | Comandos, regras e agentes |
| --- | --- | --- |
| [Codex][codex] | `.agents/skills/grupo/nome/SKILL.md`; `.codex` mantém referências agrupadas | `AGENTS.md` apresenta o hub; os demais tipos em `.codex` são referências |
| [Claude][claude] | `.claude/skills/nome/SKILL.md` | Comandos `commands/grupo/nome.md`; regras `rules/grupo/nome/RULE.md`; agentes `agents/nome.md` |
| [Cursor][cursor] | `.cursor/skills/grupo/nome/SKILL.md` | Regras `rules/grupo/nome.mdc`; agentes `agents/nome.md`; comandos diretos `commands/nome.md` |
| [Copilot][copilot] | `.github/skills/nome/SKILL.md` | Agentes `agents/nome.agent.md`; regras `instructions/grupo/nome.instructions.md`; prompts `prompts/grupo/nome.prompt.md` para Local |
| [OpenCode V2][opencode] | `.opencode/skills/grupo/nome/SKILL.md` | Comandos `commands/grupo/nome.md`; agentes `agents/grupo/nome.md`; regras como referências |
| [Gemini CLI][gemini] | `.gemini/skills/nome/SKILL.md` | Comandos `commands/grupo/nome.toml`; agentes `agents/nome.md`; regras como referências |
| [Antigravity][antigravity] | `.agents/skills/grupo/nome/SKILL.md` com manifesto | Regras agrupadas e agentes registrados nos manifestos; comandos são referências |
| [ZCode][zcode] | `.zcode/skills/nome/SKILL.md` | Comandos diretos; agentes e regras de projeto são referências |
| [Kimi Code][kimi] | `.kimi-code/skills/grupo/nome/SKILL.md` | Comandos exigem plugin; os apontamentos não configuram esse plugin |
| [MiniMax Code][minimax] | `.minimax/skills/nome/SKILL.md` | Os demais tipos são referências agrupadas |
| [MiMo Code][mimo] | `.mimocode/skills/grupo/nome/SKILL.md` | Agentes e comandos diretos; regras como referências |
| [DeepSeek Harness][deepseek] | `.dsh/skills/nome/SKILL.md` | Os demais tipos são referências agrupadas |

`.agent` mantém referências de compatibilidade com Antigravity; a descoberta
agrupada usa o cliente principal `.agents`. `.kimi` atende instalações legadas;
o cliente atual usa `.kimi-code`. `.vscode` recebe apenas seu `.gitignore` local.

Claude documenta skills no nível `skills/nome`; sua descoberta de arquivos
`.claude` em subprojetos não confirma grupos dentro de `skills/`. Gemini,
MiniMax, Copilot CLI/SDK e DeepSeek usam filhos imediatos. ZCode exige skills
planas em plugins. Mantemos esses layouts; não presumimos recursão em agentes ou
comandos quando o fornecedor só documenta arquivos diretos.

Antigravity busca um nível por padrão. Os arquivos `.agents/skills.json`,
`rules.json` e `agents.json` registram explicitamente cada referência agrupada;
o sincronizador os atualiza ao criar, mover ou remover recursos. Eles são
manifestos nativos, distintos dos catálogos internos homônimos em `.pbai4devs`.

OpenCode V2 percorre até seis níveis de skills. Kimi percorre agrupadores sem
`SKILL.md`; um diretório que já define uma skill não é uma categoria comum.
Esses limites devem ser respeitados ao criar grupos.

Prompts `.prompt.md` pertencem ao harness Local do VS Code, anunciado para
remoção em fevereiro de 2027. No Copilot, use skills para rotinas invocáveis.
`GEMINI.md` importa `AGENTS.md`; `CLAUDE.md` aponta para esse mesmo guia.

O instalador gera a política de destinos em `espelhos.conf`; `sincronizar`
reconstrói os apontamentos somente com Node e os arquivos do hub instalado.
`--check` não altera arquivos. `--force` faz backup ignorado antes de substituir
conteúdo próprio que conflite com caminhos gerenciados.

As fontes confirmam formatos, não execução de cada cliente. Valide descoberta,
invocação e resultado no cliente escolhido antes de considerar uma integração
comprovada. As razões e fontes por adaptador também ficam em
`src/adapters/index.mjs` no projeto de distribuição AgentDevKit.

[codex]: https://learn.chatgpt.com/docs/build-skills
[claude]: https://code.claude.com/docs/en/skills
[cursor]: https://cursor.com/docs/skills
[copilot]: https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/skills
[opencode]: https://opencode.ai/docs/skills
[gemini]: https://geminicli.com/docs/cli/skills/
[antigravity]: https://antigravity.google/docs/customization-discovery
[zcode]: https://zcode.z.ai/en/docs/skill
[kimi]: https://moonshotai.github.io/kimi-code/en/customization/skills
[minimax]: https://github.com/MiniMax-AI/minimax-code/blob/3c21163c85a9684030cb147bfef48c6284fa3c46/packages/agent-modules/skills/src/registry.ts
[mimo]: https://mimo.xiaomi.com/mimocode/skills
[deepseek]: https://github.com/deepseek-ai/deepseek-harness/blob/e8f7b93a344964de3dca1ace9e72b6e4d6de87cb/packages/skill/skill-filesystem/README.md
