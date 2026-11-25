---
description: "Código del CLI y el instalador de AgentDevKit."
language: es
---

# Código del paquete

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

CLI, instalación, idioma y próximos pasos usan los recursos compartidos. Este
directorio no forma parte de los recursos instalados en los proyectos.

| Módulo | Responsabilidad |
| --- | --- |
| `cli.mjs` | Entrada estable para la CLI. |
| `cli/` | Argumentos, ejecución, salida, advertencias y informe de recuperación. |
| `install.mjs` | API de instalación, sync y diagnóstico usado por la CLI. |
| `installation/` | Plan, etapa, archivos administrados y transacciones. |
| `config.mjs` | Caminos, versión y metadatos del paquete. |
| `adapters/` | Acceso a los diseños compartidos de los agentes. |
| `i18n.mjs` e `next.mjs` | Idiomas y orientación de la siguiente acción. |
| `plugins.mjs` | Catálogo opcional y encaminamiento a los gestores locales. |

Em `installation/`, `plan.mjs` coordina el plan. `prepare-stage.mjs` prepara la
copia privada y `stage-cleanup.mjs` trata su limpieza y sus diagnósticos.
`plan-state.mjs` concilia la propuesta con el estado registrado y
`native-outputs.mjs` Concilia referencias con los destinos del proyecto.
`apply.mjs` revalida el plan antes de escribir y usar `publish-file.mjs` para
publicar archivos. `state.mjs`, `legacy-state.mjs`, `ownership.mjs` e
`git-index.mjs` concentran lectura, migración, propiedad y verificaciones del
índice. Los controles compartidos de Git, metadados y recuperación viven en
`.pbai4devs/scripts/lib/`.

Antes de aplicar cambios, el instalador rechaza archivos con múltiples hardlinks
detectados o cuya cuenta no puede ser verificada. El recuento se mide de nuevo
antes de la escritura, pero no elimina cambios competidores entre la conferencia
y la operación. El plan informa estos bloqueos; un cambio posterior requiere una
nueva verificación. En macOS, la aplicación también rechaza archivos con ACL
listada o con consulta no concluyente; el plan informa estos bloqueos en los
archivos afectados. La protección no cubre ACLs de los directorios del proyecto
o cambios competidores después de la consulta. Antes de copiar datos para una
copia de seguridad nueva en macOS, la aplicación rechaza su carpeta si tiene ACL
Listada o si falla la consulta. Esta verificación no demuestra privacidad contra
cambios competidores o en otros sistemas.

Cuando la planificación de la etapa falla y el intento de retirarlo también
falla, `planInstallation` preserva la cadena de la falla principal en `cause` y
ofrece el fallo de limpieza en `cleanupError`, propiedad no comercializable.
Este valor puede contener mensajes y caminos sensibles: inspecionelo solo
localmente. La salida JSON la CLI informa el fallo de limpieza con mensaje fijo.
Cuando la eliminación final es la única falla, su valor se queda en `cause`.

[reading-pt]: ../../../src/README.md
[reading-en]: ../../en/src/README.md
[reading-es]: README.md
