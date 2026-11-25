---
description: "Preparo de las herramientas y selección de verificaciones reales."
language: es
---

# Herramientas y pruebas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El kit trae definiciones y automaciones. Instalar el kit no instala todas las
tools ni elige el stack de la aplicación. Consulte [catálogo][tools].

## Runtime y preparación

El núcleo usa Node.js 24+ con npm. El launcher acepta Node 18+ y prepara el
runtime actual cuando sea necesario. Sin Node, el agente necesita instalarlo por
el mecanismo del sistema operativo antes de iniciar `npx`; siga los
[Prerrequisitos por sistema](prerequisites.md).

Para preparar solamente el runtime a partir del hub:

```console
node .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --runtime-only
```

El mismo JavaScript atiende a los sistemas soportados. No hay bootstrap
PowerShell, SH o Bash en el kit. El ejecutable nativo `tar` se utiliza sin shell
para extraer el archivo oficial después de conferir SHA-256. Vea. [guía de
bootstrap][bootstrap].

Para preparar una herramienta del catálogo, consulte el [guía de
complementos][plugins]. Si necesita preparar un grupo de herramientas, ejecute
desde el hub:

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup
```

`setup` reutiliza instalaciones saludables y verifica las compatibles. Un nombre
o grupo limita la selección. Herramientas con selección obligatoria, como las
del grupo `workflow`, exigen un ID o grupo explícito. `check`, `info` e `run`
operan sobre la instalación disponible. Descargas, cachés y recibos permanecen
locales e ignorados. El administrador rechaza enlaces simbólicos en los caminos
que escribe o usa como estado local; la actualización no sigue estos enlaces
fuera de la instalación.

## Elegir la prueba

| Cambio | Verificación |
| --- | --- |
| Lógica o API | Pruebas y asertivas de resultado. |
| Flujo web | Navegador real, acciones y resultado visible. |
| Aplicación desktop | Abrir la aplicación y ejecutar el flujo. |
| Documento visual | Renderizar o abrir el artefacto e inspeccionar. |
| Generador y Git | Instalar, sincronizar y comparar arquivos/índice. |

Use [verificar trabajo][verify] Para vincular aceptadas a las pruebas. Web puede
usar [agent-browser][browser] o el conector Playwright; desktop puede usar
[agent-desktop][desktop]. Revise consola, red, permisos y efectos reales. Una
captura aislada no muestra el funcionamiento completo.

## Comprobar AgentDevKit

En el checkout, `npm test` comprobar el producto; `npm run test:infra` verifica
las automaciones compartidas; `npm run check` valida las fuentes. Los perfiles
de [CI](../maintainers/maintenance.md) evitan repetir la suítis completa en cada
sistema.

Las pruebas del producto se encuentran en `tests/`, en la raíz. Las pruebas
compartidas quedan en `scripts/<nome>/tests/` dentro del hub. En una aplicación
atendida, el código de pruebas sigue los directorios acordados para ese
proyecto.

A [matriz de madurez][matrix] Utiliza ocho proyectos sintéticos. Ella comprueba
contratos del kit; no aprueba un producto real ni certifica todas las
aplicaciones. Los dictámenes simulados de esta matriz no sustituyen revisión
independiente. Use `npm run examples` Para generar ejemplos de inspección. `npm
run test:examples` crea nuevas copias temporales y ejecuta los escenarios. O
[guía de ejemplos][examples] explica cada escenario; el [guía de
desarrollo](../maintainers/development.md) reúne las verificaciones del
repositorio.

## Guardar los resultados

Versione código de pruebas y fixtures. Guarde informes, capturas, videos,
descargas y salidas Playwright en caminos ignorados por el proyecto y consulta
con `git check-ignore -v -- <caminho>`. Registra el resultado de cada
verificación y cierre la entrega por [revisión][review].

[Wiki](../README.md) · [Recursos](resources.md)

[tools]: ../kit/tools/README.md
[plugins]: plugins.md#consultar-e-instalar
[bootstrap]: ../kit/scripts/preparar-ferramentas/BOOTSTRAP.md
[verify]: ../kit/skills/projeto/verificar-trabalho/SKILL.md
[browser]: ../kit/tools/agent-browser/README.md
[desktop]: ../kit/tools/agent-desktop/README.md
[matrix]: ../kit/scripts/testar-maturidade/README.md
[review]: ../kit/commands/revisar-entrega/COMMAND.md
[examples]: ../examples

[reading-pt]: ../../guides/tools-and-testing.md
[reading-en]: ../../en/guides/tools-and-testing.md
[reading-es]: tools-and-testing.md
