---
description: "Formatos de descubrimiento y límites de los adaptadores de clientes."
language: es
---

# Compatibilidad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`.pbai4devs` es la fuente única. Los clientes reciben referencias y metadatos
nativos; herramientas, scripts, templates y descargas se encuentran en el hub.
Un enlace orienta la lectura, sin garantizar que el cliente importe su
contenido.

## Elegir clientes

Use `--agents codex,claude` En la instalación. Después, consulte `agents` o
cambia la selección con `agents add <ids>`, `agents remove <ids>` o `agents
<lista>`. A CLI registra la selección en el estado local del proyecto. `all`
incluye a todos los clientes activos. `none` instala solo el hub y `AGENTS.md` y
es el patrón de una instalación sin selección. Actualizaciones y
sincronizaciones reutilizan la selección salva.

| Cliente | ID | Destinos en el proyecto |
| --- | --- | --- |
| [Codex][codex] | `codex` | `.codex`, `.agents` |
| [Claude][claude] | `claude` | `.claude` |
| [Cursor][cursor] | `cursor` | `.cursor` |
| [Copilot][cp] | `copilot` | `.github`. `.vscode` Es opcional. |
| [OpenCode V2][opencode] | `opencode` | `.opencode` |
| [Antigravity][antigravity] | `antigravity` | `.agents` |
| [ZCode][zcode] | `zcode` | `.zcode` |
| [Kimi Code][kimi] | `kimi` | `.kimi-code` |
| [MiniMax Code][minimax] | `minimax` | `.minimax` |
| [MiMo Code][mimo] | `mimo` | `.mimocode` |
| [DeepSeek Harness][deepseek] | `deepseek` | `.dsh` |

Aliases de IDs: `vscode` → `copilot`, `claude-code` → `claude`, `kimi-code` →
`kimi`, `xiaomi` → `mimo`. Nombres de carpetas no son IDs. Carpetas compartidas
permanecen si algún elegido necesita de ellas. O hub sigue completo incluso con
pocos clientes seleccionados.

## Migrar carpetas legadas

`antigravity-legacy` e `kimi-legacy` convergen para `antigravity` e `kimi`.
Desde `0.0.36`, Gemini CLI salió de la selección y el kit usa `.agent`, `.kimi`
e `.gemini` Pero, en realidad, el proyecto sólo reconoce instalaciones antiguas.
`update` conserva los otros clientes seleccionados. Si antes usaba sólo Gemini
CLI, simule `agentdevkit update --agents antigravity --dry-run`. Use el ID de
otro cliente listado en `agentdevkit agents` o `none` Para permanecer solo con
el hub. El plan retira la contribución comprobada del kit y preserva contenido
propio, incluso archivos con divergencia en el índice Git. [Transición anunciada
por Google][gemini-transition]

## Copilot en el proyecto y en la máquina

- **Proyecto.** Recursos en `.github/skills/`, `.github/agents/` e
  `.github/instructions/`. Use `AGENTS.md` o `.github/copilot-instructions.md`
  Como entrada de instrucciones.
- **Preferencias de CLI En el proyecto.** `.github/copilot/settings.json` Puede
  ser compartido. `.github/copilot/settings.local.json` guarda ajustes locales.
- **Preferencias y recursos personales.** A CLI usa `~/.copilot/` por patrón.
  `COPILOT_HOME` selecciona otro directorio personal.
- **Editor.** `.vscode/` Es opcional para la configuración de VS Code.

El kit escribe los apuntes de proyecto en `.github` y usa `AGENTS.md` como
entrada compartida. La selección `copilot` también registra `.vscode` para
diagnóstico, sin crear la carpeta. La carpeta personal y los archivos de
configuración de la CLI Son administrados por el usuario. Copilot CLI También
reconoce skills del proyecto en `.agents/skills` e `.claude/skills`. [Caminos de
las skills][cp] · [Preferencias de CLI][cp-config] · [Instrucciones del
repositorio][cp-instructions]

Use `copilot skill list` e `copilot instruction list` en la raíz del repositorio
para consultar el descubrimiento local, si su versión de CLI Ofrecer estos
comandos.

## Formatos nativos

Los grupos se conservan cuando el descubrimiento permite. Abajo, `grupo/`
representa categorías opcionales; `nome` es el identificador único del recurso.
Los caminos son relativos a la carpeta del cliente, excepto donde se indica.

- Codex: `.agents/skills/grupo/nome/SKILL.md` y referencias agrupadas en
  `.codex`. Seleccionar sólo el Codex usa `.agents` solo para las skills. Si
  esta ruta está obstruida, la skill usa `.codex/skills`, reconocida por el
  cargador del Codex 0.171.0. Los perfiles Markdown en `.codex/agents` sirven
  para consulta. Subagentes nativos del Codex utilizan archivos TOML.
  [Cargador][codex-roots] · [Subagentes][codex-agents]
