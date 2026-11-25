---
description: "Paquete nombrado como forma de instalación y actualización."
status: aprovado
version: 0.0.5
language: es
---

# Instalación por registro

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Instalar el paquete publicado en el npm público por nombre y versión, sin
iniciar sesión. El usuario eligió este canal para instalarlo con `npx`, sin
bajar la release.

Dependencias: [publicación en GitHub Packages](../github-packages/SPEC.md),
[estructura estándar](../v0.0.4/SPEC.md), [PRD](../../product/prd.md) e
[diseño](../../product/design.md). Cambio solicitado y ejecución autorizada.

## Contrato

- CLI, notas y guías usan `npx` con nombre, versión y registro del paquete.
- No requiere iniciar sesión para instalar y conectar la página pública del
  paquete.
- Mantener el TGZ como artefacto técnico aprobado, con checksum y procedencia.
- Después de publicar, instalar por el registro en proyecto temporal y probar
  versión, `init`, `doctor` e `sync --check` En caché nuevo, sin credenciales.
- Priorizar el secreto `NPMJS_TOKEN`, mapeado para `NPM_TOKEN` en la
  publicación; usar OIDC Cuando esté ausente. Autenticación es solo para el
  mantenedor.
- Preservar credenciales fuera de Git, archivos humanos y versiones anteriores.

## Criterios de aceptación

| ID | Salida | Prueba |
| --- | --- | --- |
| AC-001 | CLI sugiere un paquete designado en todos los sistemas. | Pruebas y salida. |
| AC-002 | Notas y guías usan el registro y apuntan el paquete. | Lint y revisión. |
| AC-003 | Publicación valida al consumidor y rechaza fallas. | Pruebas negativas. |
| AC-004 | Paquete instala el npm público sin iniciar sesión. | Actions real. |
| AC-005 | Se conservan versiones y datos anteriores. | Distribución y Git. |

Evidencias en `.agent-tests/registry-installation/`. A CLI y los archivos son el
alcance; no hay interfaz web o desktop para validar en este cambio.

[Specs](../README.md) · [Paquete npm](../../maintainers/packages.md)

[reading-pt]: ../../../specs/v0.0.5/SPEC.md
[reading-en]: ../../../en/specs/v0.0.5/SPEC.md
[reading-es]: SPEC.md
