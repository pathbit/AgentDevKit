---
description: "Índice de la estructura compartida de los agentes."
language: es
---

# Recursos de AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

`.pbai4devs` es el origen compartido de los recursos instalados por AgentDevKit.
Para el orden de trabajo y las órdenes, lea [INSTRUCTIONS.md](INSTRUCTIONS.md).
El catálogo local `catalog.json` Se genera de las fuentes por sincronizador.
Incluye recursos, herramientas, automaciones, modelos y referencias externas.
Los archivos `skills.json`, `rules.json` e `agents.json` Son índices auxiliares
de las fuentes. Los clientes seleccionados utilizan sus directorios de
apuntamientos. El estado `state/agentdevkit.json` guarda la selección en
`clients`, con los IDs elegidos o uno de los modos `all` e `none`. El manifiesto
local `espelhos.conf` registra como sincronizador proyecta esta selección.
Catálogos, manifiesto y estado son derivados locales. Las carpetas nativas
también pueden contener archivos humanos. El equipo decide qué versionar. En el
repositorio del kit, el código del producto está en `src/`, `bin/`, `tests/` e
`scripts/release/`, en la raíz. Use `agents` para consultar, `agents add <id>`
para añadir y `agents remove <id>` Para sacar clientes. `none` prepara solo el
hub y `AGENTS.md`. `all` incluye a los clientes activos.
El hub está completo; los clientes pueden compartir carpetas necesarias.

| Carpeta | Para qué sirve |
| --- | --- |
| [skills](skills/README.md) | Procedimientos de tareas y sus creadores |
| [agents](agents/README.md) | Perfiles para revisión y delegación |
| [commands](commands/README.md) | Casos de uso y encaminamiento |
| [rules](rules/README.md) | Orientaciones aplicadas por contexto |
| [templates](templates/README.md) | Plantillas para documentos futuros |
| [scripts](scripts/README.md) | Automaciones y selección de herramientas |
| [tools](tools/README.md) | Definiciones versionadas e instalaciones locales ignoradas |
| [external-skills][externas] | Catálogo curado y descargas locales |

Solamente `SKILL.md`, `AGENT.md`, `COMMAND.md` e `RULE.md` En sus carpetas se
han identificado las herramientas. El origen se agrupa; los destinos usan el
diseño registrado. Vea [compatibilidad](COMPATIBILIDADE.md) Los recursos
auxiliares y las guías se encuentran exclusivamente en `.pbai4devs`. La licencia
del kit está en `LICENSE` dentro de este hub después `init` o `update`. Viene
del paquete y no sustituye la licencia del proyecto consumidor. Las pruebas de
las automaciones se encuentran en `scripts/<nome>/tests/`; guarde resultados en
directorio ignorados por el proyecto o temporal fuera del repositorio.
`.gitignore` de esta carpeta controla solamente su árbol; el kit preserva
ignores, índice y `.git/info/exclude` Los clientes no reciben ignorar nuevos.
Apuntamientos y artefactos pueden ser visibles en Git. Consulte con `git status`
e `git check-ignore -v -- <caminho>`; `git ls-files -- <caminho>` identifica
archivos ya rastreados, que no se eliminan del índice por una regla ignore. Use
los [modelos](templates/gitignore/TEMPLATE.md) Si el proyecto necesita
reglas adicionales. Use `agentdevkit plugins list` Para consultar las
herramientas y skills externas. Utilice sus guías para preparar una instalación
local o verificar el origen de una entrada. [Herramientas](tools/README.md) ·
[Skills externas][externas]

Los modelos acompañan cada fase. Después de implementar, use
`atualizar-documentacao` y la orden `revisar-entrega` Para cerrar documentación,
revisión y evidencia.

Use el [orden sincronizar](commands/sincronizar/COMMAND.md) para actualizar los
apuntes; el script también acepta `--check` Para solo conferirlos. Los [ejemplos
de madurez](scripts/testar-maturidade/README.md) Se encuentran en una carpeta
temporal fuera de Git, con copias de la estructura e informes locales.

[externas]: external-skills/README.md

[reading-pt]: ../../../.pbai4devs/README.md
[reading-en]: ../../en/kit/README.md
[reading-es]: README.md
