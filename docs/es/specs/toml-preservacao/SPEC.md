---
description: "Preservación de los prompts TOML humanos en órdenes Gemini."
status: rascunho
language: es
---

# Preservación de prompts TOML

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> Borrador histórico. Desde `0.0.36`, el kit deja de crear o renovar
> apuntamientos en `.gemini/`. Las pruebas abajo registran el comportamiento de
> versiones y prototipos anteriores. Na [migración][migration], el kit preserva
> contenido propio y puede retirar solamente la contribución comprobada del kit.

La edición de un comando Gemini debe añadir, actualizar o retirar el bloque
AgentDevKit sin reerializar contenido humano del `prompt`. Este documento
propone un contrato; todavía no aprueba una implementación ni comprueba
compatibilidad.

## Contrato

- Preserve los bytes humanos fuera de los tramos cuya propiedad y alteración
  sean comprobadas, incluso comentarios, claves, BOM, espacios y finales
  LF/CRLF. Preserve también el valor semántico del contenido humano dentro de
  `prompt`.
- Acepte las cuatro formas TOML: básica simple, literal simple, básica
  multilínea y literal multilínea. Modifique sólo spans brutos cuya relación con
  el valor decodificado sea demostrable; valide nuevamente el TOML producido.
  Preserve escapes y continuaciones existentes, sin normalizarlos.
- String literal simple no representa un bloque multilínea con los mismos
  delimitadores. Admita su promoción a literal multilínea sólo cuando los bytes
  del contenido humano se conservan y haya procedencia verificable para la
  reversión. De lo contrario, preserve el archivo e informe el impedimento.
  Recluya también cualquier texto administrado que no sea representable con la
  sintaxis elegida sin reescribir contenido humano.
- Identifique como propiedad del kit solamente el bloque reconocido y las
  alteraciones auxiliares comprobadas, como separadores y delimitadores
  insertados. La procedencia debe ser versionada, limitada, vinculada al bloque
  y no contener copia del texto humano. La candidata utiliza un comentario TOML
  fuera del `prompt`; un hash demuestra consistencia, no autenticación. La
  compatibilidad con versiones antiguas y con el cliente real continúa exigiendo
  pruebas. Vea [formato de órdenes de Gemini][gemini-command].
- Cuando `prompt` No existía, sólo retire la atribución entera si se ha
  comprobado que fue creada por el kit y sigue siendo exclusivamente
  administrado. De lo contrario, preserve la atribución e informe la ambigüedad.
- Preserve ediciones humanas hechas antes o después de la instalación. Si una
  edición toca bloque, delimitadores, separadores o fronteras de modo que su
  posesión no pueda ser comprobada, interrumpa la modificación de este archivo e
  informe el conflicto; no elija una interpretación destructiva.
- Mantenga el sync instalado ejecutable con Node sin depender de `node_modules`
  del proyecto consumidor o caché temporal del paquete. Cualquier parser de
  producción debe acompañar el kit con versión y licencia verificadas; el parser
  independiente de pruebas no comprueba esa distribución.
- A CLI actual extraí el `prompt` los apuntamientos generados suponiendo una
  string JSON en una línea. Preserve esta forma de generación o reemplace la
  extracción por lectura semántica comprobada antes de cambiar el formato
  generado.
- CLI y sync deben producir el mismo bloque para el mismo comando, sin cambiar
  su referencia o los argumentos. Antes del ajuste local, la CLI incluía
  `{{args}}` en el bloque combinado y el sync lo removía; con `{{args}}` en
  prompt humano, a CLI Añadió otra ocurrencia. En una prueba sin modelo, el
  cargador de Gemini reemplazó ambas y duplicó el argumento en el texto
  preparado para el modelo. Preserve los placeholders humanos y evite
  duplicación antes de definir la corrección. Considere también placeholders en
  archivos incluidos por `@{...}`: contar sólo el texto del TOML No comprueba el
  resultado después de la expansión. En una prueba con el cargador Gemini
  0.67.0, una referencia que contiene `{{args}}` El argumento se ha duplicado
  cuando se trata de un argumento. TOML También contenía el marcador. Cuando
  solo el archivo incluido tenía el marcador, permaneció literal y la invocación
  fue añadida al final. La prueba usó filtrado de archivo permisiva y no ejecutó
  modelo o sesión completa.
- Mantenga intactos los bytes del índice Git y los cambios humanos staged y
  unstaged. Para TOML staged, solo permita cambiar si los spans humanos se
  preservan de forma comprobada; en caso contrario, se recuse sin descartar
  contenido.
- Para instalaciones sueltas sin procedencia, preserve la representación actual.
  No invente la sintaxis anterior a la reserialización; mantenga separadores de
  origen desconocido o recuse cuando no sea posible aislar el bloque.
- Considere versiones antiguas CLI y sync: pueden ignorar la procedencia,
  eliminarla o reserializar el prompt. Defina y prueba política de coexistencia
  y downgrade antes de la entrega; no prometa que una traba nueva impida un
  binario antiguo que no la reconoce. Una prueba aislada confirmó que el helper
  público `0.0.21` elimina los metadados del prototipo y normaliza la
  representación; la implementación experimental entonces rechaza retirarlo sin
  nueva evidencia. Esa prueba no ejecuta el flujo completo de la CLI o sync.

