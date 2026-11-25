---
description: ">-"
  Empacotamento, verificações do CI e publicação do artefato aprovado.
language: es
---

# Release

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`assets.mjs` genera tarball, checksum, notas y manifiesto en
`.agent-tests/release/<versão>/`. Requiere Node.js 24+ y npm. Las notas incluyen
órdenes npx versionados para npm y GitHub Packages, autenticación por host y
enlaces a instalación y prerrequisitos.

`pipeline.mjs full` verifica producto, infraestructura, Markdown y tarball
exacto una vez. El perfil prepara el CLI `skills` Para probar la integración
real con una fixture local. El informe de infraestructura registra las pruebas
exclusivas de otra plataforma como parciales. El pipeline acepta solamente las
omisiones previstas. El perfil `full` verifica los casos Linux.
`portable-resources` ejerce la infraestructura delegada a macOS y Windows, y
`native-macos-metadata` verifica la preservación nativa en un gate separado.
Falsos o herramientas ausentes bloquean la verificación. `portable` ejecuta
todos los grupos de portabilidad localmente; en el CI, `portable-cli`,
`portable-source-integration`, `portable-selection`,
`portable-selection-lifecycle`, `portable-selection-codex`,
`portable-selection-all-root`, `portable-selection-all-leaf`,
`portable-projects`, `portable-projects-git`, `portable-projects-callbacks`,
`portable-projects-matrix`, `portable-recovery`, `portable-recovery-metadata`,
`portable-migration`, `portable-cli-line-endings`, `portable-resources`,
`portable-resources-clients`, `portable-claude-rule-cli`,
`portable-resources-managed`, `portable-managed-content`,
`portable-managed-lifecycle`, `portable-managed-protection`,
`portable-legacy-toml`, `portable-retired-client-migration`,
`portable-sync-core`, `portable-sync-core-updates`, `portable-sync-ownership`,
`portable-sync-preservation` e `portable-layout` ruedan en jobs separados en
Windows y macOS. Los cuatro perfiles de sync ejecutan los siete módulos del
punto de entrada `tests/TEST.mjs` del sincronizador. Los dos perfiles de núcleo
remiten a `BASE.mjs` e `UPDATES.mjs`, respectivamente. En Windows,
`portable-cli` confiere si la instalación y el sync directo preservan la DACL de
archivos actualizados en NTFS, usando una regla explícita de lectura en la
fixture. `portable-source-integration` Aisla la prueba de convergencia entre la
CLI y la sincronización directa, incluyendo la preservación del ignore y del
índice Git. Las pruebas de contenido administrado, ciclo de vida y protección de
alteraciones humanas comparten la fixture y ejecutan en jobs dedicados.
Callbacks aislados y pruebas de matriz quedan separados para limitar la duración
de cada job. Las pruebas Git de mayor duración y la preservación de CRLF tienen
jobs
pipeline limita cada proceso a 50 minutos en Windows y 40 en los demás sistemas.
El job de verificación tiene hasta 60 minutos para ejecutar todos sus pasos. Los
perfiles portátiles usan la salida TAP En Actions para registrar fallas conforme
las pruebas terminan. Los cinco casos de obstrucción se conservan; los tres
casos de raíz y grupo y los dos de hoja de la selección all se encuentran en
perfiles separados. `full` Todavía ejecuta todas las suítes. `smoke` verifica
Node 26. `check` confiere los recursos.

`auto-tag.mjs` Espera con relecturas limitadas si la API Todavía no mostrar la
etiqueta que acaba de crear. La release solo se dispara después de confirmar que
la etiqueta apunta para el commit aprobado por el CI.

`publish.mjs resolve` localiza un CI de push aprobado del mismo commit de la
etiqueta. El resuelvedor espera hasta 65 minutos si la ejecución todavía está en
marcha. `publish` confiere procedencia y hashes, y publica los mismos bytes.
Ausencia de artefacto válido exige ejecutar el CI; la publicación no genera otro
paquete.

`packages.mjs` publica ese mismo tarball en el npm público y en GitHub Packages,
y verifica la CLI instalada por cada registro. El consumo de npm es anónimo; en
GitHub, autenticado. El modo manual `package_only` Atiende etiquetas ya
publicadas sin recrear la release. Vea [los dos
registries](../../maintainers/packages.md).

El workflow prioriza el secreto `NPMJS_TOKEN`, recibido como `NPM_TOKEN` en la
publicación npm; sin él, utiliza OIDC. GitHub Packages utiliza su propio token
de workflow, sin compartir credenciales entre los hosts. Ningún secreto o
resultado es versionado. Vea
[mantenimiento](../../maintainers/maintenance.md).

build prepara los archivos en área temporal y preserva una salida anterior
divergente. Una repetición acepta el mismo contenido, incluso el manifiesto
legado con marca de verificación en el formato reconocido, sin reescribirlo. La
marca antigua no sustituye las verificaciones de la ejecución actual.

Después de verificar el tarball, el perfil completo crea una copia marcada en
directorio exclusivo del runner, sin alterar el manifiesto de origen. En el CI,
la opción explícita `--github-output` informa al paso de cargar el camino de
esta copia; la opción exige `GITHUB_OUTPUT` en `RUNNER_TEMP` y fuera del
proyecto. Falsos o cambios en el directorio de origen no se resuelven
reemplazando archivos existentes.

Enlaces simbólicos estáticos en `.agent-tests` o en la carpeta `release` Se
niegan. Si la limpieza falla, preserve los caminos informados y revise los
residuos antes de intentar nuevamente. Las verificaciones no son atómicas contra
alteraciones competidores ni comprueban ACLs o atributos extendidos.

[reading-pt]: ../../../../scripts/release/README.md
[reading-en]: ../../../en/scripts/release/README.md
[reading-es]: README.md
