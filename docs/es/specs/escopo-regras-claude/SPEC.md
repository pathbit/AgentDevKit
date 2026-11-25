---
description: "Preservación del alcance de reglas generadas para Claude Code."
status: rascunho
language: es
---

# Escopo de reglas en Claude Code

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Evitar que las reglas condicionales del hub se carguen globalmente en Claude y
mantengan reglas humanas, índice Git y configuraciones existentes intactos.

## Requisitos funcionales

- `always_on` se puede generar para `.claude/rules` Como regla global.
- `glob` exige alcance Claude `paths` explícito y sintaticamente soportado para
  generar regla por caminos. Sin ese metadado, mantenga lectura explícita.
  Incluso con él, no presuma equivalencia del glob entre clientes.
- `manual` e `model_decision` No tienen equivalente automático comprobado en
  Claude. Mantenga acceso explícito sin crearlas como reglas globales.
- La misma decisión vale para generaciones automáticas y entradas nativas
  explícitas. Metadados inválidos o ambiguos no deben resultar en una regla
  global.
- Preserve reglas humanas y frontmatter incompatible o ambiguo, incluso con
  `--force`. Identidad de contenido no comprueba propiedad.
- Al migrar una referencia antigua, preserve caminos sin propiedad o integridad
  comprobadas y bloqueie remoción de contenido rastreado o staged. Hash de
  bytes, aisladamente, no comprueba propiedad ni preservación de metadatos:
  sustitutos idénticos y cambios de modo o atributos pueden ser humanos. Sin
  prueba suficiente, preserve y solicite revisión. Una referencia antigua
  humana, modificada o sin propiedad que todavía pueda cargar globalmente debe
  generar conflicto: `--check` e JSON No deben indicar éxito, ni la operación
  aplicar cambios parciales inseguros. La demarcación de Claude puede preservar
  esas reglas y concluir la selección, siempre que infríe que todavía pueden
  estar activas y mantenga los diagnósticos de verificación no aprobados hasta
  que se resuelva la situación.
- `init`, `update`, selección de agentes, `sync` e `--check` Deberán aplicar el
  mismo contrato, sin cambiar configuración Git, índice o ignores del proyecto.
  Esto incluye la ejecución directa del script de sincronización: uno `--check`
  No debe declarar éxito si las reglas Claude preservadas todavía pueden estar
  activas. Una frontera que impida inspeccionar `.claude/rules` También se debe
  señalar cuando el catálogo contiene sólo reglas globales. La inspección debe
  considerar subcarpetas que Claude carga incluso cuando sus nombres normalmente
  indican caché; no descarte registros de reglas legadas sin resolver su
  preservación y su posible carga.

## Requisitos no funcionales

Mantenga apuntamientos pequeños y sin enlaces simbólicos. `--check` Es solamente
lectura. Los errores deben identificar el camino y la acción necesaria, sin
exponer contenido privado. Las pruebas y fixtures son versionados; sus salidas
no son.

## Escopo y límites

El cambio cubre destino, frontmatter, manifiesto, estado, catálogo y migración
de reglas Claude. La política Copilot debe ser preservada y comprobada. No
presume equivalencia de globs entre Claude y Antigravity ni que un enlace
Markdown sea cargado automáticamente. No promete atomicidad bajo edición
concurrente: esa limitación se trata en la [recuperación
conservadora](../recuperacao-conservadora/SPEC.md).

## Restricciones técnicas

El Claude interpreta `paths` y puede cargar una regla sin alcance cuando el YAML
no válido. Use serialización validada y falhe antes de cambiar el destino en
casos no soportados. El planificador en
`.pbai4devs/scripts/lib/claude-rule-scope.mjs` acepta un subconjunto de YAML y
está integrado al sync local. La implementación y su migración todavía dependen
de las comprobaciones pendientes abajo, incluyendo competencia y Windows.

## Criterios de aceptación y verificación

Las evidencias propuestas se encuentran en `.agent-tests/escopo-regras-claude/`;
todos los criterios están pendientes y exigen ejecución y revisión
independientes.