- Claude: `skills/nome/SKILL.md`, `commands/grupo/nome.md`,
  `rules/grupo/nome/RULE.md` e `agents/nome.md`.
- Cursor: `skills/grupo/nome/SKILL.md`, `rules/grupo/nome.mdc`, `agents/nome.md`
  e `commands/nome.md`.
- Copilot: `skills/nome/SKILL.md`, `agents/nome.agent.md`,
  `instructions/grupo/nome.instructions.md` para reglas globales o por glob,
  `rules/grupo/nome/RULE.md` para referencias explícitas y
  `prompts/grupo/nome.prompt.md` para local.
- OpenCode: `skills/grupo/nome/SKILL.md`, `commands/grupo/nome.md`,
  `agents/grupo/nome.md`; reglas como referencias.
- Antigravity: skills y reglas agrupadas, agentes planos registrados en los
  manifiestos y comandos como referencias. El cliente lee `AGENTS.md` e
  `GEMINI.md` En el proyecto, además de usar `~/.gemini/config/` para
  preferencias personales. Los equipos pueden configurar carpetas personales con
  `.gemini/config.json` En el proyecto. [Descubrimiento de
  Antigravity][antigravity]
- ZCode: `skills/nome/SKILL.md`, `agents/nome.md` e `commands/nome.md`. Cada
  perfil del kit declara las herramientas que su función usa. Si el proyecto ya
  ha definido un agente en el mismo camino, el kit preserva el archivo. Reglas
  se encuentran como referencias. [Subagentes de ZCode][zcode-agents]
- Kimi: `skills/grupo/nome/SKILL.md` e `agents/nome.md`. El cliente también
  acepta `.agents`. Comandos requieren preferencias de complementos. [Categoría:
  Agentes Kimi][kimi-agents]
- MiniMax y DeepSeek: `skills/nome/SKILL.md`; otros tipos como referencias.
- MiMo: `skills/grupo/nome/SKILL.md`, agentes y órdenes directos; reglas como
  referencias.

