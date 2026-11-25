---
description: "Descubrimiento y documentación del comportamiento de un sistema existente."
status: rascunho
language: es
---

# Documentar un sistema legado

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El equipo necesita recuperar conocimiento del código y de las pruebas y
registrar el resultado en los documentos que ya usa. El objetivo inicial decide
si vale mapear comportamiento, preparar el ambiente o planificar una evolución.

## Criterios de aceptación

- **AC-001** La pregunta inicial y la opción explícita encaminan el propósito de
  documentación. `next --intent document` indica el levantamiento y, cuando
  instalado, la skill responsable. Ejecución no interactiva continúa posible.
- **AC-002** A CLI genera un borrador en Markdown y datos en JSON Antes o
  después de instalar el kit. Registra evidencias y lagunas dentro de límites de
  búsqueda. Preserva el código, los documentos y el estado Git. Respeta la
  recuperación.
- **AC-003** La skill, el comando y el perfil documentador reutilizan documentos
  y modelos nativos. Un flujo legado se documenta con referencias cruzadas entre
  comportamiento, código y pruebas. Inferencias se identifican.
- **AC-004** El paquete pasa por la revisión de recursos, pruebas de la CLI,
  ensayos en proyectos existentes y nuevos y verificación de distribución.

[reading-pt]: ../../../specs/documentacao-legado/SPEC.md
[reading-en]: ../../../en/specs/documentacao-legado/SPEC.md
[reading-es]: SPEC.md
