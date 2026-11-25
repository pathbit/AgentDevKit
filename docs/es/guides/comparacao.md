---
description: "Compara abordajes de planificación, entrega y contexto para agentes de código."
language: es
---

# Comparar herramientas para desarrollo con agentes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Compara las funciones que su equipo necesita para planificar, implementar,
verificar y mantener el contexto del proyecto. Cada herramienta tiene su propio
flujo, y puede combinar opciones que cumplen papeles diferentes en el mismo
repositorio.

## Matriz de características

**✓** Función documentada · **✓\*** Función documentada con configuración
adicional · **—** Equivalente sin confirmación en las fuentes consultadas.

Las marcas comparan capacidades. El alcance, las órdenes y las garantías de cada
implementación están en las notas inferiores a las tablas.

### Planificar y entregar

<!-- markdownlint-disable MD013 -->

| Funcionalidad | AgentDevKit | BMad Method | OpenSpec | GitHub Spec Kit | `tlc-spec-lean` | `tlc-spec-driven` | dotcontext |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Adopción en repositorio existente | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Especificación o plan con criterios de aceptación | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Tareas o historias en un artefacto propio | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓\* |
| Implementación guiada por el plan | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Verificación de la implementación contra la planificación | ✓ | ✓ | ✓\* | ✓ | ✓ | ✓ | ✓\* |
| Criterios y evidencias registrados en la verificación | ✓ | ✓ | ✓\* | ✓ | ✓ | ✓ | ✓\* |
| Revisión de la entrega en otra sesión o por otro agente | ✓ | ✓ | — | — | ✓ | ✓ | — |
| Checaje del contenido revisado contra el diff de commit o merge fast-forward | ✓ | — | — | — | — | — | — |
| PRD y diseño técnico en etapas propias | ✓ | ✓ | — | — | — | — | — |
| Levantamiento del código para documentar el sistema existente | ✓ | ✓ | — | — | — | — | ✓\* |
| Orientación en el terminal para la siguiente acción o artefacto | ✓ | ✓ | ✓ | ✓\* | — | — | ✓ |
| Actualización de las specs vigentes al archivar cambios por deltas | ✓\* | — | ✓ | — | — | — | — |
| Inicio o avance del flujo vía servidor MCP | ✓\* | — | — | — | — | — | ✓ |

<!-- markdownlint-enable MD013 -->

AgentDevKit registra el parecer independiente, el resultado por criterio y las
referencias a las pruebas. El comando `revisar-entrega` El contenido revisado
puede extenderse y conferir el diff del commit o de un merge fast-forward. BMad
orienta la revisión en una sesión nueva. `tlc-spec-lean` organiza las rebanadas
en el plano y `tlc-spec-driven` establece un archivo de tareas en el flujo
formal. [Revisión de AgentDevKit][revisao] · [Revisión BMad][bmad-review] ·
[Lean][tlc-lean] · [Spec Driven][tlc-driven]

OpenSpec 2 ofrece `openspec-verify-change` en el perfil personalizado. En GitHub
Spec Kit, `speckit-converge` compara evidencias y artefactos. Instale el
workflow `speckit` para acompañar su ejecución por la CLI. [Skills
OpenSpec][openspec-skills] · [Convergencia][speckit-verify] · [Workflows de Spec
Kit][speckit-workflows]

AgentDevKit ofrece dos funciones por complementos opcionales. El complemento
`openspec` usa el motor OpenSpec para aplicar las deltas y archivar el cambio en
`openspec/`. El complemento `dotcontext-mcp` usa el servidor dotcontext para
iniciar o avanzar PREVC. Cada motor aplica los propios criterios. Use `next
--integrations` Para localizar los artefactos reconocidos en el proyecto.
[Complementos](plugins.md) · [Archivamiento en OpenSpec][openspec-cli] ·
[Evidencias en dotcontext][dotcontext-evidence]

### Configurar y mantener el proyecto

<!-- markdownlint-disable MD013 -->

