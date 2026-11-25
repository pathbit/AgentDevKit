---
description: "Cómo usar los recursos de AgentDevKit en el desarrollo de software."
language: es
---

# Recursos en práctica

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit organiza el trabajo de desarrollo de software con agentes que usted
elige. El kit reúne instrucciones y herramientas; decisiones de producto,
revisión humana y pruebas continúan necesarios en el proyecto atendido.

## ¿Qué recurso usar?

Consulte el [guía instalado][start] Para elegir por intención. Él apunta a la
orden que recibe la solicitud e informa lo que debe salir de cada etapa. Si el
cliente no muestra una orden o perfil, pida al agente que lea la fuente en
`.pbai4devs` y seguir las instrucciones pertinentes a la solicitud.

| Recurso | Para qué sirve | Ejemplo concreto |
| --- | --- | --- |
| [Skill][skills] | Orienta decisiones y pasos de una tarea recurrente. | [Crear una spec][spec] con dudas y criterios. |
| [Orden][commands] | Da entrada a un caso de uso y encamina el trabajo. | [Validar entrega][validar] con pruebas. |
| [Agente][agents] | Establece responsabilidades y límites de un papel. | [Revisor][reviewer] examina el cambio en lectura. |
| [Regla][rules] | Registra un convenio aplicable a un contexto. | [Calidad][quality] orienta los cuidados de la entrega. |
| [Template][templates] | Ofrece una estructura para registrar decisiones. | Rellenar [spec][spec-template] de un incremento. |
| [Script][scripts] | Ejecuta una automatización reutilizable. | [Sincronizar][sync] los apuntamientos. |
| [Herramienta][tools] | Proporciona una capacidad técnica verificable. | [agent-browser][browser] ejercita una interfaz web. |
| [Pruebas y evidencias][tests] | Comprueban comportamiento y registran resultados. | Versionar la prueba y mantener un informe local. |

Los enlaces llevan a las fuentes y catálogos. Una instrucción en Markdown no
inicia un proceso sola; el cliente de IA decide cómo descubrir y ejecutar
recursos conforme a sus capacidades y permisos. Consulte [compatibilidad por
cliente][compat] Antes de depender de un acceso rápido.

## Cómo se conectan las etapas

Utilice la siguiente secuencia para una entrega de producto. Si el objetivo
inmediato es girar o documentar un sistema existente, utilice los caminos
específicos al final de esta sección.

1. Use [proximospasos][next] Para identificar la fase y las pendencias.
2. Definir producto, experiencia cuando sea aplicable y diseño técnico con el
   usuario. [templates][templates] Son puntos de partida, no decisiones listas.
3. Use [crearspec][spec] para registrar límites y aceptados. Em [planificar
   entrega][plan], pase el objetivo o la spec al planificador. Devuelve dudas,
   alcance, tareas y pruebas para aprobación.
4. Pase spec y plan aprobados [implementar-entrega][implement]. El perfil
   [implementador][developer] devuelve diff, aceptados, órdenes y pruebas
   iniciales.
5. Pase estos materiales a [validar entrega][validar]. El validador usa skill
   [verificar trabajo][verify] y herramientas del proyecto. Para web, use
   navegador real. Para escritorio, abra la aplicación. Regístrate la prueba y
   el estado de cada criterio.
6. Entregue diff, decisiones de documentación y pruebas [revisar
   entrega][review]. El revisor evalúa el estado final en lectura, y el
   responsable registra la decisión con el script de revisión. El equipo decide
   cuándo integrar.

Cuando haya trabajo independiente, el agente principal puede distribuirlo entre
los [expertos][specialists] disponibles, con responsables de archivos,
dependencias y pruebas. Si el cliente no ofrece subagentes, el trabajo sigue en
secuencia y la ausencia de revisión independiente queda explícita.

Elija pruebas por el alcance: contratos, validación y datos en el backend;
interacción, accesibilidad, estados de error y navegador o desktop en el
frontend. QA incluye casos de límite y fallo; seguridad considera amenazas y
permisos; performance compara mediciones con objetivos y carga definidas.
Regístra ambiente, órdenes y resultados por criterio, incluso fallas y
verificaciones no ejecutadas.

Para **Rotar un proyecto existente**, consulte la etapa actual con `npx
@pathbit/agentdevkit next --intent run --target .`, usando la versión y el
registro escogido en [instalación][install]. [Diagnosticar][diagnose] inventaría
ambiente y proyecto, y [preparar dev][prepare] usa este inventario cuando la
solicitud incluye ajustes. Entregue las órdenes para subir, verificar y detener
la aplicación.

