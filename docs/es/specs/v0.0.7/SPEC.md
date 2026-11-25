---
description: "Pruebas en proyectos reales y protección de artefactos locales."
status: aprovado
version: 0.0.7
language: es
---

# Compatibilidad con proyectos existentes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo y autorización

Atender al pedido de probar el paquete publicado en proyectos open source con
contenido real, usando clones `tmp/` ignorado. Corrigir la falta de protección
de artefactos revelada en proyectos que no tenían las reglas del AgentDevKit.

El trabajo usa el [PRD](../../product/prd.md), o
[diseño](../../product/design.md) e a [distribución pública](../v0.0.6/SPEC.md).
No cambia las aplicaciones clonadas.

## Contrato

- Clonar commits fijos de Express, Zod y Chi; preservar los proyectos
  originales.
- Comparar bytes, tipos, permisos, enlaces, HEAD y cambios staged.
- Comprobar instalación, actualización, repetición, skill propia y conflictos.
- Proteger artefactos en el ignore local sin reescribir el `.gitignore` del
  usuario ni desindexar archivos humanos. Respetar proyectos hermanos y
  excepciones.
- Mantener las denegaciones de enlaces simbólicos. Un bloqueo seguro no
  comprueba una instalación exitosa; relatalo y verificar la ausencia de
  cambios.
- Versionar la prueba; guardar clones, logs y resultados solamente en `tmp/`.
- Publicar correcciones como nueva versión estable; repetir la prueba pública.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Matriz real registra resultado y preservación por proyecto. |
| AC-002 | Los artefatos son ignorados sin alterar fuentes o proyectos hermanos. |
| AC-003 | Regresos y revisión independiente aprueban la corrección. |
| AC-004 | Paquete estable publicado repite los resultados y actualiza el router. |

## Verificación

- **AC-001:** ejecutar runner contra el npm, incluyendo caso staged y bloqueos;
  registrar commits, versión y hashes. No confundir con pruebas de las
  aplicaciones.
- **AC-002:** probar Git, instalación sin Git, proyecto aninhado, caja mixta,
  excepciones humanas y artefactos ya rastreados. No forzar sobrescritas.
- **AC-003:** realizar pruebas del paquete, infraestructura, lint y
  distribución. Comparar pruebas nativas de Express antes y después, sin
  modificar sus fuentes.
- **AC-004:** conferir release, `latest`, checksum e instalación anónima;
  repetir matriz con el paquete publicado y actualizar el router con copia de
  seguridad y diagnóstico.

Evidencias de los clones se quedan en `tmp/oss-compatibility/`; el informe de
revisión en `.agent-tests/oss-compatibility/` referencia copias de esas pruebas.
Zod y Chi no tendrán pruebas nativas sin los runtimes/gerenciadores exigidos. No
concluir compatibilidad universal a partir de esta matriz.

## Documentación afectada

Actualizar instalación, pruebas, changelog, índices y roadmap. Documentar la
protección de artefactos locales y los límites de configuraciones preexistentes.

[reading-pt]: ../../../specs/v0.0.7/SPEC.md
[reading-en]: ../../../en/specs/v0.0.7/SPEC.md
[reading-es]: SPEC.md
