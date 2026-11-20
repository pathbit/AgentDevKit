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
`.vscode` pode conter configurações do projeto. O kit preserva seu ignore
existente e deriva recursos do Copilot em `.github`. O hub continua completo
mesmo com poucos clientes selecionados.

## Formatos nativos

Os grupos são preservados quando a descoberta permite. Abaixo, `grupo/`
representa categorias opcionais; `nome` é o identificador único do recurso.
Os caminhos são relativos à pasta do cliente, exceto onde indicado.

- Codex: `.agents/skills/grupo/nome/SKILL.md` e referências agrupadas em
  `.codex`. Se a rota principal de uma skill estiver obstruída, ela usa
  `.codex/skills` como alternativa. `AGENTS.md` apresenta o hub.
- Claude: `skills/nome/SKILL.md`, `commands/grupo/nome.md`,
  `rules/grupo/nome/RULE.md` e `agents/nome.md`.
- Cursor: `skills/grupo/nome/SKILL.md`, `rules/grupo/nome.mdc`,
  `agents/nome.md` e `commands/nome.md`.
- Copilot: `skills/nome/SKILL.md`, `agents/nome.agent.md`,
  `instructions/grupo/nome.instructions.md` para regras globais ou por glob,
  `rules/grupo/nome/RULE.md` para referências explícitas e
  `prompts/grupo/nome.prompt.md` para Local.
- OpenCode: `skills/grupo/nome/SKILL.md`, `commands/grupo/nome.md`,
  `agents/grupo/nome.md`; regras como referências.
- Gemini: `skills/nome/SKILL.md`, `commands/grupo/nome.toml`,
  `agents/nome.md`; regras como referências. Skills do projeto exigem pasta
  confiável no cliente; consulte a [documentação de descoberta][gemini-trust].
- Antigravity: skills e regras agrupadas, agentes planos registrados nos
  manifestos; comandos como referências. `.agent` é a opção legada.
- ZCode: `skills/nome/SKILL.md`, comandos diretos; demais tipos são referências.
- Kimi: `skills/grupo/nome/SKILL.md`; comandos exigem plugin, não configurado
  pelos apontamentos. `.kimi` é a opção legada.
- MiniMax e DeepSeek: `skills/nome/SKILL.md`; demais tipos como referências.
- MiMo: `skills/grupo/nome/SKILL.md`, agentes e comandos diretos;
  regras como referências.

