---
description: "Jornadas y comunicación de la interfaz de línea de mando."
status: aprovado
language: es
---

# UX CLI

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El producto usa una CLI; no hay interfaz web o desktop en esta entrega. La
experiencia prioriza órdenes cortas, resultados legibles y continuidad.

| Jornadas | Respuesta esperada |
| --- | --- |
| Primer uso | Idioma, clientes y objetivo, con resumen y próxima etapa. |
| Proyecto existente | Cambios propuestos y preservación de los archivos propios. |
| Actualización | Lo que cambió, conflitos/backups y cómo comprobar el resultado. |
| Complementos | Catálogo y origen antes de decidir qué preparar. |
| Diagnóstico | Pendencias observadas y próximas órdenes o skills. |
| Automatización | JSON único y código de salida, sin depender del texto traducido. |

PT es estándar. EN y ES alteran la interfaz y los próximos pasos, manteniendo
nombres de órdenes y caminos. El idioma salvo es reutilizado en las próximas
ejecuciones. Mensajes distingue confirmación, aviso y fallo sin afirmar pruebas
no realizadas.

El asistente del primer uso reúne idioma, agentes y objetivo. Quien pasa idioma
y clientes en CLI Puede elegir el objetivo con `--purpose`. Agentes en
aplicaciones pueden reunir las opciones por chat y usar `--json` Para obtener la
siguiente acción. La simulación lista cambios y conflictos en el plano.

`doctor` responde sobre la instalación del kit. `next` orienta el trabajo del
proyecto, inclusive la etapa de documentación con `next --intent document`.
`document` reúne el inventario en Markdown o JSON. Conflictos piden comparación
de archivos antes de una sustitución. Vea [CLI](../guides/cli.md) e
[recuperación](../guides/troubleshooting.md) para el comportamiento observable.

La orden `agents` consulta la selección sin escribir archivos. Su cambio permite
simular el plan antes de eliminar los apuntes generados. `agents add` e `agents
remove` Solo cambian los IDs indicados. `none` es la opción inicial sin elección
explícita o salva y mantiene los recursos compartidos. Carpetas con archivos
propios continúan en el proyecto. [Selección de clientes][clients]

El usuario puede consultar `plugins list` e `plugins info <id>` antes de la
instalación. Después del `init`, `plugins install <id>` e `plugins check <id>`
preparan y confieren sólo el elemento elegido. [Guía de complementos][plugins]

Escopo autorizado junto al [PRD](prd.md). Pruebas verifican las jornadas reales;
la aprobación del diseño no sustituye las evidencias de funcionamiento.

[Wiki](../README.md) · [Flujo de uso](../guides/workflow.md)

[clients]: ../guides/installation.md#actualizar-y-elegir-agentes
[plugins]: ../guides/plugins.md

[reading-pt]: ../../product/ux-ui.md
[reading-en]: ../../en/product/ux-ui.md
[reading-es]: ux-ui.md
