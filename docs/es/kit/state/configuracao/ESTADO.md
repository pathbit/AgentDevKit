---
description: "Inventario inicial de la configuración de AgentDevKit."
preparacao: concluido
configuracao_tecnica: concluido
ambiente_local:
  compose: infra/compose/compose.local.yml
  porta: null
  host: null
  ferramentas: .pbai4devs/tools/
documentos:
  readme: README.md
  contribuicao: CONTRIBUTING.md
  changelog: CHANGELOG.md
  seguranca: docs/guides/security.md
  adrs: null
  prd: docs/product/prd.md
  ux_ui: docs/product/ux-ui.md
  design: docs/product/design.md
  roadmap: docs/product/roadmap.md
  releases: null
  specs: docs/specs
  tarefas: docs/tasks
language: es
---

# Configuración del proyecto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Inventario

O PRD, la experiencia de CLI y el diseño existentes están registrados como
aprobados. El roadmap y el índice de specs registran el trabajo y sus
auditorías. El inventario no comprueba la implementación de cada criterio. Una
inspección local con `inspecionar-projeto` identificó los documentos existentes;
los resultados necesitan ser nuevamente registrados como evidencia compartida.

## Preparación y configuración técnica

- La preparación y la configuración técnica fueron conferidas en el ambiente
  local descrito abajo. Su conclusión no demuestra que el producto esté sin
  defectos.
- El proyecto es una CLI Node.js; no fue identificado servidor, puerta o
  servicio persistente. Compose registrado ejecuta a CLI y termina.
- Prerrequisitos, herramientas, build y flujo básico fueron verificados en el
  ambiente utilizado; los límites de plataforma y las pruebas pendientes son
  reales.
- Conciliar los criterios históricos de rollback con la evolución de
  recuperación antes de considerarla lista para la implementación.

## Evidencias locales de preparación

El 15 de noviembre de 2026, el diagnóstico identificó macOS ARM64, Node
`26.13.0`, npm `11.20.0`, Git disponible y Docker/Compose con daemon accesible.
O `setup all` instaló o reutilizó las 11 herramientas compatibles y confirmó sus
versiones; el diagnóstico posterior no apuntó herramientas ausentes. Las
evidencias locales están en `.agent-tests/preparacao-recuperacao-o83wpC/`.

La prueba del gestor de herramientas pasó en 115 casos. Las siete pruebas
funcionales de herramientas de Vercel pasaron con fixtures; ellas no ejecutan
navegador, producto, proxy, TLS o grabación de vídeo. El informe local está en
`.agent-tests/vercel-labs/smoke-vKkYOM/REPORT.json`.

Seis pruebas estrictas de recuperación fallaron al reproducir la pérdida de
sustitutos humanos en el instalador y el sync, incluso después de la
actualización del instalador. Un séptimo identificó llamadas mutadoras después
de la falla. Estas pruebas reproducen defectos del producto, no
biodisponibilidad de Docker o runtime. Ellas impiden declarar la recuperación
segura o aprobar una release. La conciliación del contrato histórico de rollback
sigue pendiente.

Una fixture con contenido humano sintético confirmó que una copia de seguridad
puede verse a Git cuando el proyecto no lo ignora; el índice y los ignores
permanecieron intactos. Las guías ahora orientan conferir la visibilidad antes
de añadir archivos a Git.

Una prueba temporal con Compose ejecutó el paquete candidato local `0.0.30` En
Node 24, sin red, sobre un proyecto sintético preexistente. Las seis operaciones
han conservado archivos humanos y los archivos Git monitorizados. Esto no
demuestra recuperación concurrente, Windows o configuración permanente del
proyecto.

El 15 de noviembre de 2026, antes de la configuración permanente,
`inspecionar-projeto --check` identificó ausencia de
`infra/compose/compose.local.yml`, `.dockerignore` e `Makefile` y regresó a un
contrato incompleto. El inventario documental terminó sin advertencias o
truncamiento. El informe local está en
`.agent-tests/revisao-recuperacao-2a5Fou/inventario.json`. La aplicación es una
CLI de ejecución corta, sin servidor o puerta.

Se han añadido Compose, `.dockerignore` e `Makefile`. El diagnóstico, `make
setup`, `make up` e `make lint` Han pasado en macOS; la CLI fue ejecutada en el
contenedor Linux Node 24, sin red. El build pasó en copia temporal; el artefacto
anterior de `0.0.30` Se ha conservado. La prueba del contexto Docker confirmó
siete archivos mantenidos y 37 excluidos en fixture sintética. Después de estos
ajustes, `inspecionar-projeto --check` registró un contrato estructural
completo. Las revisiones identificaron riesgos en el build directo y en la
recuperación; los hallazgos permanecen abiertos y impiden declarar la entrega
completa.

Antes de la corrección puntual de permisos, `make test` terminó con 658
aprobaciones, una prueba NTFS ignorada y ocho TODOs. La reproducción de permisos
pasó después de la corrección en macOS y Linux; en la época, siete TODOs de
recuperación no ejecutaban las fixtures en la suíte estándar y fallaban en modo
estricto. Hoy son once casos portátiles pendientes después de incluir
actualización concurrente en sync y limpieza después de publicación, dos casos
adicionales de copia de seguridad concurrente, cuatro de metadatos y seis de
protección de archivo en macOS, y tres de xattr en Linux. Las seis nuevas
pruebas verifican rechazo por ACL o flag inmutable en el estado observado; el
update usa legado sintético. La suíte estándar anterior no comprueba la
corrección. Logs están en `.agent-tests/configuracao-cli-8AkUjb/`.

[reading-pt]: https://github.com/pathbit/AgentDevKit/blob/main/.pbai4devs/state/configuracao/ESTADO.md
[reading-en]: ../../../../en/kit/state/configuracao/ESTADO.md
[reading-es]: ESTADO.md
