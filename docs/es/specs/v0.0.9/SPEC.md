---
description: "Coexistencia con agentes y evolución de la documentación existente."
status: aprovado
version: 0.0.9
language: es
---

# Preservar agentes y documentación existentes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Instalar y actualizar AgentDevKit en Zod y proyectos con agentes propios,
preservando configuraciones, archivos, permisos, enlaces y estado de Git.
También orienta la evolución documental a partir del inventario y de la lectura
de los materiales existentes, sin reiniciar el proyecto. La solicitud actual
sustituye el bloqueo conservador documentado en [versión
anterior](../v0.0.8/SPEC.md).

## Contrato

- Tratar enlaces simbólicos humanos en las entradas y los clientes como caminos
  preservados: no abrir, atravesar, convertir, sobrescribir o adoptar.
- Preservar agentes y skills humanos, incluso nombres iguales a los del kit y
  durante ejecución con `--force`. Informar los caminos preservados.
- Generar los apuntes disponibles sin asignar al kit archivos preservados. No
  Zod, mantener `.codex/skills` y usar también `.agents/skills` para el Codex.
- Mantener la validación estricta en fuentes, estado, herramientas, Git y
  caminos antes pertenecientes al kit. Un enlace no puede ocultar alteración
  administrada.
- Mantener los mismos contratos en CLI Y en el sincronizador instalado.
- Antes de editar documentos, inventariar y leer los existentes. Reaproveitar
  caminos, secciones y decisiones; templates orientan solamente lagunas.
- Organizar por índices y enlaces, sin borrar, mover o sustituir documentos. En
  proyectos nuevos, no inventar producto o aprobación sin respuestas.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Los enlaces humanos internos, externos y rotos permanecen intactos. |
| AC-002 | Skills, agentes y configuraciones preexistentes se conservan. |
| AC-003 | Los caminos gestionados se niegan a los enlaces sin escritura externa. |
| AC-004 | Init, update, doctor y sync son coherentes e idempotentes. |
| AC-005 | Zod, Express y Chi pasan en la matriz del paquete, preservando Git. |
| AC-006 | Las regresión, documentación, CI y paquete público son verificadas. |
| AC-007 | Inventario detecta documentación real sin alterar archivos. |
| AC-008 | Skills requieren lectura y plan aditivo antes de las plantillas. |
| AC-009 | Ejercicios documentales preservan contenido y archivos fuera del plan. |
| AC-010 | Proyecto vacío recibe el kit sin documentos de producto inventados. |

## Validación

Ejecutar pruebas de regresión para enlaces y colisiones, incluso `--force`,
sustitución de caminos después del plan y cambio de selección de los clientes.
Rotar pipeline completo, madurez y matriz OSS con el TGZ candidato; repetir la
matriz con el paquete publicado. Comparar bytes, tipos, modos, destinos de
enlaces, staging y configuración Git en los clones. Ejecute también el
inventario instalado y el flujo de documentación en clones reales: plano por
archivo, complemento basado en hechos, índice nuevo y revisión. Separe esta
prueba de la simple instalación y de fixtures del harness; no atribua al paquete
generación automática de contenido o aprobaciones de producto.

Clones y evidencias se ignoran en `tmp/` e `.agent-tests/`. El alcance es el kit
y su flujo documental; no afirmar ejecución de las aplicaciones clonadas.

## Documentación afectada

Actualizar instalación, CLI, recuperación, recursos, sincronización, pruebas,
changelog e índices. Preservar las specs antiguas como histórico.

[reading-pt]: ../../../specs/v0.0.9/SPEC.md
[reading-en]: ../../../en/specs/v0.0.9/SPEC.md
[reading-es]: SPEC.md
