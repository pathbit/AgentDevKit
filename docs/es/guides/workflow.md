---
description: "De la preparación del kit a la implementación y revisión de una entrega."
language: es
---

# Flujo de trabajo

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

[Documentación](../README.md) · [Instalación](installation.md) ·
[Recursos](resources.md) · [Herramientas y pruebas](tools-and-testing.md)

Instalar AgentDevKit prepara las instrucciones y modelos. El flujo de trabajo
parte de su objetivo y de las decisiones que el proyecto ya ha registrado.

## 1. Identificar la situación

Elija los clientes que utiliza durante la [instalación](installation.md). En el
chat de un agente desktop, informe qué clientes desea preparar. En la raíz del
proyecto instalado con Git, consulte el kit y consulte la siguiente etapa:

```console
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
npx @pathbit/agentdevkit next
```

`next` usa el estado encontrado para sugerir una acción. En el cliente de IA,
pida que el agente lea `AGENTS.md` y siga la skill indicada para su objetivo. El
inventario muestra los archivos y estados declarados. La aprobación depende de
las decisiones y las evidencias correspondientes. [Referencia de CLI](cli.md)

| Situación | Orden o recurso inicial |
| --- | --- |
| Sólo preparar a los agentes | `init --purpose agents`. |
| Proyecto nuevo, aún sin decisiones | `next --intent product` · [configurar proyecto][configurar]. |
| Aplicación existente que necesita girar | `next --intent run` · [preparar dev][preparar]. |
| Sistema en uso que necesita ser documentado | `next --intent document` · [documentarlegado][legado]. |
| Evoluir un proyecto | `next --intent product` con los documentos ya adoptados. |

Las órdenes de la tabla utilizan el prefijo `npx @pathbit/agentdevkit`. Para
inventariar antes de instalar, use `npx @pathbit/agentdevkit document`. O [guía
de documentación][inventario] muestra cómo comprobar comportamientos en el
código y en las pruebas y completar los documentos existentes.

## 2. Combinar las preguntas al principio

Antes de crear documentos, [inventarie y lea lo que existe](documentation.md).
Reutilice los caminos y complemente vacíos, sin reemplazar por la plantilla.
Reúna las dudas que alteran objetivo, alcance, dependencias o criterios. Use las
respuestas ya registradas por el usuario o por el proyecto. Elija los documentos
y las herramientas conforme el objetivo de la solicitud.

```text
Use configurar-projeto. Primeiro leia o repositório e reúna as dúvidas.
Neste momento quero apenas preparar os agentes; não crie produto ou aplicação.
```

Cuando el producto empiece, combine los caminos de los documentos en el estado
de configuración. No presuma que todo proyecto utiliza las mismas carpetas de
documentos. El registro es `.pbai4devs/state/configuracao/ESTADO.md`.

## 3. Definir producto y experiencia

[crear-prd][prd] define problema, público, alcance, límites y éxito esperado.
[crear-ux-ui][ux] define jornadas y interfaz. Cuando UX/UI no se aplicará,
registre la justificación y su aprobación; ausencia de archivo no significa
aprobación. Los modelos se rellenarán con respuestas reales.

Cada documento comienza como borrador. Una modificación material exige revisar
su aprobación y el impacto en los documentos dependientes.

## 4. Aprobando el diseño técnico

[crear diseñodoc][design] Utiliza el producto aprobado para definir
arquitectura, tecnología, integraciones, riesgos y alternativas. Esta etapa
registra decisiones; no debe iniciar la aplicación antes de la aprobación del
trabajo necesario.

[administrar-roadmap][roadmap] organiza incrementos, dependencias y releases. No
invente fechas o funcionalidades futuras para llenar la planificación.

## 5. Crear unaspec ejecutable

[crearspec][spec] exige PRD/design aprobados y UX/UI aprobado o justificado.
spec delimita un incremento y vincula sus criterios, como `AC-001`, a las
pruebas planificadas: método, prerrequisito, asertiva y evidencia local.

```text
Use criar-spec para este incremento. Reúna as dúvidas antes de escrever.
Vincule os documentos existentes e defina como provar cada critério de aceite.
```

## 6. Aprobando el plan antes de aplicar

[implementar-spec][implementar] comienza en lectura y planificación: examina la
spec, el código, las dependencias y las dudas restantes. Presenta tareas,
decisiones, riesgos y verificación, aguardando la aprobación necesaria del plan.

Después del plan aprobado, complete la configuración técnica que falta
utilizando las decisiones ya aprobadas. Sólo marque la configuración como
terminada con prueba. Implemente el alcance de la spec; no antecipe recursos de
ciclos futuros.

## 7. Prueba y revisión de la entrega

Use [verificar trabajo][verificar] para ejecutar las pruebas pertinentes. Código
y fixtures de prueba se versionan; informes y capturas se encuentran en
`.agent-tests/<referencia>/<execucao>/`, ignorados por Git.

[actualizar-documentacao][documentacao] mantiene los documentos afectados
coherentes. [orden revisar entrega][revisao] reúne criterios, evidencias y
revisión independiente. Su flujo es `prepare` → revisión → `seal` → `check`.
Criterio sin prueba, fallo o revisión pendiente impide concluir la entrega.

## En un proyecto existente

En la carpeta donde está instalado el kit, pregunte por dónde empezar.

```console
npx @pathbit/agentdevkit next --intent run
```

En un monorepo con instalación compartida, comience por la raíz e informe al
módulo al agente. Si el módulo tiene su propio kit, introduzca su carpeta con
`--target`. La versión en desarrollo muestra caminos para conferir antes de la
ejecución. [Cómo probar la versión local](cli.md#preparaci%C3%B3n-de-un-proyecto-existente)

Lea el README y los archivos indicados, como Compose o Makefile. Si el proyecto
usa un convenio propio, confirme la orden de inicio con el equipo. Pase el
módulo y estos archivos al agente junto con la petición.

```text
Quero rodar o módulo de relatórios. Leia o AGENTS.md e o README.
Mostre o comando de inicialização e como verificar se subiu.
```

Preserve datos, lockfiles, configuraciones y órdenes reales. Para un cambio
funcional, defina el alcance y los criterios de aceptación antes de implementar.

**[ Siguiente paso ]** Consulte `next` y use la skill indicada, preservando las
decisiones existentes. Consulte [recursos](resources.md) Si falta un flujo.

[configurar]: ../kit/skills/projeto/configurar-projeto/SKILL.md
[preparar]: ../kit/skills/projeto/preparar-dev/SKILL.md
[prd]: ../kit/skills/produto/criar-prd/SKILL.md
[ux]: ../kit/skills/produto/criar-ux-ui/SKILL.md
[design]: ../kit/skills/produto/criar-design-doc/SKILL.md
[roadmap]: ../kit/skills/specs/gerenciar-roadmap/SKILL.md
[spec]: ../kit/skills/specs/criar-spec/SKILL.md
[implementar]: ../kit/skills/specs/implementar-spec/SKILL.md
[verificar]: ../kit/skills/projeto/verificar-trabalho/SKILL.md
[documentacao]: ../kit/skills/projeto/atualizar-documentacao/SKILL.md
[inventario]: documentation.md#documentar-un-sistema-en-uso
[legado]: ../kit/commands/documentar-legado/COMMAND.md
[revisao]: ../kit/commands/revisar-entrega/COMMAND.md

[reading-pt]: ../../guides/workflow.md
[reading-en]: ../../en/guides/workflow.md
[reading-es]: workflow.md