Como cobertura mínima, adición, actualización y eliminación deben funcionar para
prompts simples en cada una de las cuatro formas de string, además de `prompt`
ausente, con LF, CRLF y BOM. La denegación de casos ambiguos o no representables
no sustituye esa cobertura; el archivo preservado es el estado inmediatamente
anterior a la operación rechazada. [mapa de integración](INTEGRACAO.md) detalla
los puntos de estado y las pruebas aún pendientes.

## Criterios de aceptación

1. **AC-001:** En las cuatro formas soportadas, añadir y retirar un bloque sin
   edición humana intermedia restaura el archivo original byte a byte,
   incluyendo delimitadores, BOM, CRLF/LF, espacios y comentarios. Donde no sea
   posible, la operación se rechaza y el archivo original permanece intacto.
2. **AC-002:** Añadir y actualizar mantienen el valor humano de prompt; un
   segundo update es idempotente. La eliminación sólo retira bytes de propiedad
   comprobada y preserva ediciones humanas no ambiguas. Edits ambiguos se
   niegan.
3. **AC-003:** Fixtures cubre `prompt` ausente y presente, texto vacío, escapes
   Unicode, barras, continuaciones multilínea, aspas en el contenido y cierres
   con tres a cinco aspas; también cubren marcadores duplicados, inválidos o
   modificados y UTF-8 no válido. Cada caso tiene resultado y límite explícitos.
4. **AC-004:** CLI y sync directo aplican el mismo contrato. Pruebas con índice
   staged y alteraciones unstaged confieren bytes humanos e índice antes y
   después, inclusive en remoción e intercambio de agentes. `init` → `sync` →
   `update` y el orden inverso, con y sin `{{args}}` humano y bloques legados.
   Conflicto TOML identificado en la planificación bloquea toda la aplicación
   antes de escritura pública, incluso estado y derivados. Las fallas
   posteriores siguen los límites de recuperación vigentes.
5. **AC-005:** Legado sin procedencia preserva la representación corriente o se
   niega; downgrade y coexistencia son probados sin atribuir garantías a
   versiones que ignoran la nueva política. Caminos y estado no son migrados
   silenciosamente.
6. **AC-006:** La validez y el valor semántico del TOML producido también se
   verifican con parser TOML independiente disponible en el entorno de prueba;
   si no está disponible, esa verificación permanece no verificada. Pruebas de
   código se vensionados; resultados y fixtures se encuentran en área ignorada o
   temporal. Prueba el paquete real y sync instalado en proyecto sin
   `node_modules` o `package.json`.

## Fases propuestas

1. Definir spans brutos y procedencia, representación para las cuatro formas,
   transición de estado y política conservadora de legado y versiones mixtas.
2. Implementar edición y remoción con negativa segura, integrando CLI y sync y
   preservando el contrato de staged. Mantener formatos legados legibles.
3. Ejecutar la matriz de pruebas en plataformas disponibles, validación
   independiente y revisión de diff; registrar por separado fallos y casos no
   verificados antes de cualquier publicación.

La prueba versionada `node tests/toml-preservation-proof.mjs` registró 40
diferencias en la implementación anterior. Después de la integración local, los
mismos 40 casos pasaron en macOS con restauración de los bytes; esa prueba
sintética no usa parser independiente ni cliente real. Un paquete experimental
anterior separado, con parser autocontido y licencia BSD-3-Clause pasó init,
update y sync en proyecto sin `node_modules`, en macOS y Linux; en otra fixture,
el sync preservó TOML staged y volvió conflicto en los dos sistemas. Un ajuste
aislado que alinea el bloque del sync al de CLI eliminó este conflicto en una
fixture macOS sin modificar el índice. No resuelve la duplicación de `{{args}}`
ni comprueba actualizaciones reales de archivos staged. No es una release ni
comprueba los demás casos. Estas observaciones no encierran los criterios de
aceptación.

En cuatro proyectos sintéticos, la CLI publicada `0.0.21` Añadió y retiró el
bloque al alterar la selección de clientes, pero dejó tres quiebras de línea
extras en el valor de cada prompt. El cargador Gemini aceptó las etapas y un
parser independiente confirmó la diferencia; no hubo inferencia. El índice, el
`.gitignore`, o README y las notas humanas se han conservado, mientras que se
han conservado los billetes. TOML cambió y lo cambió `info/exclude` recibió un
aumento. La prueba no cubre todos los tipos TOML. El mismo ciclo fue repetido en
Linux ARM64, sin red, con cuatro fixtures y parser independiente: las tres
quiebras extras y el aumento al `info/exclude` Han vuelto a ocurrir. Esa
repetición no ejecutó el cargador Gemini o modelo.

## Límites

La comparación y la edición no hacen una secuencia de operaciones atómica ni
impiden el intercambio concurrente de archivo o ancestral. La sintaxis anterior
ya reescrita por versiones antiguas no puede ser reconstruida sin evidencia. La
seguridad de rollback, permisos, ACLs y recuperación después de la interrupción
pertenece a la spec de recuperación conservadora y no está comprobada por este
contrato de TOML.

[gemini-command]: https://geminicli.com/docs/cli/custom-commands/
[migration]: ../../guides/installation.md#actualizar-y-elegir-agentes

[reading-pt]: ../../../specs/toml-preservacao/SPEC.md
[reading-en]: ../../../en/specs/toml-preservacao/SPEC.md
[reading-es]: SPEC.md
