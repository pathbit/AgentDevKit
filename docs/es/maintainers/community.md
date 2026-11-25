---
description: "Cómo informar problemas y proponer mejoras para AgentDevKit."
language: es
---

# Participar de la evolución

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use as [AgentDevKit][issues] Para informar sobre problemas y sugerir mejoras.
Busque relatos similares antes de abrir un nuevo. Una reacción o un ejemplo
reproducible en la issue existente ayuda a reunir el contexto.

## Relatar un problema

Elija [Relatar un problema][bug]. El formulario pide versión del kit, sistema,
agente/editor, comando o acción, pasos, resultado esperado y observado. Logs son
opcionales: incluya solo el tramo necesario y elimine datos privados.

Si no sabe información, explique esto. Un ejemplo pequeño que reproduce el
problema suele ser más útil que un repositorio entero.

## Propor una mejora

Elija [Sugerir una mejora][feature] y describe el problema antes de la solución.
Informe quién se beneficia, un ejemplo de uso y cómo reconocer el resultado. El
formulario también acepta mejoras en la documentación.

Issues no son ejecutadas automáticamente por agentes. Una propuesta precisa de
selección y definición de alcance antes de que se ponga en práctica o release.
No hay plazo de atención prometido.

## Acompañar y contribuir

Los labels `bug`, `enhancement` e `documentation` Ayuda a clasificar el asunto.
Los Mantenedores pueden solicitar información, reunir duplicatas y vincular el
cambio a un PR. Consulte [roadmap](../product/roadmap.md) para el alcance
registrado.

Para contribuir con código o documentos, siga [Contribuir][contrib]. El modelo
de PR pide problema, cambio y verificación. Después de la revisión, los cambios
pasan por el CI; la publicación sigue el [flujo de releases](maintenance.md).

Issues y anexos de un repositorio público son públicos. No envíe tokens,
contraseñas, datos personales o acceso a servicios. Los resultados locales de
pruebas siguen fuera de Git, según se indica en el documento. [guía de
herramientas](../guides/tools-and-testing.md).

[Wiki](../README.md) · [Solución de problemas](../guides/troubleshooting.md)

[issues]: https://github.com/pathbit/AgentDevKit/issues
[bug]: https://github.com/pathbit/AgentDevKit/issues/new?template=bug_report.yml
[feature]: https://github.com/pathbit/AgentDevKit/issues/new?template=feature_request.yml
[contrib]: ../CONTRIBUTING.md

[reading-pt]: ../../maintainers/community.md
[reading-en]: ../../en/maintainers/community.md
[reading-es]: community.md
