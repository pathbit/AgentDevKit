---
description: "Cómo desarrollar, verificar y documentar AgentDevKit."
language: es
---

# Contribuir

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use [issues][issues] para bugs y propuestas. Describe el contexto, la versión y
los pasos necesarios, eliminando secretos y datos privados.

## Preparar el checkout

Use Git y Node.js 24+ con npm:

```console
git clone https://github.com/pathbit/AgentDevKit.git
cd AgentDevKit
git switch develop
npm ci --ignore-scripts
npm run check
```

El checkout contiene fuentes. Ejecute `npm run examples` para explorar los
agentes en una carpeta temporal fuera de Git, informada por la orden. Para
elegir un destino local ignorado, consulte la guía en
[`examples/`](examples/README.md).

Este repositorio solo mantiene `develop` para la integración y `main` para la
versión pública. En el checkout del kit, troque de branch con `git switch`.
Contribuciones de forks apuntan para `develop`. A [mantenimiento][release]
describe la promoción a `main`.

## Elegir el origen del cambio

| Cambio | Origen |
| --- | --- |
| CLI e instalación | `src/` e `bin/` |
| Layout de clientes | `.pbai4devs/templates/clients/` |
| Skills, reglas y órdenes | Envases carpetas `.pbai4devs/` |
| Automatización compartida | `.pbai4devs/scripts/` |
| CI y publicación | `scripts/release/` y workflows de GitHub |
| Pruebas del producto | `tests/` |
| Ejemplos de uso | `examples/` y generador compartido |
| Ayuda y ejemplos | `docs/` e README del recurso |

Lea el [guía del código fuente][source] e o [diseño](product/design.md).
Modifique fuentes y plantillas, no catálogos, estado o archivos de los clientes.

## Comprobar y enviar

```console
npm test
npm run test:infra
npm run check
```

Elija comprobaciones adicionales por el impacto del cambio. Instalación requiere
proyectos nuevos y existentes; Git requiere preservación del índice y de los
archivos; distribución requiere el paquete real. Consulte [pruebas][tests]. O
[guía de desarrollo][source] explica cómo incluir lint Markdown.

Mantenga pruebas y fixtures versionados. Informes, capturas, descargas,
apuntamientos y preferencias locales se ignoran. Revise el diff antes de enviar
y confirme que contiene solamente fuentes y cambios intencionales.

Actualiza la documentación y use la [revisión de entrega][review] Para reunir
criterios, evidencias y revisión independiente. El PR debe explicar problema,
solución y validación. Siga las [reglas Git][git]. A [publicación][release]
reutiliza el artifact aprobado del CI de `main`. El mismo tarball sigue para el
[npm público y GitHub Packages][package], con autenticación de workflow.
Mantenga tokens fuera del código y del `.npmrc` versionado.

[Wiki](README.md) · [Licencia MIT](../../LICENSE)

[issues]: https://github.com/pathbit/AgentDevKit/issues
[source]: maintainers/development.md
[tests]: guides/tools-and-testing.md
[review]: kit/commands/revisar-entrega/COMMAND.md
[git]: kit/rules/git/RULE.md
[release]: maintainers/maintenance.md
[package]: maintainers/packages.md

[reading-pt]: ../../CONTRIBUTING.md
[reading-en]: ../en/CONTRIBUTING.md
[reading-es]: CONTRIBUTING.md
