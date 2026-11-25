---
description: "Estructura estándar del repositorio, ejemplos y automaciones simples."
status: aprovado
version: 0.0.4
language: es
---

# Estructura estándar y ejemplos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Organizar el repositorio para que una persona pueda localizar el código, probar
los agentes y verificar una alteración por las órdenes npm. Escopo solicitado
por el usuario: código y pruebas en la raíz, ejemplos en carpeta propia y
automaciones claras. Aprobación general y ejecución ya autorizadas.

Dependencias: [v0.0.3](../v0.0.3/SPEC.md) e [GitHub
Packages](../github-packages/SPEC.md). O [PRD](../../product/prd.md), o
[diseño](../../product/design.md) e a [UX](../../product/ux-ui.md) Siguen siendo
aplicables.

## Contrato

- Código en `src/`Launcher en `bin/`, pruebas en `tests/` y publicación en
  `scripts/release/`. `.pbai4devs` mantiene los recursos portables de los
  agentes.
- `examples/` contiene la guía versionado. El generador produce ocho escenarios
  en `examples/generated/`, con los directorios de los clientes y el informe
  actual.
- La preparación debe funcionar sin carpetas de agentes previamente generadas en
  la raíz. Preparar nuevamente invalida resultados antiguos con propiedad
  válida.
- No eliminar archivos humanos. Sólo los estados generados pueden salir de la
  raíz, con copia de seguridad local. Workflows reales se quedan en `.github`.
- Mantener npm/npx, instalación, actualización, elección de clientes y
  preservación del proyecto consumidor. No copiar el código del kit para la
  aplicación atendida.
- Adaptar build, test, CI y publicación sin duplicar la matriz. Releases y
  GitHub Packages usan los mismos bytes aprobados.
- Mantener guías cortas por tarea, sin nuevos marcos, dependencias o servicios
  que CLI No lo usa.

## Criterios de aceptación

| ID | Salida | Prueba |
| --- | --- | --- |
| AC-001 | Código y pruebas en las carpetas raíz. | Inventario e imports. |
| AC-002 | Las órdenes npm y el paquete siguen siendo funcionales. | CLI e TGZ real. |
| AC-003 | Ejemplos completos generados de un origen limpio. | Ocho escenarios. |
| AC-004 | Informes actuales y contenido humano preservado. | Pruebas negativas. |
| AC-005 | Upgrade mantiene proyectos y versiones anteriores. | Migración real. |
| AC-006 | Salidas no entran en Git o paquete. | Git e inventario. |
| AC-007 | Publicación preserva la distribución. | Pruebas y Actions. |
| AC-008 | Guías y referencias acompañan la nueva estructura. | Lint y revisión. |

Evidencias en `.agent-tests/standard-layout/`, fuera del versionamiento. Pruebas
web/desktop no se aplican: esta entrega cambia la CLI, archivos y automaciones.

[Desarrollo](../../maintainers/development.md) · [Specs](../README.md)

[reading-pt]: ../../../specs/v0.0.4/SPEC.md
[reading-en]: ../../../en/specs/v0.0.4/SPEC.md
[reading-es]: SPEC.md
