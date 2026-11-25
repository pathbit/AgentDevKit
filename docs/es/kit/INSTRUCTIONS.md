---
description: "Orden de trabajo y mantenimiento de los agentes."
language: es
---

# Cómo usar

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Comience por el resultado pedido. La orden orienta la secuencia, la skill
orienta las decisiones, el perfil define la responsabilidad y el script ejecuta
la operación con las herramientas disponibles. Reglas y modelos dan contexto y
formato. Pida la lectura de la fuente cuando el cliente no ofrece el acceso
rápido.

| Situación | Por dónde empezar | Salida |
| --- | --- | --- |
| Descubrir la siguiente etapa | [proximospasos](commands/proximos-passos/COMMAND.md) | Siguiente acción y prerrequisito pendiente. |
| Sólo consultar el entorno o hacer un proyecto existente rotar | [diagnosticar](commands/diagnosticar/COMMAND.md) o [preparar dev](commands/preparar-dev/COMMAND.md) | Inventario o ambiente verificado, conforme a la solicitud. |
| Entender y documentar un sistema existente | [documentarlegado](commands/documentar-legado/COMMAND.md) | Comportamientos, evidencias y lagunas por flujo. |
| Establecer un incremento o ejecutar una entrega aprobada | [planificar entrega](commands/planejar-entrega/COMMAND.md) o [implementar-entrega](commands/implementar-entrega/COMMAND.md) | Plan aceptado o cambio listo para validar. |
| Comprobar el cambio o revisar la entrega final | [validar entrega](commands/validar-entrega/COMMAND.md) o [revisar entrega][revisao] | Pruebas por criterio o decisión independiente. |
| Revisar riesgos de seguridad | [Auditar aseguranca](commands/auditar-seguranca/COMMAND.md) | Informe con hallazgos, prioridades y cobertura. |
| Evoluir los recursos del kit | [crear curso](skills/projeto/criar-recurso/SKILL.md) → [Sincronizar](commands/sincronizar/COMMAND.md) → [verificar agentes](commands/verificar-agentes/COMMAND.md) | Fuentes reutilizadas o ajustadas, apuntamientos y pruebas. |

Antes de trabajar en la documentación, use `atualizar-documentacao` para
inventariar y leer archivos existentes. Preserve sus caminos y contenido;
complemente vacíos y organice por índices, sin reemplazar documentos por los
modelos.

Al instalar o reconfigurar el kit, pregunte qué clientes usa el usuario si no
hay elección en la solicitud o en el estado. A CLI acepta `--agents
codex,claude`. Consulte `agents` y use `agents add <id>` o `agents remove <id>`
para cambiar la selección después. Utilice los IDs de
[compatibilidad](COMPATIBILIDADE.md), sin deducir el agente por la aplicación,
SO o carpetas. Sin respuesta disponible, mantenga la opción salva o `none` Para
preparar solo el hub. Regístrate las elecciones por CLI.

En el primer uso, introduzca el objetivo con `init --purpose
agents|product|run|document` o responda al asistente interactivo cuando abra. Si
ha pasado idioma y clientes explícitamente, informe también el objetivo en CLI.
Para consultar el inventario antes de instalar, use `agentdevkit document`.

Para iniciar el producto, siga el orden abajo. Para preparar la ejecución del
proyecto existente, use `preparar-dev` y preserve las decisiones ya probadas.

1. `configurar-projeto`: preparar el trabajo sin iniciar código.
2. `criar-prd` e `criar-ux-ui`: definir producto y experiencia.
3. `criar-design-doc`: aprobar arquitectura y tecnología.
4. `gerenciar-roadmap`: planificar entregas y dependencias.
5. `criar-spec`: exige los documentos anteriores aprobados; UX/UI Puede que no
   sea aplicable con justificación aprobada.
6. `implementar-spec`: aclarar las dudas, aprobar el plan, configurar/verificar
   El medio ambiente, la aplicación y la prueba de los criterios de aceptación.

Para nuevas características, no ofrezca saltar las aprobaciones de spec o plan.

Mientras configurar los agentes, mantenga solo modelos. Los documentos reales se
rellenarán por preguntas y respuestas cuando comience el proyecto. Combine
destinos y los registre en el estado futuro de configuración. Al finalizar una
etapa, explique la próxima y reúna sus preguntas. Use
[proximospasos](skills/projeto/proximos-passos/SKILL.md) y respete el idioma
salvo en `.pbai4devs/state/agentdevkit.json`; sin elección, use portugués.
Evolua README y documentos por los [modelos de fase](templates/README.md).
Actualice hechos y enlaces afectados; registre ausencia de impacto con
justificación.

En un proyecto existente, preserve documentos y decisiones comprobados. Mejoras
de estructura y cambios funcionales tienen un alcance propio. [modelo de
entorno][ambiente] orienta la configuración técnica.

## Trabajo con expertos

