---
description: "Complementar instrucciones existentes sin reemplazar contenido humano."
status: aprovado
version: 0.0.12
language: es
---

# Integración sin sustitución

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> El siguiente contrato es histórico. La decisión posterior es no editar
> `.git/info/exclude` ni crear ni cambiar ignores en la raíz o en los clientes.
> Los ignores existentes en el hub también se conservan. La revisión de los
> criterios
> y su validación están pendientes en [roadmap](../../product/roadmap.md).
>
> El criterio AC-006 registra la integración TOML de versiones anteriores. Desde
> `0.0.36`, el kit deja de crear o renovar apuntamientos en `.gemini/`.
> [migración][migration], el kit preserva contenido propio y puede retirar
> Sólo su contribución comprobada. `GEMINI.md` permanece en Antigravity.

## Objetivo

Al instalar, actualizar o sincronizar, añadir referencias de AgentDevKit a los
archivos de instrucciones existentes. Preservar contenido, metadatos, nombres,
permisos e índice Git del usuario, incluso colisiones de nombres.

## Contrato

- Entradas raíz existentes reciben un bloque corto; aliases únicos como
  `agents.md` Son reutilizados sin crear una segunda entrada.
- Skills, agentes, reglas y órdenes Markdown existentes reciben sólo una
  referencia al hub. El frontmatter humano no es sustituido.
- Las órdenes Gemini existentes reciben la referencia dentro de `prompt`, en
  TOML válido. Sintaxis no soportada se conserva e informada.
- El estado registra la propiedad del bloque, nunca del archivo humano entero.
- Actualizaciones preservan ediciones humanas fuera del bloque. Los marcadores
  ambiguos o bloques adulterados impiden su sustitución, incluso con `--force`.
- Eliminar un recurso administrado elimina solamente su contribución comprobada.
- Los archivos humanos siguen sujetos a las opciones de Git del propio proyecto;
  el kit ignora sus derivados por archivo, no la carpeta entera del cliente.
- Los enlaces simbólicos no son seguidos. Las preferencias externas al alcance
  de instrucciones no son reformadas ni mezcladas arbitrariamente.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Las entradas raíz humanas reciben la referencia y preservan sus bytes. |
| AC-002 | Colisones Markdown preservan frontmatter y texto, con bloque único. |
| AC-003 | Repeticiones son idempotentes; ediciones fuera del bloque son preservadas. |
| AC-004 | Bloques modificados, ambigüedades y enlaces no causan pérdida de datos. |
| AC-005 | Retirada de bloque preserva texto, permisos e índice humano. |
| AC-006 | TOML mantiene una semántica humana y una referencia válida en el prompt. |
| AC-007 | Git no pasa a ignorar archivos humanos por propiedad parcial. |
| AC-008 | Paquete real, regressiones, madurez y revisión independiente pasan. |

## Validación

Fixtures existentes incluyen frontmatter propio, caja diferente, BOM, CRLF,
ausencia de newline final, cambios posteriores, archivos ya staged y órdenes
estructurados. Testar pérdida de origen, rollback, `--force`, simulación,
`doctor`, `sync --check` e instalación del paquete generado.

Las pruebas son versionados. Backups, snapshots e informes se ignoran en
`.agent-tests/` o `tmp/`; no modificar proyectos consumidores en esta entrega.

[migration]: ../../guides/installation.md#actualizar-y-elegir-agentes

[reading-pt]: ../../../specs/additive-integration/SPEC.md
[reading-en]: ../../../en/specs/additive-integration/SPEC.md
[reading-es]: SPEC.md
