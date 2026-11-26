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

[Trusted Publishing de npm][trusted-publishing] usa OIDC y genera
procedencia automáticamente. Registra `pathbit/AgentDevKit` con el flujo
`release.yml`, deja el entorno vacío y habilita **Allow npm publish**.

Tras registrar la relación en npm, configura la variable del repositorio
`NPMJS_AUTH_MODE=oidc` en GitHub. Sin la variable, el flujo usa
`NPMJS_TOKEN` cuando está disponible. OIDC usa `id-token: write`,
npm 11.5.1+ y Node.js 22.14+. El runner usa Node.js 24.

GitHub Packages usa `GITHUB_TOKEN` con `packages: write`. El job de npm
verifica la descarga pública sin credenciales.

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

El job descarga el tarball desde npmjs sin credenciales, comprueba sus bytes
y prueba `--version`, `init`, `doctor` y `sync --check` en una caché aislada.
Comprueba que `latest` apunta a la versión publicada o a una versión estable
posterior. Una versión anterior puede verificarse si ya existen los mismos
bytes. Durante la propagación, el job espera la disponibilidad del tarball
sin intentar volver a publicarlo.

GitHub Packages verifica las mismas órdenes con autenticación. Metadados deben
indicar visibilidad pública y asociación al repositorio correcto. Un fallo
parcial permite repetir sólo el destino pendiente usando el artefacto original;
nunca recluyé una versión publicada con otro contenido.

[Wiki](../README.md) · [Mantenimiento](maintenance.md) ·
[Instalación](../guides/installation.md)

[trusted-publishing]: https://docs.npmjs.com/trusted-publishers/
[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[github]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[fix]: ../guides/troubleshooting.md#descargar-plataforma-o-herramienta-fallando

[reading-pt]: ../../maintainers/packages.md
[reading-en]: ../../en/maintainers/packages.md
[reading-es]: packages.md
