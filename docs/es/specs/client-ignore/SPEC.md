---
description: "Exclusión local de clientes con elección explícita del proyecto."
language: es
---

# Ignore de clientes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> Esta spec registra el contrato histórico de la release. La decisión posterior
> es no
> editar `.git/info/exclude` ni crear ni cambiar ignores en la raíz o en los
> clientes.
> Los ignores existentes en el hub también se conservan, aunque algunos archivos
> que sean visibles. La revisión y la validación están pendientes en
> [roadmap](../../product/roadmap.md).

Git no aplica `../` el `.gitignore` El kit usa exclusiones locales de Git y el
proyecto elige excepciones en su `.gitignore`.

## Criterios de aceptación

- AC-001: Carpetas de clientes son ignoradas por estándar en repositorios Git,
  sin modificar el `.gitignore` De la raíz.
- AC-002: Una excepción literal de la raíz, como `!/.claude/`, permite versionar
  al cliente y continúa válida después de la instalación, actualización y
  sincronización.
- AC-003: Credenciales y artefactos continúan protegidos; excepciones inseguras
  son informadas antes de cualquier cambio.
- AC-004: Los archivos humanos y el índice Git, incluidos los cambios
  preparados, se conservan. Los archivos ya rastreados continúan rastreados.
- AC-005: Documentación y pruebas explican y verifican prioridad, límites,
  clones, clientes compartidos, escenarios sin Git y sistemas soportados.

[reading-pt]: ../../../specs/client-ignore/SPEC.md
[reading-en]: ../../../en/specs/client-ignore/SPEC.md
[reading-es]: SPEC.md