Os novos perfis OpenCode usam `permissions` do formato V2, com ações como
`shell` e `edit`. O revisor anterior conserva seu formato legado; confira a
[migração de permissões](https://opencode.ai/docs/permissions/) na versão usada.
Permissão de terminal não isola caminhos por si só: o perfil e os scripts
continuam responsáveis por respeitar o escopo autorizado.

Claude documenta skills no nível `skills/nome`; sua descoberta de arquivos
`.claude` em subprojetos não confirma grupos dentro de `skills/`. Gemini,
MiniMax, Copilot CLI/SDK e DeepSeek usam filhos imediatos. ZCode exige skills
planas em plugins. Mantemos esses layouts; não presumimos recursão em agentes ou
comandos quando o fornecedor só documenta arquivos diretos.

Nos pacotes npm publicados `0.0.21` e `0.0.30`, regras Copilot geradas sem
YAML nativo explícito usam `applyTo: '**'` independentemente do `trigger` da
origem. Uma regra manual ou com glob pode alcançar escopo maior que o pretendido.
O comportamento do código local em desenvolvimento é descrito abaixo. Confira
os metadados gerados; o carregamento varia entre clientes.

Na versão publicada `0.0.21`, a regra Git do Cursor usa `alwaysApply: true`,
embora a origem indique decisão por relevância. Pelas [regras do Cursor](https://cursor.com/docs/rules),
isso configura aplicação em todas as sessões. A candidata local alinha o
metadado; confira a versão instalada antes de confiar no escopo pretendido.

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

Com Claude e Copilot selecionados, o Copilot CLI pode receber referências
equivalentes de `.claude/rules` e `.github/instructions`. As duas rotas são
mantidas para seus respectivos clientes; o suporte a instruções varia entre
[ambientes do Copilot](https://docs.github.com/en/copilot/reference/custom-instructions-support).
Em teste local com Copilot CLI `1.0.109`, referências `.claude/rules` manuais
e com glob também entraram no contexto inicial. Não presuma que os metadados
da rota Copilot restrinjam as referências vindas de outros clientes.

Ao selecionar um agente personalizado, confirme que o cliente leu sua fonte
compartilhada: carregar um apontamento não comprova essa leitura. A inclusão
automática por `@` no Copilot CLI é documentada para arquivos de instruções
específicos, não para todos os arquivos de agente. Veja as
[referências de arquivo do Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions#referencing-other-files).

No [Claude Code](https://code.claude.com/docs/en/memory), apenas `paths` delimita
uma regra em `.claude/rules`; referências sem esse campo entram no contexto
inicial. A versão `0.0.21` e uma candidata local anterior geraram apontamentos
condicionais sem `paths`; nessa candidata, uma sessão carregou regras `manual`,
`model_decision` e `glob` na inicialização. O sync local agora gera regras
globais apenas para `always_on`; para `glob`, exige `paths` Claude explícito e
válido. Regras `manual`, `model_decision` e `glob` sem esse mapeamento ficam
disponíveis para leitura explícita. Referências legadas não comprovadas são
preservadas e exigem revisão. A migração e a recuperação concorrente ainda
precisam de validação completa nas plataformas suportadas.

No Copilot, `always_on` usa `applyTo: '**'` e `glob` conserva o padrão da
regra. Por padrão, `manual` e `model_decision` ficam em `.github/rules` para
consulta explícita; não há decisão automática equivalente comprovada. No teste
local, instruções sem `applyTo` também entraram no contexto inicial.
O [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
não expande referências `@` dentro de `*.instructions.md`; um link para a fonte
compartilhada também não comprova sua leitura. Em uma prova, o cliente anunciou
descoberta contextual para um arquivo do glob, mas não houve leitura observada
da origem. Em outra sessão, o cliente leu a fonte para o arquivo correspondente;
isso não garante o mesmo comportamento em todas as sessões. Confira a leitura
quando a aplicação da regra for necessária.

YAML nativo explícito prevalece. Para complementar um arquivo humano, o
frontmatter precisa ser idêntico ao YAML nativo, com `applyTo` literal entre
aspas e, opcionalmente, `description` literal entre aspas. Escopo diferente ou
ambíguo bloqueia a sincronização e preserva os arquivos.

Apontamentos antigos só são removidos com propriedade e integridade
comprovadas; se estiverem no índice Git, a operação bloqueia sem alterá-lo.
Instruções antigas editadas ou sem propriedade comprovada permanecem e podem
continuar ativas; revise-as manualmente.

O instalador gera a seleção e a política em `espelhos.conf`; `sincronizar`
reconstrói os apontamentos somente com Node e os arquivos do hub instalado.
`--check` não altera arquivos. Ao reparar arquivos gerenciados, `--force` pode
criar backup local; sua visibilidade ao Git depende dos ignores existentes.
Conflitos com conteúdo humano continuam bloqueados. Recursos e links humanos
dos clientes são preservados;
uma rota preservada não recebe apontamentos novos. No Zod, `.codex/skills`
continua apontando para suas skills e o Codex recebe o kit em `.agents/skills`.
Quando a rota principal volta a ficar disponível, apontamentos alternativos
obsoletos só são removidos com propriedade comprovada. Conteúdo humano e o
índice Git são preservados; se ambas as rotas estiverem obstruídas, a operação
informa o conflito sem substituí-las.

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
[gemini-trust]: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/tutorials/skills-getting-started.md
[antigravity]: https://antigravity.google/docs/customization-discovery
[zcode]: https://zcode.z.ai/en/docs/skill
[kimi]: https://moonshotai.github.io/kimi-code/en/customization/skills
[minimax]: https://github.com/MiniMax-AI/minimax-code
[mimo]: https://mimo.xiaomi.com/mimocode/skills
[deepseek]: https://github.com/deepseek-ai/deepseek-harness
