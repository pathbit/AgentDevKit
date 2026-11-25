---
description: "Utilidades mínimos compartidos de las automaciones Node.js."
language: es
---

# Utilidades

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`runtime.mjs` centraliza el requisito Node.js 24+, la raíz del repositorio y la
identificación del archivo ejecutado. No instala runtimes ni configura la
máquina. También busca ejecutables opcionales PATH Sin iniciar un shell.

`managed-content.mjs` delimita los bloques Markdown que el kit puede
administrar. `managed-toml.mjs` lee bloques de instalaciones antiguas de Gemini
CLI para validar y retirar referencias cuya propiedad fue registrada.
`managed-toml-parser.mjs` usa `smol-toml.cjs` para validar el documento antes de
localizar el prompt y reconocer su bloque administrado. El bundle es [smol-toml
1.9.1](https://github.com/squirrelchat/smol-toml), distribuido con
`smol-toml.LICENSE` (BSD-3-Clause), sin dependencia del proyecto consumidor. La
retirada de un bloque puede reserializar el valor del prompt TOML.

`gitignore.mjs` detecta reglas conflictivas y coordina la migración local.
`legacy-exclude.mjs` reconoce el bloque exacto de la versión 0.0.21 con una sola
obra. `legacy-exclude-write.mjs` Guarda una copia privada del original antes de
publicar las reglas preservadas. Conflictos quedan pendientes para la revisión.

`collectErrorDiagnostics`, en `error-reporting.mjs`, recolección datos propios
sin ejecutar getters o traps de proxies; datos inseguros o más allá del límite
son señalizados como truncados. Otros accesos a errores no están cubiertos.

`recovery-effects.mjs` clasifica las opciones analizadas para que la CLI aplique
la barrera de recuperación antes de despachar. `plugins list` e `plugins info`
Son consultas. `tools` y las acciones `plugins install` e `plugins check` Son
opacas. La planificación puede usar prácticas privadas.

`project-recovery.mjs` inspecciona, inicia, concluye y resuelve operaciones en
el diario compartido por CLI y por sync directo. Los módulos
`recovery-store.mjs`, `recovery-records.mjs` e `recovery-backup.mjs` cuidan del
almacenamiento, de los registros y de la verificación de las copias de
seguridad.

`adapters.mjs` lee la política de clientes y genera `espelhos.conf`.
`adapter-manifest.mjs` proporciona el encabezado canónico que el inspector
también usa para reconocer la selección sin clientes.

`claude-legacy-exact.mjs` Sólo reconoce un formato legado exacto de referencia
Claude. El reconocimiento no atribuye propiedad ni prueba activación de la
regla.

`catalog.mjs` identifica errores de sintaxis JSON externo por el camino, sin
incluir extractos del contenido. Otros diagnósticos no están cubiertos. En
errores de sintaxis, los lectores JSON lugares de `preparar-ferramentas` e
`gerenciar-skills-externas` informan el tipo de archivo sin copiar su contenido
o camino. Los errores de lectura mantienen su código y mensaje; otros parsers no
están cubiertos.

`xattr-probe.mjs` consulta atributos y ACLs específicos en macOS y detecta
atributos listables en Linux. Resultados inconclusivos no prueban ausencia.
`native-metadata.mjs` trata la preparación, la verificación y la publicación de
sustituciones con metadados, inclusive DACL y flujos alternativos en NTFS.

`file-owner.mjs` identifica archivos POSIX cuyo propietario cambiaría o cuya
lectura por el propietario no puede ser presumida. Grupos, ACLs y cambios
competidores exigen comprobaciones adicionales.

`state-path.mjs` identifica el estado actual o legado sin dividir datos; dos
carpetas simultáneas o enlaces simbólicos requieren resolver el conflicto antes
del uso.

[reading-pt]: ../../../../../.pbai4devs/scripts/lib/README.md
[reading-en]: ../../../../en/kit/scripts/lib/README.md
[reading-es]: README.md