| Funcionalidad | AgentDevKit | BMad Method | OpenSpec | GitHub Spec Kit | `tlc-spec-lean` | `tlc-spec-driven` | dotcontext |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Instalación o integración con múltiples clientes de IA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Estructura compartida sin instalar archivos para clientes individuales | ✓ | — | ✓ | ✓ | — | — | — |
| Selección de clientes o destinos ajustable después de la instalación | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sincronización de instrucciones propias del proyecto entre clientes de IA | ✓ | — | — | — | — | — | ✓ |
| Previa sin escritura para actualización o configuración de clientes | ✓ | — | ✓ | — | — | — | ✓ |
| Diagnóstico de archivos gestionados y de configuración instalada | ✓ | ✓ | — | ✓ | — | — | ✓ |
| Protección de cambios locales en archivos administrados en la actualización | ✓ | — | — | ✓ | — | — | — |
| Preservación del índice Git al configurar y sincronizar | ✓ | — | — | — | — | — | — |
| Recuperación de problemas en el ciclo de instalación o actualización | ✓ | — | — | ✓ | — | — | — |
| Consulta el catálogo de módulos, extensiones o skills opcionales | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| Instalación selectiva de módulos, extensiones o skills opcionales | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| Comprobación de herramientas locales por el terminal | ✓ | — | — | ✓ | — | — | — |

<!-- markdownlint-enable MD013 -->

- **Preferencias y vuelco.** AgentDevKit salva la selección en
  `.pbai4devs/state/agentdevkit.json` y usa esta selección en `sync`. Use
  `agents add <ids>` e `agents remove <ids>` para cambiar los clientes
  individualmente. La selección `none` conserva `.pbai4devs` e `AGENTS.md` sin
  configurar un cliente específico. Versione las fuentes compartidas y trate los
  apuntes generados conforme la guía de instalación. OpenSpec ofrece `init
  --tools none` y permite repetir `init` Para añadir clientes. Spec Kit registra
  las integraciones instaladas y ofrece `--integration none`. [CLI
  AgentDevKit][cli] · [Instalación y Git][instalacao] · [Configuración de
  OpenSpec][openspec-setup] · [Integraciones del Spec Kit][speckit-integrations]
  · [Modo `none` del Spec Kit][speckit-none]
- **Selección y diagnóstico.** AgentDevKit usa `--dry-run` para la previa,
  `doctor` para el diagnóstico y `sync --check` Para conferir sincronización sin
  escribir. OpenSpec también ofrece `update --dry-run`. La guía de BMad
  documenta `bmad status` en la previa v7 y la selección de clientes en la
  instalación de módulos. Tech Leads Club configura los destinos al instalar
  skills individuales. El dotcontext utiliza presets por exportación, tiene
  previa configuración MCP y ofrece diagnóstico de los hooks del Codex. Cada
  verificación tiene el alcance de la operación que la herramienta describe.
  [CLI AgentDevKit][cli] · [CLI OpenSpec][openspec-cli] · [Instalación de
  BMad][bmad-install] · [Catálogo del TLC][tlc-catalog] · [CLI
  dotcontext][dotcontext-cli]
- **Preservación y recuperación.** AgentDevKit preserva el índice Git, señala
  conflictos con contenido propio y permite consultar el diario y la copia de
  una operación pendiente vía `recovery`. Revise el estado y la copia antes de
  usar `recovery resolve`. Spec Kit utiliza manifiestos para detectar cambios,
  bloquear actualizaciones de integraciones alteradas sin `--force` e revertir
  fallas de la propia operación, con snapshots en ciertos conflictos. OpenSpec 2
  preserva alteraciones en los caminos antiguos en la migración y advierte que
  la actualización sustituye ediciones directas de skills en `.agents/skills`.
  La recuperación de sesiones del dotcontext pertenece al flujo de trabajo.
  [Preservación y recuperación en AgentDevKit][instalacao] · [Ciclo de
  integraciones del Spec Kit][speckit-integrations] · [Migración de OpenSpec
  2][openspec-upgrade] · [Runtime dotcontext][dotcontext-runtime]
- **Opcionales.** `plugins list` e `plugins info` consultan las herramientas y
  skills externas reconocidas por AgentDevKit. `plugins install` e `plugins
  check` actúan sobre los ítems seleccionados, con los gestores
  correspondientes. `tools check` verifica herramientas auxiliares, mientras
  `specify check` verifica ejecutables exigidos por las integraciones del Spec
  Kit. El catálogo de BMad ofrece módulos como Test Architect. El Spec Kit
  ofrece extensiones con búsqueda e instalación, y el Tech Leads Club utiliza un
  catálogo común a las dos skills de la tabla. `dotcontext admin skill list`
  lista skills del contexto, que `admin skill export` exporta a los clientes.
  [CLI AgentDevKit][cli] · [Módulos de BMad][bmad-modules] · [Extensiones de
  Spec Kit][speckit-extensions] · [CLI del Spec Kit][speckit-core] · [Catálogo
  del TLC][tlc-catalog] · [CLI dotcontext][dotcontext-cli]

