---
description: "Publicación de la documentación de instalación y de la distribución en los dos registros."
status: aprovado
version: 0.0.10
language: es
---

# Publicar y verificar los dos caminos de instalación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Publicar la versión 0.0.10 con guías de prerrequisitos e instalación ya
aprobados. Ofrecer los mismos bytes en npm y GitHub Packages y probar el consumo
de la versión publicada en los dos destinos.

## Contrato

- Mantener npm público sin iniciar sesión y GitHub Packages con autenticación
  propia.
- Usar solamente el artefacto aprobado por el CI del commit de la tag.
- Conferir versión, integridad, visibilidad pública y asociación al repositorio.
- Incluir las dos órdenes de instalación en README, guías y notas de la release.
- Preservar versiones anteriores, archivos humanos y configuraciones existentes.
- Guardar descargas y evidencias en directorios ignorados.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Versión, lockfile, changelog, guías y notas coherentes con 0.0.10. |
| AC-002 | CI aprobado en los cuatro perfiles y tag en el commit verificado. |
| AC-003 | Versión 0.0.10 público en los dos registries, con bytes iguales al CI. |
| AC-004 | Versión, init, doctor y sync --check Pasan en los dos registries. |
| AC-005 | Licencia y guías incluidos, sin artefactos locales o credenciales. |

## Validación

Testar generación de las notas y distribución local. Después del CI, publicar la
etiqueta, descargar el artefacto original y comparar los checksums de la release
y de los registries. Usar cachés y proyectos nuevos: npm sin credenciales;
GitHub con token exclusivo. Conferir `latest`, README público, licencia y los
cuatro comandos de CLI.

Los instaladores nativos de los sistemas están documentados con fuentes
oficiales; esta release no afirma volver a instalarlos en máquinas que ya tienen
los requisitos previos.

[reading-pt]: ../../../specs/v0.0.10/SPEC.md
[reading-en]: ../../../en/specs/v0.0.10/SPEC.md
[reading-es]: SPEC.md
