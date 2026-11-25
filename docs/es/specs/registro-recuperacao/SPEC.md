---
description: "Validación conservadora de registros imutables de recuperación."
status: aprovado
language: es
---

# Registro de recuperación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Primer componente de [recuperación
conservadora](../recuperacao-conservadora/SPEC.md). Este incremento es una
función pura: no lee o escribe archivos, no altera la instalación o sync y
todavía no protege proyectos. La autorización general del usuario cubre el
incremento; el contrato histórico de rollback permanece sin cambios.
[PRD](../../product/prd.md), a [UX](../../product/ux-ui.md), o
[diseño](../../product/design.md) e o [roadmap](../../product/roadmap.md) Siguen
siendo válidos.

## Contrato

Recibir registros como pares de nombre y bytes, ya obtenidos por un llamador.
Aceptar solamente nombres canónicos `<geração de 12 dígitos>.<tipo>.json`,
comenzando en la generación 1, y los tipos `claim`, `begin`, `done` e
`resolved`. Cada registro es JSON canónico UTF-8, sin espacios y terminado por
una ruptura de línea. Las llaves aparecen en el orden `version`, `generation`,
`id`, `kind`, seguidas de las claves abajo; no se aceptan campos extras. La
versión es `1` y el ID es UUID v4 minúscula.

| Tipo | Claves adicionales en el orden |
| --- | --- |
| `claim` | `previous`: `null` o hash de la terminal anterior. |
| `begin` | `claim` e `manifest`: hashes hexadecimais minúsculos. |
| `done` | `begin`: SHA-256 de bytes `begin`. |
| `resolved` | `claim`: hash; `begin`: hash `null`. |

`claim.previous` é `null` En la primera generación. `begin` apunta a los hashes
del `claim` y del manifiesto; `done` al hash de bytes `begin`; `resolved` a los
hashes de `claim` y de `begin`o `null` Cuando no existe esta generación, cada
generación debe tener ID propio y `claim`; `done` exige `begin`; `done` e
`resolved` son mutuamente exclusivos. Generaciones anteriores deben estar
terminadas o resueltas. Sin terminal, la última generación está pendiente. Sin
registros, está lista. Cualquier error, nombre desconocido, duplicado,
truncamiento, JSON no canónico, hash inconsistente, secuencia incompleta o
límite excedido retorna `invalid`. No imprimir datos de los registros. Limitar
tamaño por registro y total de entradas (4.000), 4.096 bytes por registro y 1
MiB en total; aceptar solamente bytes y nombres explícitos, sin memoria
compartida. `ready` retornado `generation` e `head` (hash de terminal o `null`
para lista vacía); cuando hay registros, también retorna `terminal` e
`resolvedCount`. `pending` retornado `generation`, `id` e `phase`; `invalid`
retornado `reason` con código fijo. La salida no reproduce bytes o campos
arbitrarios del contenido recibido.

La entrada debe ser un array común del mismo contexto JavaScript, sin iterador
propio o vacíos. Cada entrada debe tener propiedades propias de datos `name` e
`bytes`, sin getters o proxies; los bytes deben ser `Uint8Array` o `Buffer`,
inclusive subclases, con `ArrayBuffer` no compartido. Entradas rechazadas no
ejecutan getters o iteradores suministrados por el llamador.

`ready` Sólo significa que la lista recibida es coherente y no contiene
operación pendiente. Una lista vacía o con una cola omitida no comprueba que el
diario en disco esté vacío o completo; el encuadramiento no impide la
manipulación. Un llamador futuro debe comprobar su lectura y tratar cualquier
estado diferente de `ready` como bloqueo. El formato no distingue el motivo
humano de una resolución y no permite ignorar el plan o el contenido actual del
proyecto.

SHA-256 detecta divergencia, no impide la manipulación por quién escribe el
diario. Esta función no valida archivos, enlaces, permisos, copia de seguridad o
durabilidad. El protocolo futuro necesita lectura segura, publicación exclusiva,
tratamiento de fallos e integración antes de cualquier garantía. [documentación
de Node](https://nodejs.org/api/fs.html#file-system-flags) informa que
exclusividad puede no funcionar en sistemas de archivos de red. Antes de la
integración, definir vínculo al proyecto y retención segura: un diario legítimo
puede alcanzar los límites y, hoy, pasaría a ser rechazado. No hay compactación
o limpieza automática en este componente.

## Criterios de aceptación

- **AC-001:** Pruebas de vacío, pendientes, terminada, resuelta y múltiples
  generaciones validan los estados y no alteran los bytes suministrados.
- **AC-002:** Pruebas rechazan duplicaciones, agujeros, transiciones inválidas,
  versiones y nombres desconocidos, datos truncados y hashes divergentes.
- **AC-003:** Límites, UTF-8 no válido, JSON con campos duplicados o extras y
  formatos no canónicos fallan de forma conservadora sin imprimir contenido.
- **AC-004:** Las mismas pruebas pasan en macOS y Linux; Windows es registrado
  como no verificado hasta una ejecución real. Ninguna integración es alegada.
- **AC-005:** En tres rondas, 16 procesos disputan una creación exclusiva; sólo
  uno gana en cada ronda en el sistema probado. Esto no prueba exclusiva en
  sistemas de archivos de red o garantiza la integración futura.

Ejecute `node --test tests/recovery-records.test.mjs
tests/recovery-exclusive.test.mjs` con Node 24+. Salve logs en
`.agent-tests/registro-recuperacao/`. Pruebas, spec y código son versionables;
resultados y fixtures quedan fuera de Git. La release depende de la integración,
revisión y pruebas completas, inclusive de los test estrictos de rollback.

[reading-pt]: ../../../specs/registro-recuperacao/SPEC.md
[reading-en]: ../../../en/specs/registro-recuperacao/SPEC.md
[reading-es]: SPEC.md
