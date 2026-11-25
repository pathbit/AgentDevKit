---
description: "Inventario solamente lectura de la estructura y documentación del proyecto."
language: es
---

# Inspeccionar proyecto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

O JSON identifica tecnología, órdenes, estructura y documentos existentes.
`documentation.files` mantiene caminos y caja, papel probable, tamaño y hash
cuando la lectura couber en los límites. Referencias válidas del estado aparecen
en `configured`; nombres sugieren papeles, pero no comprueban contenido o
aprobación. En la madurez, el roadmap y las specs son consultados en los caminos
configurados; status son declaraciones y un vínculo local no comprueba
aprobación o revisión. Una lista de specs ambigua o incompleta no permite elegir
un incremento; el estado del vínculo en el roadmap también es sólo una
indicación para consulta. El inventario de specs lee como máximo 200 entradas
por carpeta, 500 entradas en total, 1 MiB por spec y 16 MiB de specs en total.
Si un límite es excedido, se detecta un cambio en una carpeta o spec durante la
lectura o un camino no puede ser verificado, la lista es descartada y marcada
incompleta. La detección utiliza identidad y metadatos del sistema de archivos;
no es atómica y no garantiza detectar todas las alteraciones simultáneas o
revertidas durante la inspección.

Los enlaces simbólicos aparecen como opacos, sin leer sus destinos. Contenido de
los documentos y valores de configuración no aparecen en el informe. `scan` e
`warnings` informan límites y lectura incompleta; `scan.complete` resume estas
condiciones. Una carpeta simbólica como `docs` También aparece, sin presumir que
esté vacía. Links no clasificados reciben `role: unclassified`; mientras exista
una frontera no inspeccionada, `scan.complete` será falso. No use inventario
incompleto como prueba de ausencia de documentos. El inspector revalida la
identidad de los caminos durante la lectura; esto detecta cambios, pero no es
una garantía atómica contra todo cambio simultáneo.

`exclusions` describe carpetas de clientes, artefactos y cachés fuera del
inventario. Documentos humanos en `.github`, ejemplos, wiki y RFCs se incluyen.
El inventario excluye los indicadores generados en `.github/skills`, agentes y
órdenes, además de directorios de clientes como `.zcode` y de configuración como
`.copilot`.

El script no crea ni altera archivos. Lea los documentos relevantes antes de
planificar complementos; preserve su estructura y utilice plantillas para
vacíos. `--check` confiere la estructura técnica y las raíces de agentes
declaradas en el manifiesto. El manifiesto canónico con apenas el encabezado
identifica la selección `none` y dispensa carpetas de clientes. Sin manifiesto,
el chequeo conserva las raíces estándar para el diseño anterior. La carpeta
`.vscode/` depende de la adopción del editor. Una entrada de ignore para ella,
por sí sola, no exige que exista. `--root` Sólo acepta las fixtures documentadas
por el propio comando, sin ampliar el acceso a otros proyectos.

[reading-pt]: ../../../../../.pbai4devs/scripts/inspecionar-projeto/README.md
[reading-en]: ../../../../en/kit/scripts/inspecionar-projeto/README.md
[reading-es]: README.md
