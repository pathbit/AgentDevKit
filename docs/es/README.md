---
description: "Wiki de AgentDevKit, del primer uso al mantenimiento del kit."
language: es
---

# Documentación de AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit guarda las instrucciones compartidas en `.pbai4devs` y
genera referencias para los agentes de código que selecciones.

## Inicios rápidos

1. [Sigue el inicio rápido](../../README.es.md#inicio-r%C3%A1pido) para
   seleccionar agentes y hacer tu primera petición.
2. [Elige un flujo][flow] para planificar un producto, ejecutar una aplicación
   o documentar un sistema existente.
3. [Revisa los archivos generados][install] antes de añadir los cambios a Git.

| Quiero | Ruta |
| --- | --- |
| Instalar con Node.js y npm | [Instalación vía npx](guides/installation.md#instalar) |
| Elegir o cambiar agentes | [Comandos de selección](guides/cli.md#comandos) |
| Preparar una aplicación existente | [Ejecutar el proyecto](guides/workflow.md) |
| Documentar un sistema existente | [Inventariar y actualizar](guides/documentation.md) |
| Verificar la instalación | [Herramientas y pruebas][tests] |

## Consulta por objetivo

| Objetivo | Guía |
| --- | --- |
| Actualizar el kit o cambiar agentes | [Actualizar y elegir agentes][update] |
| Usar un flujo de planificación existente | [Comparar integraciones](guides/comparacao.md) |
| Personalizar recursos de agentes | [Recursos][resources] · [Clientes compatibles][clients] |
| Ver cómo se usan los recursos | [Recursos en práctica](guides/recursos-na-pratica.md) |
| Delegar y revisar el trabajo | [Perfiles y colaboración](guides/resources.md#expertos-y-colaboraci%C3%B3n) |
| Revisar los controles locales | [Escáneres y controles](guides/security.md) |
| Consultar opciones o la salida JSON | [Referencia de la CLI](guides/cli.md) |
| Elegir herramientas para una tarea | [Complementos y créditos](guides/plugins.md) · [Herramientas y pruebas][tests] |
| Resolver un problema | [Soluciones y recuperación](guides/troubleshooting.md) |

El [índice de guías](guides/README.md) reúne las referencias en orden de uso.

## Entienda los términos

| Final | Significado |
| --- | --- |
| Skill | Procedimiento que orienta decisiones y acciones de una tarea. |
| Regla | Orientación aplicable a un contexto de trabajo. |
| Orden | Entrada de un caso de uso con pasos, argumentos y salida. |
| Perfil de agente | Responsable de una tarea completa. |
| Adaptador | Traduz referencias al formato de cada cliente. |
| Espejo | Apuntamiento generado para un recurso del origen. |
| Template | Modelo que se rellenará con decisiones del proyecto. |
| Spec | Escopo de una entrega con criterios verificables. |
| Evidencia | Registro de una verificación realmente ejecutada. |

El agente lee y ejecuta las instrucciones conforme a las capacidades de su
cliente. A CLI instala, sincroniza y diagnostica archivos. Tener un indicador
correcto no comprueba que determinado cliente cargó o ejecutó la skill. O [guía
de recursos](guides/resources.md) muestra cómo se combinan estos componentes; no
existe una proporción obligatoria entre sus cantidades.

## Producto y mantenimiento

- [PRD](product/prd.md): problema, público, requisitos y límites.
- [Experiencia de CLI](product/ux-ui.md): interacción, idiomas y salidas.
- [Diseño técnico](product/design.md): componentes, estado y preservación de
  archivos.
- [Roadmap](product/roadmap.md) e [specs](specs/README.md): alcance de las
  entregas.
- [Tareas](tasks/README.md): trabajo y evidencias por incremento.
- [Changelog](CHANGELOG.md): cambios por versión.
- [Contribuir][contrib] · [Desarrollo][development] · [Ejemplos][examples].
- [Mantenimiento](maintainers/README.md) ·
  [Releases](maintainers/maintenance.md) ·
  [Publicación](maintainers/packages.md) ·
  [Comunidad](maintainers/community.md).

Esta wiki documenta **el AgentDevKit** y se ve en el código. Los proyectos que
reciben el kit usan los [templates](kit/templates/README.md) para sus
propios documentos, después de preguntas y decisiones. La instalación no copia
esta wiki para `docs/` del proyecto atendido.

Las guías y referencias están disponibles en [portugués de Brasil][reading-pt],
[inglés][reading-en] y [español][reading-es]. El idioma de la CLI determina
los mensajes de la herramienta y orienta la comunicación de los agentes.

[Volver al proyecto](../../README.es.md)

[install]: guides/installation.md#lo-que-est%C3%A1-en-el-proyecto
[update]: guides/installation.md#actualizar-y-elegir-agentes
[flow]: guides/workflow.md
[clients]: kit/COMPATIBILIDADE.md
[tests]: guides/tools-and-testing.md
[contrib]: CONTRIBUTING.md
[examples]: examples
[resources]: guides/resources.md
[development]: maintainers/development.md

[reading-pt]: ../README.md
[reading-en]: ../en/README.md
[reading-es]: README.md