Los nuevos perfiles OpenCode usan `permissions` del formato V2, con acciones
como `shell` e `edit`. El revisor anterior conserva su formato legado; comprueba
la [migración de permisos](https://opencode.ai/docs/permissions/) En la versión
usada. Permisión de terminal no aislaje caminos por sí solo: el perfil y los
scripts siguen responsables de respetar el alcance autorizado.

Claude documenta skills en el nivel `skills/nome` y descubrimiento recursiva en
`.claude/agents/`. El kit utiliza agentes planos. El Cursor también reconoce
skills en raíces de otros clientes. Con varios clientes seleccionados, consulte
la lista del editor para identificar nombres repetidos. [Subagentes de
Claude][claude-agents] · [Skills del Cursor][cursor]

Cuando una skill y un mando legado de Claude tienen el mismo nombre, la skill
recibe la invocación por barra. Esto ocurre con `atualizar-documentacao`,
`documentar-legado`, `preparar-dev` e `proximos-passos`. Para usar la
orquestación del comando homónimo, introduzca el `COMMAND.md` del hub.
[Precedencia de nombres en Claude][claude-skills]

MiniMax, Copilot CLI/SDK y DeepSeek usan hijos inmediatos. ZCode exige skills
planas en plugins. Mantenemos esos diseños; no presumimos recursión en agentes o
comandos cuando el proveedor sólo documenta archivos directos.

En los paquetes npm publicados `0.0.21` e `0.0.30`, reglas Copilot generadas sin
YAML nativo explícito usan `applyTo: '**'` independientemente del `trigger` De
origen. Una regla manual o con glob puede alcanzar un alcance mayor que el
previsto. El comportamiento del código local en desarrollo se describe a
continuación. Revise los metadatos generados; la carga varía entre clientes.

En la versión publicada `0.0.21`, la regla Git del Cursor usa `alwaysApply:
true`, aunque el origen indique una decisión por relevancia. [reglas del
Cursor](https://cursor.com/docs/rules), esto configura aplicación en todas las
sesiones. La candidata local alinea el metadatos; comprueba la versión instalada
antes de confiar en el alcance deseado.

Antigravity busca un nivel por defecto. Los archivos `.agents/skills.json`,
`rules.json` e `agents.json` registran explícitamente cada referencia; el
sincronizador los actualiza al crear, mover o eliminar recursos. Son manifiestos
nativos, distintos de los catálogos internos homónimos en `.pbai4devs`.

OpenCode V2 recorre hasta seis niveles de skills. Kimi recorre agrupadores sin
`SKILL.md`; un directorio que ya define una skill no es una categoría común.
Estos límites deben ser respetados al crear grupos.

Prompts `.prompt.md` pertenecen al harness Local del VS Code, anunciado para
remoción en febrero de 2027. No Copilot, use skills para rutinas invocables.
`GEMINI.md` Importación `AGENTS.md`; `CLAUDE.md` apunta para esa misma guía.

Con Claude y Copilot seleccionados, el Copilot CLI puede recibir referencias
equivalentes de `.claude/rules` e `.github/instructions`. Las dos rutas se
mantienen para sus respectivos clientes; el soporte de instrucciones varía entre
[ambientes de
Copilot](https://docs.github.com/en/copilot/reference/custom-instructions-support).
En prueba local con Copilot CLI `1.0.109`, referencias `.claude/rules` manuales
y con glob también entraron en el contexto inicial. No presuma que los metadatos
de la ruta Copilot restrinjan las referencias provenientes de otros clientes.

Al seleccionar un agente personalizado, confirme que el cliente leyó su fuente
compartida: cargar un apuntamiento no comprueba esa lectura. La inclusión
automática por `@` el Copilot CLI está documentado para archivos de
instrucciones específicos, no para todos los archivos de agente. Vea
[referencias de archivo de Copilot
CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions#referencing-other-files).

No [Claude Code](https://code.claude.com/docs/en/memory), sólo `paths` delimita
una regla en `.claude/rules`; referencias sin este campo entran en el contexto
inicial. La versión `0.0.21` y una candidata local anterior generaron
apuntamientos condicionales sin `paths`; en esa candidata, una sesión  encargó
reglas `manual`, `model_decision` e `glob` En el inicio. sync local ahora genera
reglas globales sólo para `always_on`; para `glob`, exige `paths` Claude
explícito y válido. Reglas `manual`, `model_decision` e `glob` Sin este mapeo
están disponibles para lectura explícita. Las referencias legadas no comprobadas
son preservadas y exigen revisión. La migración y la recuperación concurrente
todavía necesitan validación completa en las plataformas soportadas.

En Copilot, `always_on` usa `applyTo: '**'` e `glob` conserva el patrón de la
regla. Por patrón, `manual` e `model_decision` Se quedan en `.github/rules` para
consulta explícita; no hay decisión automática equivalente comprobada. En la
prueba local, instrucciones sin `applyTo` También entraron en el contexto
inicial. O [Copilot
CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
no expande referencias `@` dentro de `*.instructions.md`; un enlace a la fuente
compartida tampoco comprueba su lectura. En una prueba, el cliente anunció el
descubrimiento contextual para un archivo de glob, pero no hubo lectura
observada del origen. En otra sesión, el cliente leyó la fuente para el archivo
correspondiente; eso no garantiza el mismo comportamiento en todas las sesiones.
Consulte la lectura cuando la aplicación de la regla sea necesaria.

YAML nativo explícito prevalece. Para complementar un archivo humano, el
frontmatter necesita ser idéntico al YAML nativo, con `applyTo` literal entre
aspas y, opcionalmente, `description` literal entre aspas. Escopo diferente o
ambiguo bloquea la sincronización y preserva los archivos.

Apuntamientos antiguos solo se eliminan con propiedad e integridad comprobadas;
si están en el índice Git, la operación bloquea sin modificarlo. Instrucciones
antiguas editadas o sin propiedad comprobada permanecen y pueden seguir activas;
revisarlas manualmente.

El instalador genera la selección y la política en `espelhos.conf`;
`sincronizar` Reconstró los apuntes solo con Node y los archivos del hub
instalado. `--check` no cambia archivos. Al reparar archivos administrados,
`--force` Puede crear copia de seguridad local; su visibilidad a Git depende de
los ignores existentes. Conflictos con contenido humano siguen bloqueados.
Recursos y enlaces humanos de los clientes se conservan; una ruta preservada no
recibe nuevos apuntes. `.codex/skills` continúa apuntando a sus skills y el
Codex recibe el kit en `.agents/skills`. Cuando la ruta principal vuelve a estar
disponible, los apuntamientos alternativos obsoletos solo se eliminan con
propiedad comprobada. Contenido humano y el índice Git se conservan; si ambas
rutas están obstruidas, la operación informa el conflicto sin reemplazarlas.

Las fuentes confirman formatos, no ejecución de cada cliente. Valide
descubierta, invocación y resultado en el cliente elegido antes de considerar
una integración comprobada. Las razones y fuentes por adaptador también se
quedan en `templates/clients/ADAPTERS.json` en el centro de fuentes de
AgentDevKit.

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
[reading-en]: ../../en/kit/COMPATIBILIDADE.md
[reading-es]: COMPATIBILIDADE.md
