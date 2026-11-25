---
description: "Preguntas y archivos básicos del entorno después de decidir estack."
status: modelo
language: es
---

# Ambiente local

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Rellene las respuestas y archivos existentes. Este modelo no aprueba la
tecnología ni inicia el producto; copie los archivos-base sólo en la
configuración técnica autorizada y reemplace todos los parámetros antes de
ejecutar.

## Preguntas iniciales

| Tema | Qué aclarar |
| --- | --- |
| Objetivo | Proyecto nuevo, desarrollar existente o reparar qué error? |
| Máquina | SO/arquitetura, Docker/Compose, recursos y restricciones disponibles? |
| Aplicación | Linguagem/runtime, versiones, gestor, lockfiles y Dockerfile? |
| Servicios | Banco y versión, caché, filas, integraciones y servicios externos? |
| Acceso | Puerta deseada, aplicações/hosts ¿Y la necesidad de Traefik? |
| Datos | Creedenciales, volúmenes existentes, migraciones y datos que preservar? |
| Verificación | Órdenes build/test/lint, salud y flujo real a probar? |

Si la puerta es desconocida, elija una libre después de verificar conflictos y
registre la decisión. Secretos se quedan fuera de Git; ejemplos contienen solo
nombres y valores ficticios. Imágenes y versiones siguen decisiones del stack.

## Archivos-base

- [Compose](../../../../../.pbai4devs/templates/ambiente-local/compose.local.yml.template)Copie
  `infra/compose/compose.local.yml`;
  defina imagem/build, puerta, healthcheck y los servicios necesarios.
- [Makefile](../../../../../.pbai4devs/templates/ambiente-local/Makefile.template)Copie
  `Makefile`; configure las órdenes de
  build/test/lint/saúde de la stack, preservando objetivos existentes.
- [Dockerignore](../../../../../.pbai4devs/templates/ambiente-local/dockerignore.template)Copie
  `.dockerignore` y adapte al
  contexto de build; mantenga código, fixtures y manifests necesarios.

A [regla de entorno](../../rules/ambiente-local/RULE.md) define la estructura
obligatoria y el uso seguro de Docker/Traefik. Ninguno de estos modelos
sustituye a un Dockerfile real o verifica el producto sin build y ejecución.

Makefile usa [`up --wait`][up] Para esperar salud. Compose usa [variables
obligatorias][variaveis] Para evitar la ejecución con parámetros esenciales
ausentes.

[up]: https://docs.docker.com/reference/cli/docker/compose/up/
[variaveis]: https://docs.docker.com/reference/compose-file/interpolation/

[reading-pt]: ../../../../../.pbai4devs/templates/ambiente-local/TEMPLATE.md
[reading-en]: ../../../../en/kit/templates/ambiente-local/TEMPLATE.md
[reading-es]: TEMPLATE.md