## Cuando considere cada opción

| Enfoque | Cuando se considere | Puntos de vista |
| --- | --- | --- |
| **AgentDevKit** | Compartir instrucciones entre clientes de agentes y orientar la adopción en proyectos nuevos o existentes. | Fuente común en `.pbai4devs`, configuración selectiva, levantamiento local y revisión de la entrega por criterios y pruebas. [CLI][cli] · [Flujo de trabajo][fluxo] |
| **BMad Method** | Explorar ideas y organizar descubrimiento, planificación y desarrollo. | Skills con puntos de entrada propios para cada actividad. [Documentación oficial][bmad] |
| **OpenSpec** | Organizar el trabajo por cambio y mantener las specs vigentes. | Propuestas, specs, diseño y tareas organizadas de la propuesta al archivo. [Visión general][openspec] |
| **GitHub Spec Kit** | Especificar, planificar y decomponer el trabajo por funcionalidad. | Comandos para pasar de la especificación a la implementación y una guía de adopción que parte de la arquitectura y de las pruebas de un proyecto existente. [Proyecto][speckit] · [Proyectos existentes][speckit-existing] |
| **Tech Leads Club `tlc-spec-lean`** | Usar un plan corto con criterios verificables. | Plan revisado por una persona, verificaciones vinculadas a los criterios y revisión por otro agente. [Skill oficial][tlc-lean] |
| **Tech Leads Club `tlc-spec-driven`** | Detallar tareas, dependencias y puntos de verificación. | Especificación, diseño y tareas conforme al alcance, con etapas de ejecución y verificación. [Skill oficial][tlc-driven] |
| **dotcontext**, de Vinicius Lana (Vini Lana) | Mantener un contexto persistente y acompañar la ejecución entre agentes. | Contexto en `.context/`, flujo PREVC, servidor MCP y hooks opcionales para clientes compatibles. El proyecto ya ha sido publicado como `@ai-coders/context`. [README del proyecto][dotcontext] |

## Cómo darle en su proyecto

En el cliente de IA, utilice la sintaxis disponible para la integración
instalada.

- **AgentDevKit**. Compara la orientación de `npx @pathbit/agentdevkit next` con
  el inventario de `npx @pathbit/agentdevkit document --markdown`En un proyecto
  con el kit instalado, `sync --check` confiere la sincronización. [CLI][cli] ·
  [Documentación de sistemas existentes][legado] · [Clientes
  compatibles][compatibilidade]
- **BMad Method**. Use `bmad` en el cliente de IA para consultar la siguiente
  etapa. Si usa el árbol de tickets, `tickets.py next` muestra la fila de
  trabajo en la terminal. Para investigar código existente, consulte
  `bmad-deep-recon`. [Proyecto existente][bmad-existing] ·
  [Planificación][bmad-plan] · [Árbol de tickets][bmad-tickets]
- **OpenSpec**. Después de crear un cambio con la skill `openspec-propose`,
  consulte `openspec status --change <id>` en la terminal. Compara los archivos
  del cambio con las specs vigentes para ver qué incorpora el archivo.
  [CLI][openspec-cli] · [Estructura y deltas][openspec-concepts]
- **GitHub Spec Kit**. Siga el flujo de `/speckit-specify` a
  `/speckit-implement` y vete `spec.md`, `plan.md` e `tasks.md`. Use
  `/speckit-converge` para buscar diferencias entre el código y esos artefactos.
  Para un workflow iniciado por CLI, consulte `specify workflow status
  <run_id>`. [Guía rápida][speckit-quickstart] · [Workflows][speckit-workflows]
- **Tech Leads Club**. Consulte como `tlc-spec-lean` organiza las partes y los
  criterios en `plan.md` y acciona una revisión por otro agente. Em
  `tlc-spec-driven`, vea el `tasks.md` del flujo formal y la asociación entre
  criterios, verificaciones y pruebas. [Lean][tlc-lean] · [Spec
  Driven][tlc-driven] · [Clientes compatibles][tlc-catalog]
