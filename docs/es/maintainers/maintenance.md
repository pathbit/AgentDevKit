---
description: "Verificación, paquetes y releases de AgentDevKit."
language: es
---

# Mantenimiento y releases

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Para actualizar el kit en un proyecto, use
[instalación](../guides/installation.md). Esta guía explica cómo mantener y
publicar el generador.

## Mantener fuentes y guías

Edite `src/` para el código, `tests/` para las pruebas y `.pbai4devs/` para los
recursos compartidos. Documente objetivo, prerrequisito, ejemplo y resultado
esperado. Utilice enlaces para los detalles y evite repetir la misma regla.

Al cambiar diseños, revisar plantillas, compatibilidad y pruebas. Al cambiar
órdenes, revise ayuda, idiomas y ejemplos. Markdown comienza con frontmatter y
H1. Resultados y capturas de verificación permanecen ignorados.

## Comprobar sin desperdiciar CI

El CI verifica Linux y distribuye la portabilidad en grupos independientes:

| Perfil | Responsabilidad |
| --- | --- |
| Linux / Node 24 | Fuentes, producto, infraestructura, lint y paquete real. |
| Windows / Node 24 | CLI, proyectos, recursos y diseño en jobs separados. |
| macOS / Node 24 | Los mismos grupos de portabilidad en jobs separados. |
| Linux / Node 26 | Smoke de compatibilidad. |
| Tres sistemas / Node 18.20.8 | Launcher selecciona Node 24.13.1 del CI. |
| macOS / Node 24 | Gate nativo de metadatos, además de los grupos portátiles. |

El perfil macOS usa el runner estándar `macos-15-intel`. El label `macos-latest`
usa ARM64 y puede tener filas diferentes; oígales [runners disponibles][runners]
Antes de cambiar la arquitectura, las pruebas locales deben informar a la
arquitectura usada.

La distribución real es probada una vez en el perfil completo. Todos los grupos
de Windows y macOS necesitan pasar para aprobar el CI. Cada grupo tiene su
propio log y límite, lo que facilita identificar la prueba que falló.
Execuciones antiguas de la misma referencia pueden ser canceladas cuando
sustituidas, sin cancelar una publicación en marcha. Nuevas suítes deben
integrar un grupo portátil o registrar una justificación explícita para ejecutar
solamente en el perfil completo.

El workflow [Security tools smoke][security-ci] instala los tres escáneres con
pins revisados en Linux, macOS y Windows. Después analiza fixtures locales sin
red, con casos inseguros y corregidos. Esta prueba valida el funcionamiento de
las herramientas; no certifica la seguridad de una aplicación. Informes
normalizados se almacenan como artifacts, sin binarios o fuentes de las
fixtures.

`npm run verify` ejecuta el perfil completo. `ci:portable` e `ci:smoke` ejecutan
los demás perfiles localmente. `npm run test:examples` verifica los escenarios
en una carpeta temporal fuera de Git cuando el cambio afecta a la generación. A
[contribución](../CONTRIBUTING.md) explica los checks durante el desarrollo.

## Cuando una prueba puede ser pulada

El runner de los perfiles de CI exige resultado observable. Fallo, cancelación,
TODO, skip sin motivo y grupo sin pruebas aprobadas interrumpen el perfil. Una
excepción debe informar al requisito que impide la ejecución en ese ambiente.

- macOS prueba ACL, xattr, flags y aliases de sistema. Las fixtures de caja y
  aliases dependen del comportamiento real del volumen.
- Windows en NTFS prueba DACL, flujos alternativos y aliases 8.3. La fixture
  debe crear una alias que resuelva el archivo.
- Linux prueba xattr, ACL POSIX e `O_NOATIME` con volumen compatible, `attr`,
  `acl` y Python 3 cuando se requiere. El perfil completo requiere tres pruebas
  de xattr de sincronizador por el nombre. Una fixture simula la falta de
  `getfattr`.
- `native-linux-ownership` rueda cinco casos aislados con intercambio real de
  UID. El resto del perfil completo del CI rueda como usuario común.
- Linux y macOS comprueban bits POSIX, señales para grupos y nombres de archivo
  incompatibles con Windows. Para protección de directorios, Windows utiliza
  junctions cuando representan la misma frontera.
- Symlinks de archivo, hardlinks, GNU Make y Docker Compose requieren soporte
  del ambiente. La limitación que impidió la prueba aparece en el log.

La infraestructura registra cada exclusión por archivo, prueba y razón. En la
orden instalada, esto resulta en `partial`; release acepta sólo las exclusiones
de plataforma previstas para el perfil completo. El CI ejecuta las pruebas
obligatorias en la propia plataforma y falla si se pulan.

## Generar un paquete

O [CI][ci] rueda pushes y PRs; también se puede iniciar en **Run workflow**. El
perfil completo produce `agentdevkit-<versão>.tgz`, `SHA256SUMS`, notas y
manifiesto. El artifact incluye commit, ejecución y checksum para identificar
exactamente lo que se ha probado. El nombre incluye el SHA y el intento de run.
Descargas de Actions requieren sesión, con retención de 14 días. La instalación
utiliza el paquete nominado en [npm público](packages.md); las releases
preservan artefactos y checksums para auditoría.

Para investigar localmente:

```console
npm run build
```

El resultado está en `.agent-tests/release/<versão>/`. Esta orden no publica
nada. Nunca versione el tarball o sus informes. `pack:release` Todavía está
disponible con el mismo comportamiento.

