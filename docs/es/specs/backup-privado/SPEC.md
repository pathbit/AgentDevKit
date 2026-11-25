---
description: "Isolar copias de seguridad del instalador con un directorio privado en POSIX."
status: aprovado
language: es
---

# Directorio privado de copia de seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El instalador conserva el modo de los archivos copiados, pero una copia puede
perder la protección de la carpeta original. Este incremento, autorizado por el
usuario, mantiene el contrato de modos de la carpeta. [spec
histórica](../v0.0.8/SPEC.md) y crea cada copia de seguridad en una carpeta
exclusiva con modo inicial `0700` en POSIX, sujeto al `umask`. O
[PRD](../../product/prd.md), a [UX](../../product/ux-ui.md), o
[diseño](../../product/design.md) e o [roadmap](../../product/roadmap.md)
Todavía no se ha elegido la release.

Crear la carpeta exclusiva antes de la primera copia y antes de cambiar el
contenido del proyecto; crear también cada ancestro ausente con modo `0700`,
sujeto al `umask`. Un fallo impide estos cambios. No modificar modos o contenido
de carpetas existentes, archivos Git o `.gitignore`. Preservar los modos de los
archivos copiados, crear subcarpetas privadas y archivos exclusivamente, y
volver el camino relativo; el identificador es opaco y puede variar. Sin
archivos anteriores, no crear una carpeta de copia de seguridad. Después de
fallo, se conservan residuos vacíos o parciales.

El aislamiento depende de los permisos efectivos, inclusive ACLs, propietarios y
seguridad de los ancestros; modo POSIX No demuestra secreto contra el
propietario, usuarios privilegiados o quién ya puede acceder a la carpeta. La
prueba no garantiza protección en Windows o contra intercambio concurrente de
directorios. sync directo y la recuperación concurrente siguen fuera de este
incremento. Backups pueden ser expuestos a Git conforme a las reglas del
proyecto. POSIX, si el sistema de archivos informa permisos amplios para la raíz
creada, rechaza con `E_BACKUP`; algunos volúmenes sin soporte adecuado a modos
POSIX Pueden impedir la operación.

## Criterios de aceptación

- **AC-001:** Con máscaras `000`, `022` e `077`, una copia de seguridad de
  archivo `0640` protegido por la carpeta original tiene una nueva raíz `0700` o
  más restringida; el modo y los bytes de la copia permanecen iguales a los
  originales. Testar en POSIX con proyecto sintético y registrar logs en
  `.agent-tests/backup-privado/`.
- **AC-002:** Carpetas y archivos humanos preexistentes se conservan; sin
  archivos anteriores no hay carpeta nueva de copia de seguridad. Fallos de
  creación o copia impiden cambios planificados. Testar modos, bytes e índice
  Git preparado.
- **AC-003:** Regreso de instalación, modos y preservación pasan en macOS y
  Linux; validar Windows en ejecución real o registrar como no verificado.
  Pruebas no comprueban ACLs o seguridad en sistemas de red.

La recuperación conservadora, pruebas rigurosas, revisión independiente y
validación multiplataforma siguen siendo necesarios antes de cualquier
publicación.

[reading-pt]: ../../../specs/backup-privado/SPEC.md
[reading-en]: ../../../en/specs/backup-privado/SPEC.md
[reading-es]: SPEC.md