Cuando tareas independientes justifiquen, use subagentes disponibles y
autorizados: divida contexto, dependencias, archivos exclusivos de escritura y
pruebas esperadas. Integre y compruebe los resultados en el agente principal.
Antes de encaminar la próxima acción sugerida, compruebe la etapa pendiente y
sus evidencias con `proximos-passos`; si no puede verificarlas, informe la
laguna e inspecione. Sin subagentes, trabaje en secuencia e informe los límites;
no presente la propia revisión como independiente. Elija perfiles por necesidad,
sin imponer tecnología: [arquitectura](agents/arquiteto/AGENT.md),
[backend](agents/especialista-backend/AGENT.md),
[frontend](agents/especialista-frontend/AGENT.md),
[QA](agents/engenheiro-qa/AGENT.md),
[seguridad](agents/auditor-seguranca/AGENT.md) e
[rendimiento](agents/analista-performance/AGENT.md). Validación y revisión deben
considerar fallas y escenarios adversos, además del camino de éxito.

## Crear y mantener recursos

Use `criar-recurso`; remite a la skill específica o crea un nuevo tipo. Después
de crear, cambiar, renombrar o eliminar recursos, use `sincronizar-agentes`. Eso
regenera `catalog.json` y los índices auxiliares; no mantenga listas JSON
manualmente. Consulte con `--check` antes de finalizar el cambio. Antes de la
modificación `.mjs`, vete Node/npm el [primer uso][preparo]. Con Node 18+
disponible, use `BOOTSTRAP.mjs --runtime-only` para preparar Node 24+. Sin
Node/npm, instale primero por el mecanismo nativo del SO. `instalar-ferramentas`
usa el flujo completo: prepara el runtime y ejecuta `setup` Para instalar y
verificar las herramientas compatibles. Use Node.js 24+ con npm y órdenes de
[scripts](scripts/README.md). `executar-script` reutiliza las automaciones
`.mjs`, iguales en todos los sistemas. `verificar-trabalho` orienta las pruebas;
cambios web requieren navegador. Cambios en acceso, datos, entradas y
dependencias usan `revisar-seguranca`. O [flujo de
seguridad](commands/auditar-seguranca/COMMAND.md) combina escáneres locales y
análisis de contexto; las skills ya acompañan la instalación del kit. Después de
cualquier implementación, concluya el [orden de revisión][revisao]:
documentación afectada, pruebas por criterio y revisor independiente. El informe
se ignora en `.agent-tests/`; hallazgos y pruebas pendientes impiden concluir.
Consulte [skills externos](external-skills/README.md) antes de reinventar un
procedimiento; he tenido referencias por la tarea, respetando el stack decidido.
`preparar-ferramentas` baixa/atualiza herramientas locales para SO/arquitetura;
cada herramienta tiene `TOOL.json` e `SCRIPT.mjs` en `.pbai4devs/tools/<nome>`.
Elija solamente las herramientas aplicables a la solicitud. Binarios y registros
en `.local/`, caché y launchers son ignorados.

El archivo local `espelhos.conf` registra selección, diseños y puntos nativos.
El catálogo local `catalog.json` reúne inventario y órdenes de las herramientas.
Los registros `skills.json`, `rules.json` e `agents.json` indexan las fuentes.
Codex y Antigravity comparten `.agents`; Kimi usa `.kimi-code`. Los recursos de
proyecto de Copilot se quedan en `.github`. La carpeta `~/.copilot` es personal
y `.vscode` Es opcional para la configuración del editor. Vea los clientes y sus
límites en [compatibilidad](COMPATIBILIDADE.md). Sólo los clientes seleccionados
reciben derivaciones; una carpeta compartida permanece cuando otro cliente
necesita. Actualizar o sincronizar respeta la selección. Sólo los recursos
agênticos tienen apuntamientos; templates, scripts, tools y estado permanecen
exclusivamente en `.pbai4devs`. El kit preserva los ignores existentes, la
configuración Git y el índice. Salidas y apuntamientos pueden quedar visibles;
comprueba el status y use los [modelos de
ignore](templates/gitignore/TEMPLATE.md) Al decidir reglas para el proyecto.
Documentos de producto también quedan fuera de los espejos. La orden
`sincronizar` usa la CLI para revisar y aplicar el plan; `--check` No hay
cambios.

Los [órdenes](commands/README.md) son entradas de los casos de uso: diagnóstico,
preparación local, actualización de herramientas, sincronización y
verificaciones. Para consultas, lea el [orden de
estado](commands/status-roadmap/COMMAND.md). Use el
[revisor](agents/revisor/AGENT.md) para revisión. Links orientan la lectura; el
descubrimiento automático depende de los formatos de cada herramienta.

[ambiente]: templates/ambiente-local/TEMPLATE.md
[preparo]: scripts/preparar-ferramentas/README.md
[revisao]: commands/revisar-entrega/COMMAND.md

[reading-pt]: ../../../.pbai4devs/INSTRUCTIONS.md
[reading-en]: ../../en/kit/INSTRUCTIONS.md
[reading-es]: INSTRUCTIONS.md