- **dotcontext**. Vea planes y contexto persistidos en `.context/`. Con el CLI
  instalado, `dotcontext admin workflow guide` presenta la orientación del PREVC
  Consulte también la configuración de exportación de instrucciones e
  integración MCP. [README del proyecto][dotcontext] · [Notas de
  versión][dotcontext-releases]

## Adotar solo lo que usa

Consulte los flujos reconocidos en el proyecto antes o después de instalar el
kit:

```console
npx @pathbit/agentdevkit next --integrations
```

La consulta utiliza archivos y carpetas locales para apuntar referencias y
documentos que puede aprovechar. Use `--intent product` o `--intent run` para
indicar su objetivo y `--json` para salida estructurada. Cuando encuentra
indicios en el proyecto, el `next` sugiere esta consulta y mantiene la
orientación principal. Las aprobaciones del proyecto siguen valiéndose.

Si el proyecto ya tiene specs o decisiones revisadas, comience por ellas. Elija
una fuente para los criterios de aceptación de cada entrega y registre donde se
encuentran las pruebas. Esto permite mantener, por ejemplo, las specs en
OpenSpec y usar AgentDevKit para la preparación local y las instrucciones
compartidas.

En un proyecto existente, vea primero el plan con `init --dry-run` y límite los
apuntamientos del AgentDevKit con `--agents`. Instale y configure cada
herramienta externa en una acción separada, siguiendo su documentación cuando
utilice los mismos clientes o caminos. [Instalación de AgentDevKit][instalacao]

[cli]: cli.md
[fluxo]: workflow.md
[instalacao]: installation.md
[legado]: documentation.md#documentar-un-sistema-en-uso
[compatibilidade]: ../kit/COMPATIBILIDADE.md
[revisao]: ../kit/commands/revisar-entrega/COMMAND.md
[bmad]: https://docs.bmad-method.org/
[bmad-existing]: https://docs.bmad-method.org/scenarios/change-an-existing-codebase/
[bmad-install]: https://docs.bmad-method.org/start/install-bmad/
[bmad-modules]: https://docs.bmad-method.org/customize/add-modules/
[bmad-plan]: https://docs.bmad-method.org/scenarios/plan-a-feature-as-a-team/
[bmad-review]: https://docs.bmad-method.org/build/review-a-change/
[bmad-tickets]: https://docs.bmad-method.org/reference/ticket-tree/#what-is-ready
[openspec]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/start/overview.md
[openspec-cli]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/reference/cli.md
[openspec-concepts]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/guides/concepts.md
[openspec-setup]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/start/setup.md
[openspec-skills]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/reference/skills.md
[openspec-upgrade]: https://github.com/Fission-AI/OpenSpec/releases/tag/v2.0.0
[speckit]: https://github.com/github/spec-kit
[speckit-core]: https://github.github.com/spec-kit/overview/core.html#check-installed-tools
[speckit-existing]: https://github.github.com/spec-kit/how-to/existing-projects.html
[speckit-extensions]: https://github.github.com/spec-kit/extensions/cli.html
[speckit-integrations]: https://github.github.com/spec-kit/integrations/cli.html
[speckit-none]: https://github.github.com/spec-kit/integrations/none.html
[speckit-quickstart]: https://github.github.com/spec-kit/quickstart
[speckit-verify]: https://github.github.com/spec-kit/reference/agentic-sdd.html
[speckit-workflows]: https://github.github.com/spec-kit/workflows/overview.html
[tlc-lean]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-lean/SKILL.md
[tlc-driven]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-driven/SKILL.md
[tlc-catalog]: https://github.com/tech-leads-club/agent-skills#-supported-agents
[dotcontext]: https://github.com/vinilana/dotcontext#what-dotcontext-is
[dotcontext-cli]: https://github.com/vinilana/dotcontext#cli-reference
[dotcontext-evidence]: https://github.com/vinilana/dotcontext#executable-evidence
[dotcontext-releases]: https://github.com/vinilana/dotcontext/releases
[dotcontext-runtime]: https://github.com/vinilana/dotcontext#harness-runtime

[reading-pt]: ../../guides/comparacao.md
[reading-en]: ../../en/guides/comparacao.md
[reading-es]: comparacao.md
