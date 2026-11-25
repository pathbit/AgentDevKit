---
description: "Catálogo de CLIs y herramientas condicionales para los agentes."
language: es
---

# Herramientas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Cada carpeta mantiene `TOOL.json`, `SCRIPT.mjs` y una guía. El catálogo local
`catalog.json` relaciona estas definiciones a las órdenes de instalación,
actualización, verificación y ejecución. Al editar definiciones, rode
`sincronizar-agentes` e `--check`; versiones instaladas se encuentran en el
estado local. Para npm, el instalador consulta `latest` y usa
`--ignore-scripts`. Scanners nativos usan versiones y SHA-256 revisados en
`TOOL.json`; `update` aplica este pin. Los paquetes y el estado se quedan en
`<nome>/.local/`; caché en `.cache/` y accesos rápidos en `bin/`, todos
ignorados. Tools se quedan solo en `.pbai4devs`.

| CLI | Grupo | Uso |
| --- | --- | --- |
| [agent-browser][browser] | base | Automación web. |
| [markdownlint-cli2][lint] | base | Lint de Markdown. |
| [agent-desktop][desktop] | escritorio | Automación desktop. |
| [skills][skills] | discovery | Descubrimiento de skills. |
| [just-bash][bash] | shell | Shell en sistema virtual. |
| [opensrc][source] | source | Fuentes de dependencias. |
| [Webreel][video] | video | Rutas y videos del navegador. |
| [portless][proxy] | proxy | Proxy y URLs locales estables. |
| [gitleaks](gitleaks/README.md) | security | Secretos en archivos y Git. |
| [osv-scanner](osv-scanner/README.md) | security | Dependencias con base local. |
| [opengrep](opengrep/README.md) | security | Código con reglas locales. |
| [openspec](openspec/README.md) | workflow | Validación y archivo de deltas. |
| [dotcontext-mcp](dotcontext-mcp/README.md) | workflow | Servidor local MCP vía stdio. |

`setup` instala y verifica los CLIs compatibles de la selección general. El
grupo `base` selecciona navegador y lint. El grupo `security` selecciona los
tres escáneres. Las herramientas del grupo `workflow` exigen selección explícita
por el nombre o el grupo. La selección general `all` pula esas entradas.

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup workflow
```

Las bases de vulnerabilidades se preparan separadamente; instalar el CLI No
transforma una base ausente en resultado limpio. Consulte Node/npm el [primer
uso][manager] antes de ejecutar los scripts. El instalador utiliza el mismo Node
24+ con npm en todos los sistemas. Plataformas aceptadas se encuentran en cada
`TOOL.json`; ausencia de restricción npm no comprueba prueba del SO.

```console
node .pbai4devs/tools/skills/SCRIPT.mjs install
node .pbai4devs/tools/skills/SCRIPT.mjs update
node .pbai4devs/tools/skills/SCRIPT.mjs check
node .pbai4devs/tools/skills/SCRIPT.mjs run --version
```

Utilice los mismos comandos en macOS, Linux y Windows. `install` reutiliza una
instalación sana; `update` consulta `latest`; `check` verifica sin red; `run`
ejecuta sin instalar; `info` muestra la configuración. Sin acción, hay ayuda.
`unlock <nome>` en el instalador solo recupera los locks locales de procesos
comprobados cerrados; preserva los locks activos o de origen incierto.
[instalador común][manager] acepta nombres o grupos, como `setup`, `install
base`, `update video`, `check source` e `list`.

La preparación verifica el CLI; los flujos de aplicación necesitan pruebas
específicas. [flujo de seguridad](../commands/auditar-seguranca/COMMAND.md)
Utiliza análisis offline e informes redactados. Descargas públicos requieren
red, no cuenta. Skills usa descubrimiento sin importación automática o symlinks.
Portless es opt-in: la preparación no inicia proxy. Webreel exige ejecutables
explícitos para grabar sin descargar recursos en `~/.webreel`; su guía lista los
overrides. Use caminos de estado soportados por `envPaths`, sin alterar `HOME`.
Versione pruebas y guiones; resultados, videos y capturas se encuentran en
`.agent-tests/`.

Otras candidatas están condicionadas a la necesidad, con adopción después de
definir producto y arquitectura; esta configuración no añade dependencias a la
aplicación.

| Candidata | Cuando se considere |
| --- | --- |
| [emulate][emulate] | Emular servicios usados por las integraciones y por el CI. |
| [agent-eval][eval] | Comparar agentes con credenciales e infraestructura. |
| [issue-graph][issues] | Consultar issues via `gh` o Linear autenticado. |
| [konsistent][consistency] | Aplicar patrones estructurales en un proyecto TS. |
| [phase][performance] | Analizar rendimiento de un frontend existente. |
| [dev3000][debug] | Depurar servidor/browser con runtime y proxy preparados. |
| [Bash-tool][sdk], [AI SDK][ai] | Implementar agentes en el stack aprobado. |

`next-browser` Está archivado. `before-and-after` es una skill en el código
actual; el antiguo CLI npm no representa este formato. Las colecciones
`agent-skills` Son fuentes de skills, no CLIs adicionales. Importe recursos por
el flujo del proyecto.

[browser]: agent-browser/README.md
[lint]: markdownlint-cli2/README.md
[desktop]: agent-desktop/README.md
[skills]: skills/README.md
[bash]: just-bash/README.md
[source]: opensrc/README.md
[video]: webreel/README.md
[proxy]: portless/README.md
[manager]: ../scripts/preparar-ferramentas/README.md
[emulate]: https://github.com/vercel-labs/emulate
[eval]: https://github.com/vercel-labs/agent-eval
[issues]: https://github.com/vercel-labs/issue-graph
[consistency]: https://github.com/vercel-labs/konsistent
[performance]: https://github.com/vercel-labs/phase
[debug]: https://github.com/vercel-labs/dev3000
[sdk]: https://github.com/vercel-labs/bash-tool
[ai]: https://github.com/vercel/ai

[reading-pt]: ../../../../.pbai4devs/tools/README.md
[reading-en]: ../../../en/kit/tools/README.md
[reading-es]: README.md
