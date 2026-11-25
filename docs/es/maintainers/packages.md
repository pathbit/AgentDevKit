---
description: "Publicación sincronizada de AgentDevKit en npm y en GitHub Packages."
language: es
---

# Paquete en los dos registries

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit es un solo paquete: [`@pathbit/agentdevkit`][package]. Contiene la
CLI y los recursos compartidos; la instalación prepara los apuntamientos de los
agentes escogidos en el proyecto.

Cada versión usa el mismo TGZ en los dos destinos, con el mismo número y
checksum.

| Destino | Visibilidad | Instalación |
| --- | --- | --- |
| [npm público][package] | Pública | `npx`, sin iniciar sesión; opción estándar. |
| [GitHub Packages][github] | Pública | Requiere autenticación de GitHub. |

En GitHub Packages, público significa que el paquete es visible a todos; el
registry npm de GitHub exige token también para descargar paquetes públicos.
Consulte [Autentificación oficial][github-auth] Si elige ese destino.

Los metadatos identifican a PathBit como autor, palabras clave del kit y
licencia MIT. O README público es generado sin frontmatter y con enlaces
absolutos de GitHub; la fuente versionada conserva YAML. O `LICENSE` canónico
acompaña el paquete y se instala en `.pbai4devs/LICENSE`, sin modificar la
licencia del consumidor. Herramientas de terceros bajadas a la parte mantienen
sus propias licencias y no integran el TGZ del AgentDevKit.

## Instalar proyecto

Prepárelos [prerrequisitos](../guides/prerequisites.md), luego elija el destino:

```console
npx @pathbit/agentdevkit init
```

La orden anterior usa el npm público, sin iniciar sesión. Para GitHub Packages,
haga [Autentificación inicial](../guides/installation.md#github-packages) y
ejecute:

```console
npx --registry=https://npm.pkg.github.com @pathbit/agentdevkit init
```

Para repetir una instalación, fije la versión después del nombre, como
`@pathbit/agentdevkit@0.0.12`En los dos destinos.

Añadir `--agents codex,claude` Para seleccionar clientes, `--dry-run` para
simular o utilizar `update`, `doctor` e `sync --check` en el lugar de `init`. No
es necesario instalar globalmente ni añadir el kit a las dependencias de la
aplicación. Para conferir las versiones:

```console
npm view @pathbit/agentdevkit versions --json
```

Si hay un mapeo de `@pathbit` que impida cambiar el destino, siga el
[diagnóstico de registry][fix].

## Publicar por Actions

La publicación usa lo mismo TGZ aprobado por el CI en los dos registries. El
workflow confiere versión, origen e integridad; una versión existente sólo es
aceptada cuando contiene los mismos bytes. No reempacote ni reempacote una
versión publicada.

El workflow prioriza el secreto del repositorio `NPMJS_TOKEN`, recibido por la
variable interna `NPM_TOKEN` Solo en la publicación. El token necesita permitir
publicar en el alcance `@pathbit`; credenciales nunca entran en los archivos
versionados.

El paso de GitHub Packages usa `GITHUB_TOKEN` com `packages: write` y confirma
la visibilidad pública. Tokens de un registry no se envían al otro. El npm
continúa usando `NPMJS_TOKEN` o OIDC, con prueba de consumo anónimo; las pruebas
de GitHub usan autenticación propia.

Sin este secreto, el workflow usa OIDC. Configure **Trusted Publisher** npm:

| Campo | Valor |
| --- | --- |
| Organization or user | `pathbit` |
| Repository | `AgentDevKit` |
| Workflow filename | `release.yml` |
| Allowed action | Publicación directa con `npm publish` |

El fallback recibe `id-token: write`. El npm exige CLI 11.5.1+ y Node 22.14+; el
proyecto usa Node 24. Configure la relación de confianza después de que el
paquete exista; la primera publicación puede utilizar el secreto `NPMJS_TOKEN`.

Por defecto, una etiqueta publica en los dos destinos. Para completar GitHub
Packages de una etiqueta existente, sustituya `vX.Y.Z` por la etiqueta deseada:

```console
gh workflow run Release -f tag=vX.Y.Z -F package_only=true -f registry=github
```

Si el artefacto expiró, reejecute el CI del push a la branch principal para el
commit exacto apuntado por la etiqueta. `registry` acepta `both`, `npm` o
`github`. `package_only` impide cambiar la release existente; cada registry
rechaza versiones con bytes diferentes y pula la publicación si la misma versión
ya está correcta.

Después del envío a npm, job consulta el nombre y la versión publicada y baja el
tarball sin credenciales, en caché inicialmente vacío. Confiere el SHA-256 de
los bytes descargados con el artefacto aprobado y reutiliza el caché aislado
para ejecutar `--version`, `init`, `doctor` e `sync --check` offline a partir
del tarball verificado. La resolución por nombre y ejecución son pruebas
separadas. Compruebe también que `latest` apunta para la versión estable y que
el tarball es bable; metadatos visibles solos no comprueban una instalación
funcional. Si el registro todavía no proporciona el paquete, espere la
verificación sin republicar automáticamente la misma versión. Durante la
propagación, `E404` e `ETARGET` La descarga de tarball se repite dentro de la
misma ventana limitada.

GitHub Packages verifica las mismas órdenes con autenticación. Metadados deben
indicar visibilidad pública y asociación al repositorio correcto. Un fallo
parcial permite repetir sólo el destino pendiente usando el artefacto original;
nunca recluyé una versión publicada con otro contenido.

[Wiki](../README.md) · [Mantenimiento](maintenance.md) ·
[Instalación](../guides/installation.md)

[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[github]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[fix]: ../guides/troubleshooting.md#descargar-plataforma-o-herramienta-fallando

[reading-pt]: ../../maintainers/packages.md
[reading-en]: ../../en/maintainers/packages.md
[reading-es]: packages.md