Para **documentar un sistema en uso**, comience con `npx @pathbit/agentdevkit
document --markdown`. A CLI ofrece un borrador de inventario. La orden
[documentarlegado][legado] orienta el documentador a seguir los flujos
relevantes en el código y en las pruebas y entregar hechos, inferencias y
lagunas con sus fuentes. El trabajo de edición reaprovecha los documentos
existentes. [Guía de
documentación](documentation.md#documentar-un-sistema-en-uso)

Cuando la tarea depende de una spec o un plan existente, la skill
[proximospasos](../kit/skills/projeto/proximos-passos/SKILL.md) usa
las indicaciones de `next --integrations` Para encontrar referencias en el
proyecto. Consulte [cuando uses otros métodos](comparacao.md).

Para **auditar seguridad**, [Auditar aseguranca][audit] recolección o
reprobación el informe local, y el perfil auditor usa [revisar
seguros][security] Para interpretarlo en el contexto. Herramientas o bases
ausentes entran en la cobertura pendiente. La corrección tiene su propio flujo y
alcance.

Para **evolucionar el kit**, localice el recurso por [guía de
recursos][resources]. Después de cambiar la fuente, use
[Sincronizar][sync-command] para aplicar y conferir los apuntamientos y
[verificar agentes][verify-agents] Para validar fuentes, herramientas y pruebas.

## ¿Dónde están los archivos?

`.pbai4devs/` contiene las fuentes compartidas. Carpetas como `.claude/` o
`.codex/` reciben sólo los recursos de integración de los clientes
seleccionados; los archivos humanos existentes siguen perteneciendo al proyecto.
La selección puede ser consultada o alterada por la [CLI][cli].

El código de las pruebas y las fixtures necesarias son versionables. Informes,
capturas, descargas y resultados locales quedan fuera de la contracción.
`.gitignore` De la raíz pertenece al proyecto; el kit preserva las reglas Git
existentes e informa archivos que pueden estar visibles. Consulte el estado y
las reglas de ignore antes de añadir archivos al índice. Vea
[instalación][install] e [herramientas y pruebas][tests].

Para crear o cambiar un recurso, use el [guía de recursos][resources] y luego
sincronía y compruebe los puntos de vista. Para dudas de operación, consulte
[solución de problemas](troubleshooting.md).

[skills]: ../kit/skills/README.md
[start]: ../kit/INSTRUCTIONS.md
[commands]: ../kit/commands/README.md
[agents]: ../kit/agents/README.md
[rules]: ../kit/rules/README.md
[templates]: ../kit/templates/README.md
[scripts]: ../kit/scripts/README.md
[tools]: ../kit/tools/README.md
[spec]: ../kit/skills/specs/criar-spec/SKILL.md
[spec-template]: ../kit/templates/spec/TEMPLATE.md
[validar]: ../kit/commands/validar-entrega/COMMAND.md
[reviewer]: ../kit/agents/revisor/AGENT.md
[developer]: ../kit/agents/implementador/AGENT.md
[quality]: ../kit/rules/qualidade/RULE.md
[sync]: ../kit/scripts/sincronizar-agentes/README.md
[browser]: ../kit/tools/agent-browser/README.md
[tests]: tools-and-testing.md
[compat]: ../kit/COMPATIBILIDADE.md
[next]: ../kit/skills/projeto/proximos-passos/SKILL.md
[legado]: ../kit/commands/documentar-legado/COMMAND.md
[implement]: ../kit/commands/implementar-entrega/COMMAND.md
[plan]: ../kit/commands/planejar-entrega/COMMAND.md
[verify]: ../kit/skills/projeto/verificar-trabalho/SKILL.md
[diagnose]: ../kit/commands/diagnosticar/COMMAND.md
[prepare]: ../kit/commands/preparar-dev/COMMAND.md
[audit]: ../kit/commands/auditar-seguranca/COMMAND.md
[security]: ../kit/skills/seguranca/revisar-seguranca/SKILL.md
[sync-command]: ../kit/commands/sincronizar/COMMAND.md
[verify-agents]: ../kit/commands/verificar-agentes/COMMAND.md
[review]: ../kit/commands/revisar-entrega/COMMAND.md
[install]: installation.md
[cli]: cli.md
[resources]: resources.md
[specialists]: resources.md#expertos-y-colaboraci%C3%B3n

[reading-pt]: ../../guides/recursos-na-pratica.md
[reading-en]: ../../en/guides/recursos-na-pratica.md
[reading-es]: recursos-na-pratica.md
