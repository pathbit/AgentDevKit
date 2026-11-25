---
description: "Evoluir documentos existentes y crear solamente lo que falta."
language: es
---

# Documentación sin perder el contexto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use `document` Para empezar un levantamiento de sistema y
`atualizar-documentacao` para revisar los documentos afectados por una entrega.
El agente utiliza el inventario como punto de partida para leer las fuentes y
proponer complementos en los caminos autorizados.

## Documentar un sistema en uso

Consulte el inventario directo en la raíz del proyecto, incluso antes de
instalar el kit. Use `--json` para automatización y `--markdown` Para obtener un
borrador.

```console
npx @pathbit/agentdevkit document
npx @pathbit/agentdevkit document --markdown
```

La consulta local reúne manifiestos, nombres de scripts, muestras de fuentes y
pruebas, infraestructura y documentos. Utilice el resultado para elegir módulos
y flujos a leer. Con el kit instalado, `next --intent document` encaminada a
[skill documentar-legado][legado].

En cada flujo relevante, parta de una entrada de código, siga los efectos y
compruebe las pruebas. Cite archivo, línea, símbolo o prueba para los hechos.
Explique qué evidencias sustentan cada inferencia y cuál fuente puede responder
a las preguntas pendientes. Julgue lo que una lectura estática sostiene y
registre resultados de ejecución solo cuando realmente verificados.

Use el [modelo de levantamiento][levantamento] para consolidar el análisis. Para
cambios autorizados, complemente los documentos existentes con
`atualizar-documentacao`. Use diseño, ADR o SPEC Cuando necesite documentar,
respectivamente, la arquitectura, una decisión estructural o un incremento, el
levantamiento sigue en borrador hasta la revisión de los hechos y las lagunas.

## Comenzar por lo que existe

Después de instalar el kit, pida a su agente:

```text
Use atualizar-documentacao. Primeiro inventarie e leia os documentos existentes.
Proponha complementos por arquivo, preservando conteúdo, nomes e decisões.
Organize por índices e links; crie apenas documentos que realmente faltam.
```

El inventario se puede consultar en la raíz del proyecto:

```console
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

No JSON del inspector, `documentation.files` lista documentos y sus papeles
probables, y `documentation.scan` informa los límites de la búsqueda. Lea los
archivos antes de usar sus papeles para decidir. Si `ARCHITECTURE.md` Ya
describe el diseño del sistema, mantenga ese camino.

## Planificar complemento

| Situación | Acción |
| --- | --- |
| Documento ya suficiente | Mantener y registrar ausencia de impacto. |
| Falta información comprobada | Añadir a la sección apropiada. |
| Documentos difíciles de encontrar | Crear o completar índices y enlaces. |
| Documento necesario no existe | Combinar el camino y crear solo lo necesario. |
| Decisión no encontrada o contradictoria | Preguntar antes de escribir. |

Las plantillas ayudan a identificar lagunas. No reemplazan documentos
existentes. Preserve sus secciones, anclas, hechos y decisiones; repetir el
flujo no debe duplicar contenido. No mueva ni excluye archivos para
estandarizar.

## Proyecto nuevo o existente

En un proyecto existente, aproveche README, guías, ADRs y documentos de
producto. Preparar el entorno o mejorar la documentación no requiere reiniciar
el producto.

En un proyecto nuevo, descubre producto y experiencia antes de la arquitectura y
specs. Mientras el objetivo es configurar agentes, mantenga los modelos sin
inventar PRD, tecnología o aprobación. Siga el [flujo de trabajo](workflow.md).

## Conferir el resultado

Revise diff y los enlaces. Compruebe que el contenido anterior se ha conservado,
que archivos fuera del plan no han cambiado y que no han surgido decisiones
inventadas. Use `verificar-trabalho` e `revisar-entrega`; salve las pruebas en
`.agent-tests/`.

[Wiki](../README.md) · [Skill compartida][skill] · [Pruebas][tests]

[skill]: ../kit/skills/projeto/atualizar-documentacao/SKILL.md
[legado]: ../kit/skills/projeto/documentar-legado/SKILL.md
[levantamento]: ../kit/templates/levantamento-legado/TEMPLATE.md
[tests]: ../tests/README.md

[reading-pt]: ../../guides/documentation.md
[reading-en]: ../../en/guides/documentation.md
[reading-es]: documentation.md
