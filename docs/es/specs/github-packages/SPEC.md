---
description: "Publicación del paquete único en el registro npm de GitHub."
status: aprovado
language: es
---

# Paquete npm en GitHub Packages

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Publicar `@pathbit/agentdevkit` en GitHub Packages, vinculado a este
repositorio, para instalación con `npx`. Escopo confirmado por el usuario en
esta solicitud. O [PRD](../../product/prd.md), o
[diseño](../../product/design.md) e a [UX CLI](../../product/ux-ui.md) ya
definen el producto. Este incremento es un nuevo canal de distribución del
paquete existente, sin cambio de la interfaz de la CLI.

## Contrato

- Un paquete npm con CLIskills y recursos compartidos.
- Publicar el tarball aprobado del CI, preservando origen, versión y bytes.
- Usar `GITHUB_TOKEN` de Actions con permiso de escritura de paquetes.
- Incluir publicación en las releases futuras y permitir añadir una etiqueta
  existente al registro sin recrear su release.
- Conferir la integridad de la versión en el registro; versiones con otros bytes
  son conflictos. Una repetición con bytes iguales es segura.
- Prueba de instalación de CLI a partir del registro, con placa del workflow.
- Documentar que GitHub Packages requiere autenticación incluso para paquetes
  npm públicos; no versionar credenciales ni cambiar el inicio local del
  usuario.

No separar componentes en múltiples paquetes, no crear un registro npmjs y no
modificar etiquetas publicadas. Dependencia: [v0.0.3](../v0.0.3/SPEC.md).

## Criterios de aceptación

| ID | Salida | Prueba |
| --- | --- | --- |
| AC-001 | Paquete único con registro y repositorio definidos. | Metadados. |
| AC-002 | Publica el artifact aprobado, sin repack. | Pruebas y workflow. |
| AC-003 | Repetición y conflictos tratados por integridad. | Pruebas negativas. |
| AC-004 | CLI instalada por el registro ejecuta correctamente. | Actions real. |
| AC-005 | Login, npx, límites y mantenimiento documentados. | Lint y revisión. |

Evidencias en `.agent-tests/github-packages/`, fuera de Git. La publicación de
la versión 0.0.3 Utiliza el artefacto de su etiqueta existente; futuras
versiones siguen el CI.

[Specs](../README.md) · [Roadmap](../../product/roadmap.md)

[reading-pt]: ../../../specs/github-packages/SPEC.md
[reading-en]: ../../../en/specs/github-packages/SPEC.md
[reading-es]: SPEC.md
