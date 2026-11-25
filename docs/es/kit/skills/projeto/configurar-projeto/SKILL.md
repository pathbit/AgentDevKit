---
name: configurar-projeto
description: "Organiza la preparación del producto y, después de las aprobaciones, comprueba la configuración técnica."
language: es
---

# Configurar proyecto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Inspecione solamente este repositorio. Para rotar o reparar proyecto existente,
use `preparar-dev`. Si el objetivo es entender y documentar el sistema en uso,
use [documentarlegado](../documentar-legado/SKILL.md). Mientras el usuario
configura solo los agentes, mantenga modelos en `.pbai4devs/templates/`. Al
configurar el kit, use los clientes de la solicitud o del estado. Si falta
selección, pregunte y aplique `--agents` o `agents` CLI. Sin respuesta
disponible, use `all` para la selección de clientes. En el primer uso, pase el
objetivo con `--purpose` o responda a la pregunta interactiva para orientar la
siguiente acción. Consulte Node y npm y prepare solamente las herramientas
necesarias para la tarea.

## Preparación del producto

Haga el inventario con `atualizar-documentacao`. Cuando comience el producto,
reaproveche decisiones y documentos. Cree o retome
`.pbai4devs/state/configuracao/ESTADO.md` el modelo y la combinación en el que
se encuentran PRD, UX/UI, diseño, roadmap, releases, specs, tareas y documentos
de apoyo. Evolua READMEs por [modelos de fase](../../../templates/README.md).
Registra pruebas de la preparación y encaminhe la primera etapa pendiente con
`proximos-passos`. La elección del stack ocurre en el diseño.

## Configurar tecnología

Exija PRD, diseño, spec y plan aprobados. UX/UI requiere aprobación o
justificación de no aplicación aprobada. Preserve aprobaciones existentes y siga
el plan. Decisiones materiales faltantes vuelven al diseño.

- Use [diagnosticar](../../../commands/diagnosticar/COMMAND.md). Si la consulta
  a Docker falla, relate **no verificado**. Sin red permitida y sin contexto
  Docker comprobadamente local, use `--no-docker-probe`. Complete vacíos con las
  preguntas del [modelo de entorno][ambiente].
- Prepare herramientas compatibles con SO y arquitectura vía
  `preparar-ferramentas`. Reutilize instalaciones, stack y lockfiles. Aplique la
  [estructura obligatoria][estrutura] para Makefile, Compose, dockerignore,
  servicios, healthchecks, puertas y volúmenes. Preserve o configure
  `.editorconfig` requerido por la estructura. Configure VS Code cuando adoptado
  y complete el ignore con patrones de stack. Compruebe que fuentes, scripts,
  pruebas y fixtures sean versionables.
- Documente versiones, estructura, órdenes y origen de la plantilla o init.
  Compruebe runtime, Compose, salud de la infraestructura y `inspecionar-projeto
  --check` com `verificar-trabalho`. Regístrate `configuracao_tecnica:
  concluido` Sólo con prueba de las dependencias y servicios obligatorios. Antes
  de eso, mantenga el código de la aplicación fuera de la etapa. Si ya hay
  aplicación, pruebe el flujo real. Si todavía no hay, mantenga build, salud y
  flujo de ella pendientes.

Después de cambios técnicos, concluya `revisar-entrega`. Sincronice y compruebe
`--check` Sólo cuando los recursos agénticos cambien.

[ambiente]: ../../../templates/ambiente-local/TEMPLATE.md
[estrutura]: ../../../rules/ambiente-local/RULE.md

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/configurar-projeto/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/configurar-projeto/SKILL.md
[reading-es]: SKILL.md
