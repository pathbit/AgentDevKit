---
description: "Preservar el ignore del proyecto al instalar AgentDevKit."
language: es
---

# Ignore del proyecto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> Esta spec registra el contrato histórico de la release. La decisión posterior
> es no
> editar `.git/info/exclude` ni crear ni cambiar ignores en la raíz o en los
> clientes.
> Los ignores existentes en el hub también se conservan. La actualización de los
> criterios y su validación están pendientes en
> [roadmap](../../product/roadmap.md).

El archivo `.gitignore` De la raíz pertenece al proyecto. Instalación,
actualización y sincronización preservan sus bytes, permisos y estado en el
índice Git, inclusive cuando un estado antiguo del kit registra ese archivo.

## Criterios de aceptación

- AC-001: El kit no crea, cambia, elimina o desindexa `.gitignore` De la raíz.
- AC-002: Derivados y artefactos locales están protegidos vía
  `.git/info/exclude`.
- AC-003: Conflictos con reglas humanas se informan antes de los cambios; las
  excepciones ambiguas no se consideran seguras sólo por ausencia del archivo.
- AC-004: Sin Git, la instalación informa la espera y orienta a ejecutar la
  sincronización después de `git init` y antes de `git add`.
- AC-005: Los archivos humanos y las configuraciones existentes se conservan.
- AC-006: Instalación y actualización son verificadas en proyectos por el
  paquete.

## Verificación

Las pruebas de exclusión local cubren negaciones, migración, archivos
rastreados, permisos y worktrees. Las pruebas de instalación y compatibilidad
confieren la preservación del proyecto y el comportamiento con y sin Git.

[reading-pt]: ../../../specs/project-ignore/SPEC.md
[reading-en]: ../../../en/specs/project-ignore/SPEC.md
[reading-es]: SPEC.md
