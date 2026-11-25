---
description: "Fuente única, salidas locales y automaciones JavaScript."
status: aprovado
version: 0.0.3
language: es
---

# Fuentes y generación local

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Mantener en `.pbai4devs` las fuentes del kit y generar la estructura específica
de cada agente cuando sea necesario. Los derivados y las preferencias son
locales; código, templates, pruebas y documentación permanecen versionados.
Escopo autorizado en la solicitud actual y vinculado al
[PRD](../../product/prd.md).

## Contrato

- El producto, el launcher, las pruebas y las automaciones se encuentran en
  `.pbai4devs`. Metadados npm, licencia, documentación e integración GitHub se
  encuentran en la raíz.
- Configuración declarativa y templates describen nombres, directorios,
  metadatos y apuntamientos de los clientes.
- La instalación genera solo clientes elegidos, entradas e índices locales. Los
  apuntamientos siguen a la fuente compartida, sin symlinks.
- Las salidas y el estado personal son ignorados por Git. `.github/workflows`,
  issues y configuraciones humanas no son confundidos con derivaciones de los
  agentes.
- Uno `.gitignore` no controla directorios hermanos. El generador aplica
  exclusiones locales de Git; sin repositorio, usa una protección en el
  `.gitignore` De la raíz.
- Migrar archivos ya rastreados requiere retirar del índice solamente los
  derivados identificados, preservando el contenido en el disco.
- Las entradas humanas son preservadas. Los bloques antiguos del kit se migran
  sin borrar contenido humano fuera del bloque; los cambios conflictivos
  requieren revisión.
- El paquete sigue ejecutable por `npx`. El launcher acepta Node 18+ y prepara
  Node 24+ para el núcleo cuando sea necesario. No hay bootstrap `.sh` o `.ps1`.
- Sin Node/npm, el agente utiliza el instalador nativo del sistema; JavaScript
  no puede ejecutar antes de que haya un runtime.
- El CI separa la verificación completa de las pruebas de portabilidad. La
  release reutiliza el artifact aprobado del mismo commit, sin repetir el
  empacotamento.

## Criterios de aceptación

| ID | Resultado observable | Verificación |
| --- | --- | --- |
| AC-001 | Fuentes no hub; ningún derivado rastreado. | Git e inventario |
| AC-002 | Templates generan clientes y entradas correctas. | Generación y npx |
| AC-003 | Derivados ignorados en Git, subpasta y worktree. | Git real |
| AC-004 | Migración preserva contenido humano y disco. | Hashes e índice |
| AC-005 | Automaciones Node, sin scripts shell propios. | Inventário/runtime |
| AC-006 | npx instala, actualiza y sincroniza el paquete. | Tarball real |
| AC-007 | CI no duplica la suítis completa en la release. | Workflow/artifact |
| AC-008 | Runtime antiguo se recupera con integridad. | Bootstrap y fallos |
| AC-009 | Guías, pruebas y release reflejan el contrato. | Lint/revisão/CI |

## Prueba

Ejecute pruebas en directorios nuevos, existentes, con y sin Git, en subcarpetas
y worktrees. Compruebe bytes preservados y paths ignorados, no solo mensajes.
Prueba selección individual y `all`, error download/checksum, paquete
adulterado, origen incorrecto del artifact y archivos locales fuera del paquete.

Los resultados se encuentran en `.agent-tests/source-only/`; no son commitados.
El CI debe validar los sistemas soportados con grupos adecuados, sin prometer
tiempos fijos. La aprobación exige revisión independiente y evidencias por
criterio.

[Todas las specs](../README.md) · [Wiki](../../README.md)

[reading-pt]: ../../../specs/v0.0.3/SPEC.md
[reading-en]: ../../../en/specs/v0.0.3/SPEC.md
[reading-es]: SPEC.md