El perfil `verify` Prueba el tarball que construyó. Para usar el mismo candidato
en verificaciones dirigidas, pase el camino absoluto del archivo `.tgz` como
`AGENTDEVKIT_TARBALL` a `npm run test:distribution`. La prueba registra la
verificación en `.agent-tests/release-artifact-verification.json`. Sin la
variable, la prueba de distribución genera su propio paquete temporal.

En las suítes de compatibilidad, informe `--tarball <arquivo>` a `npm run
test:oss --` o `npm run test:docs --`. Para probar la actualización, informe
`--from-version <versão publicada> --to-tarball <arquivo>` a `npm run
test:upgrade --`. Regístrate SHA-256 del candidato con las pruebas.

## Publicar una versión

1. Actualice versión y lockfile, changelog, ejemplos y alcance de la entrega.
2. Concluya pruebas, documentación y revisión independiente. Utilice el tarball
   del checkout candidato en las pruebas de instalación, compatibilidad y
   matriz. Para la prueba de actualización, comience en la última versión
   publicada y termine en el mismo tarball candidato.
3. Integra el cambio en `main` y sigue el CI. Cuando cambie la versión,
   sigue también el flujo de publicación.

El perfil completo requiere las pruebas estrictas de recuperación concurrente.
Si falla, el paquete permanece sin aprobación para publicación. Consulte
[roadmap](../product/roadmap.md) y los
[pruebas](../tests/README.md).

Después de que toda la matriz de CI pase, la automatización crea la etiqueta
`v<versão>` En el commit verificado y inicia el workflow de release. Un push sin
cambio de versión publicada no genera otra release. Una etiqueta existente no se
mueve: si la versión cambió y la etiqueta apunta a otro commit, la
automatización falla para revisión. Versiones inferiores a las ya registradas
también no se publican automáticamente. Si un push cancelar el CI anterior y la
versión todavía no tiene tag, el próximo CI aprobado de la branch principal
podrá publicar la versión en su propio commit.

O [workflow de release][release] localiza el CI aprobado de un push en la branch
principal, confiere el commit y baja su artifact por ID. Verifica procedencia,
versión y checksum antes de publicar. No repite la suíte ni reempacota. También
envía el mismo paquete al [npm público y GitHub Packages](packages.md), confiere
la integridad en los dos destinos y prueba versión, instalación, diagnóstico y
sincronización. El consumo por npm es anónimo; por GitHub, autenticado.

La etiqueta `v<versão>`, la release de GitHub y los paquetes en los dos
registros identifican la misma entrega. La ejecución manual también exige la
etiqueta; no cree otra etiqueta para una versión ni mova una etiqueta ya
publicada. Publicaciones hechas fuera de ese flujo no crean etiquetas
automáticamente.

Para consultar los archivos de una versión en el mismo checkout:

```console
git fetch --tags
git show v0.0.19:package.json
git diff v0.0.19..main -- src/
```

En un proyecto atendido, fije la versión deseada del paquete y revise el plan
antes de aplicarla:

```console
npx @pathbit/agentdevkit@0.0.19 update --dry-run --json
```

La orden usa esa versión del kit; no revisa automáticamente el historial Git ni
archivos propios del proyecto. Compruebe los conflictos y haga copias de
seguridad antes de aplicar una versión anterior.

Si el artifact ha expirado o ha fallado un job del CI, use **Re-run all jobs**
En el CI original del push y espere a todos los jobs. **Re-run failed jobs**
Puede mantener el paquete de un intento anterior, que la release no acepta.
Después reexecute la release. Una ejecución manual de CI sirve para diagnóstico,
pero no sustituye esa procedencia. Una release existente no es sobrescrita.

Si la carga falla después de la creación del borrador, sigue siendo privada.
Compruebe el borrador antes de intentar otra vez: el publicador no sustituye una
release existente, incluso en borrador. Elimina solamente el borrador incompleto
de ese intento después de conferir el origen; nunca apague una release publicada
para repetir el flujo.

Si la releasis todavía no existe, use **Re-run failed jobs** o `gh workflow run
release.yml --ref vX.Y.Z` La publicación prioriza el secreto `NPMJS_TOKEN` del
repositorio; sin él, usa OIDC, conforme [publicación](packages.md). Si la
creación de la etiqueta o el accionamiento falla, consulte la ejecución
**Autorelease tag**. Una etiqueta en el commit correcto puede ser retomada sin
moverla; si apunta a otro commit, investigue antes de cualquier publicación.

Si la release ya existe y falta solamente el paquete en un registro, use el modo
`package_only` descrito en [paquete npm](packages.md#publicar-por-actions). Él
no intenta recrear la releasis existente.

Execuciones terminadas con fallo se pueden eliminar mediante solicitud, sin
eliminar ejecuciones aprobadas, etiquetas o releases. Consulte la lista y
preserve los identificadores de las ejecuciones y releases mantenidos antes de
la limpieza.

## Conferir la entrega pública

Revise la versión en [página del paquete][package] e instale el nombre en un
proyecto desechable, siguiendo [paquete npm](packages.md). Prueba selección,
`doctor` e `sync --check`. Compara la integridad del registro con el artefacto
aprobado; una aprobación de CI no sustituye la instalación real por el registro.

[Wiki](../README.md) · [Comunidad](community.md)

[ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/ci.yml
[release]: https://github.com/pathbit/AgentDevKit/actions/workflows/release.yml
[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[security-ci]: https://github.com/pathbit/AgentDevKit/actions/workflows/security-tools.yml
[runners]: https://docs.github.com/en/actions/reference/runners/github-hosted-runners

[reading-pt]: ../../maintainers/maintenance.md
[reading-en]: ../../en/maintainers/maintenance.md
[reading-es]: maintenance.md
