---
description: "Mesma versión pública en npm y GitHub Packages y limpieza del histórico falho."
status: aprovado
language: es
---

# Publicación sincronizada

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Quitar las ejecuciones antiguas con error, preservando ejecuciones aprobadas y
releases publicadas. Publicar el mismo AgentDevKit en npm y GitHub Packages, sin
cambiar el número o el contenido de una versión ya publicada.

## Contrato

- Excluir solamente ejecuciones concluidas con fallo confirmado.
- Preservar etiquetas, releases, assets y ejecuciones aprobadas.
- Usar el TGZ original aprobado por el CI en los dos registries.
- Mantener `npx` por el npm público sin autenticación como opción estándar.
- Autenticar GitHub con token propio, sin compartir credenciales.
- Confirmar visibilidad pública, versión e integridad en los dos destinos.
- Publicar ambos en las próximas etiquetas; permitir completar sólo un destino.
- Recusar una versión existente con bytes diferentes; nunca reempacotar la
  etiqueta.

## Criterios de aceptación

| ID | Prueba |
| --- | --- |
| AC-001 | Execuciones fallas retiradas; aprobadas y releases preservadas. |
| AC-002 | Mesma versión e incluso checksum en los dos registries. |
| AC-003 | GitHub público y asociado al repositorio correcto. |
| AC-004 | Tokens aislados y acceso anónimo al npm preservado. |
| AC-005 | Automación publica ambos y permite retomar un destino. |
| AC-006 | Pruebas y revisión aprobadas; consumo de los dos destinos comprobados. |

## Validación

Comparar inventarios remotos antes/depois de la limpieza. Prueba perfiles de
registro, errores de autenticación, integridad divergente, repetición y
selección del workflow. Completar la versión `0.0.9` En GitHub con su artefacto
original, comparar los registries y probar instalación, diagnóstico y
sincronización.

Prueba se queda en `tmp/` o `.agent-tests/`, ignoradas por Git.

[reading-pt]: ../../../specs/dual-registry/SPEC.md
[reading-en]: ../../../en/specs/dual-registry/SPEC.md
[reading-es]: SPEC.md