- **AC-001 — pending:** Con Node 24+, ejecute las pruebas del planificador y de
  integración. En reglas y YAML sintéticos, gatillos y metadados inválidos no
  amplían el alcance, incluso en líneas `nativo` del manifiesto. Referencias
  manuales, por decisión o sin `paths` no entran en el lugar `.claude/rules`.
  Evidencia: `planejamento.log`.
- **AC-002 — pending:** Con Git y fixtures con contenido humano y staged,
  ejecute `init`, `update`, `agents` e `sync` y compara datos humanos, índice,
  configuración, `.git/info/exclude` e ignores byte a byte. Incluya contenido
  humano idéntico o mezclado, alteración y exclusión staged, enlaces y pestañas.
  Evidencia: `preservacao.log`.
- **AC-003 — pending:** En fixtures con referencias propias, humanas, editadas y
  staged, las pruebas de migración eliminan solo referencias propias, intactas y
  no rastreadas, con propiedad y metadados comprobados; otros casos son
  preservados y señalados, inclusive después de desmarcar Claude. Incluya
  sustituto de bytes idénticos y alteraciones de modo y atributos. Revise
  destinos, estado, catálogo y manifiesto. Evidencia: `migracao.log`.
- **AC-004 — pending:** Con Claude disponible y fixture aislada, registre
  `InstructionsLoaded` para referencia generada por el instalador: carga en el
  archivo correspondiente, sin cargar al principio o fuera del alcance.
  Compruebe la lectura del origen por separado. Evidencia: `claude.json`.
- **AC-005 — pending:** Con selecciones Claude, Copilot y Antigravity, las
  pruebas de adaptadores y fixtures mixtas no amplían el alcance ni declaran
  equivalencia no comprobada. Evidencia: `clientes.log`.
- **AC-006 — pending:** En macOS, Linux y Windows, ejecute pruebas de fallos y
  competencia aplicables y registre limitaciones de plataforma. Assertiva:
  ninguna espera es contada como aprobada. Evidencia: `plataformas.log`.

Las pruebas `tests/claude-rule-scope.test.mjs` e
`tests/claude-rule-scope-integration.test.mjs` cubren el planificador y el sync
directo; `tests/claude-rule-cli.test.mjs` cobre entradas de CLI. Con Claude Code
2.1.322, una regla `glob` generada por sync integrado se ha cargado sólo para el
archivo correspondiente; se ha verificado la lectura explícita del origen en
sesión separada. Esto no demuestra lectura automática del origen, la generación
por el instalador, los demás criterios o equivalencia con Antigravity. En otra
fixture, `InstructionsLoaded` registró al principio tanto una referencia legada
`always_on` ¿Qué es lo que es? `model_decision`, ambas sin `paths`. Los eventos
de lectura de las fuentes aparecieron sólo cuando solicitados en sesión
separada; ausencia de `Read` No descarta acceso interno. La prueba usó sandbox
en macOS, con una sesión por condición, y no demuestra obediencia o
determinismo.

## Impacto en la documentación

Actualizar compatibilidad, guías de recursos y CLI, índices y orientaciones de
migración según el comportamiento final. Explicar referencias de lectura
explícita y esperas de archivos antiguos sin propiedad comprobada.

## Dependencias de otras specs

Conferir [sincronización segura](../safe-synchronization/SPEC.md),
[descubrimiento y preservación](../discovery-preservation/SPEC.md) e
[recuperación conservadora](../recuperacao-conservadora/SPEC.md).

## Referencias y aprobación

[PRD](../../product/prd.md), [UX/UI](../../product/ux-ui.md),
[diseño](../../product/design.md), [roadmap](../../product/roadmap.md) y el
estado local en `.pbai4devs/state/configuracao/ESTADO.md`.

Fuentes primarias: [las reglas de
Claude](https://code.claude.com/docs/en/memory) e [normas
antigravity](https://antigravity.google/docs/rules/). El usuario autorizó las
mejoras; la revisión técnica, el destino exacto del fallback y los detalles de
migración todavía necesitan ser concluidos antes de la entrega.

[reading-pt]: ../../../specs/escopo-regras-claude/SPEC.md
[reading-en]: ../../../en/specs/escopo-regras-claude/SPEC.md
[reading-es]: SPEC.md
