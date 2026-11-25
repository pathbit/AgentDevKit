---
description: "Instalación selectiva y persistente de los agentes usados por el proyecto."
status: aprovado
version: 0.0.2
language: es
---

# Seleccionar agentes por proyecto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Crear sólo los apuntes de los agentes elegidos, manteniendo el origen único en
`.pbai4devs`. La selección funciona en la terminal, en agentes de escritorio y
en ejecuciones sin interacción. Escopo solicitado y autorizado por el usuario,
conforme [PRD](../../product/prd.md), [UX](../../product/ux-ui.md) e
[diseño](../../product/design.md).

## Comportamiento

- `init --agents codex,claude` instala los clientes seleccionados.
- `agents` consulta; `agents codex,claude` modifica; `agents all` activa todos.
- En el primer uso interactivo, la CLI pregunta idioma y agentes.
- En una aplicación, el agente puede reunir la elección por chat y pasarla a la
  CLI.
- La prioridad es una opción explícita, elección salva y, por último, `all`.
- Sin terminal interactiva, con `--yes`, `--json` o `--dry-run`, no hay
  pregunta.
- La selección es persistida en `estado/agentdevkit.json`; `all` mantiene su
  sentido de todos, incluso clientes añadidos en versiones futuras.
- Actualizar, sincronizar, intercambiar idioma y consultar no reactivan clientes
  desmarcados. estados antiguos sin selección siguen equivalentes a `all`.
- Dependencias de descubrimiento se incluyen: Codex necesita `.agents`, por
  ejemplo. Las carpetas efectivas pueden ser compartidas entre clientes.
- Desmarcar elimina solamente derivados propios comprobados. Los archivos
  humanos permanecen; cambios en archivos administrados producen conflictos y
  copias de seguridad.

O hub, scripts, modelos y herramientas permanecen completos. Seleccione agentes
no instala herramientas, elige stack ni inicia el producto. No incluye detección
por procesos, configuración global de editores o login en los clientes.

## Plan

1. Centralizar IDs, aliases, dependencias y entradas nativas en los adaptadores.
2. Filtrar el manifiesto y persistir la elección en la instalación.
3. Implementar consulta, modificación y preguntas sin bloquear automaciones.
4. Eliminar derivados desmarcados con las protecciones existentes de propiedad.
5. Actualizar guías y skills de configuración; sincronizar los recursos.
6. Comprobar selección, migración, preservación, paquete real y distribución.

## Criterios de aceptación

| ID | Resultado observable | Prueba |
| --- | --- | --- |
| AC-001 | Genera solo los clientes elegidos y sus dependencias. | Adaptadores |
| AC-002 | Elija explícitamente y una pregunta interactiva funcionan. | CLI y terminal |
| AC-003 | Sin interacción, hay selección salva o fallback all. | CLI/JSON |
| AC-004 | Actualización y sync preservan la elección. | CLI y script directo |
| AC-005 | Cambiar selección preserva contenido humano. | Hashes y conflictos |
| AC-006 | Los errores de entrada y simulación no alteran el objetivo. | Pruebas negativas |
| AC-007 | Estado legado y all mantienen compatibilidad. | Migración y repetición |
| AC-008 | Paquete real, guías y revisión son verificados. | Paquete, lint y CI |

Use Node 24/26, directorios vacíos y existentes e instalaciones via tarball
real. Prueba las raíces, entradas, índices y `.gitignore`; no solo considere el
mensaje de éxito. Exercite el sincronizador instalado sin depender de `src/`.

Código de pruebas se ve versionado. Resultados y informe por criterio se
encuentran en `.agent-tests/client-selection/<execucao>/`. La selección de
archivos no comprueba carga en toda aplicación; registre por separado lo que se
ha ejecutado.

[Todas las specs](../README.md) · [Wiki](../../README.md)

[reading-pt]: ../../../specs/v0.0.2/SPEC.md
[reading-en]: ../../../en/specs/v0.0.2/SPEC.md
[reading-es]: SPEC.md
