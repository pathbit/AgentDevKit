---
description: "Seguridad con escáneres locales, selección y pruebas de controles."
language: es
---

# Seguridad local

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

La instalación del kit incluye skills, reglas, órdenes y perfiles de seguridad.
Los escáneres están preparados por una acción explícita; los archivos de
instrucción no inician auditorías, servicios o descargas en segundo plano.

## Cómo los componentes trabajan juntos

La orden [Auditar aseguranca][audit] organiza el trabajo. A [skill
revisión][review] define como analizar y el [auditor][auditor] hace la selección
contextual. El script ejecuta herramientas y produce evidencias; las
[reglas][rules] orientan todas las etapas. Vea el [catálogo de
órdenes](../../commands/README.md).

| Herramienta | Pregunta que ayuda a responder |
| --- | --- |
| [Gitleaks][gitleaks] | ¿Hay indicios de secretos en los archivos analizados? |
| [OSV-Scanner][osv] | ¿La base local conoce fallas en las versiones de las dependencias? |
| [Opengrep][opengrep] | ¿El código corresponde a los estándares de las reglas locales? |

Las herramientas ejecutan localmente y no requieren cuenta o firma. Versiones
revisadas y sus orígenes se quedan en `TOOL.json`. Descargas públicas de
binarios y bases están separados del análisis. La política del cliente/modelo de
IA sigue siendo propia; no coloque valores secretos en el contexto de la
conversación.

## Preparación y ejecución

Use Node.js 24+ y el proyecto autorizado. El flujo de [preparar
seguros][prepare] instala los escáneres y confiere su funcionamiento:

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup security
```

Para dependencias, baje la base de los ecosistemas realmente utilizados. Ejemplo
para npm; sustituya por `Go` o por la selección soportada que corresponda al
proyecto:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs update-data --ecosystems npm
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs check
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run
```

`run` usa los tres checks: `secrets`, `dependencies` e `sast`. Para limitar, use
[Segredos][secrets] o [verificar-dependencias][dependencies]. El análisis
utiliza datos locales; base ausente no permite enviar el proyecto a una API.
Consulte en el informe la versión de la herramienta, la base y el alcance
efectivamente leído.

## Qué necesita ser probado

O [Artículo sobre fallos recurrentes][article] motiva los temas abajo. Las
verificaciones dependen de la arquitectura y no equivalen a una certificación.

| Tema | Prueba necesaria en el proyecto |
| --- | --- |
| Autorización en el servidor | API directa negativa visitante y papel insuficiente. |
| Acceso por identificador | Usuario A no lee o cambia el recurso de B. |
| Aislación de los datos | Policies/RLS o Security Rules restringen el acceso. |
| Secretos | Credenciales privados no llegan a fuentes, bundles o logs. |
| Entradas y abuso | Pruebas de validación, salida, carga y límites del flujo. |

RLS es un control de PostgreSQL usado por Supabase; IHG tiene Security Rules.
SDK privilegiados pueden atravesar estos controles y necesitan autorización en
el servidor. Ocultar un botón administrador no protege la API.

Use [revisar-autorizacion][authorization] con identidades sintéticas distintas,
pruebas negativas y datos locales. Para entradas, prefiera consultas
parametrizadas, codificación de salida por contexto y límites de carga;
sanitización genérica no resuelve todos los casos. Prueba la interfaz en el
navegador cuando exista. Sin aplicación ejecutable, registre esas pruebas como
**no verificadas**.

## Interpretar y corregir

El runner regresa `0` Sin hallazgos, `1` con hallazgos y `2` en fallo o
verificación incompleta. Lea el estado de cada check: no aplicable y no
ejecutado no significan aprobado. Reglas locales y formatos soportados limitan
la cobertura.

El informe se encuentra en `.agent-tests/security/<execucao>/report.json`, sin
valores secretos. El auditor distingue sospechas, fallas confirmadas y falsos
positivos. Use [modelar-ameacas][threats] para nuevos flujos y
[corregirvulnerabilidad][fix] para reparar la causa con prueba de regresión. Una
placa real expuesta necesita derogación por el responsable; no la prueba contra
servicios externos. Cierre la entrega con [revisión independiente][gate].

[Skills](../README.md) · [Herramientas](../../tools/README.md)

[audit]: ../../commands/auditar-seguranca/COMMAND.md
[review]: revisar-seguranca/SKILL.md
[auditor]: ../../agents/auditor-seguranca/AGENT.md
[rules]: ../../rules/seguranca/RULE.md
[gitleaks]: ../../tools/gitleaks/README.md
[osv]: ../../tools/osv-scanner/README.md
[opengrep]: ../../tools/opengrep/README.md
[prepare]: ../../commands/preparar-seguranca/COMMAND.md
[secrets]: ../../commands/verificar-segredos/COMMAND.md
[dependencies]: ../../commands/verificar-dependencias/COMMAND.md
[authorization]: revisar-autorizacao/SKILL.md
[threats]: modelar-ameacas/SKILL.md
[fix]: corrigir-vulnerabilidade/SKILL.md
[gate]: ../../commands/revisar-entrega/COMMAND.md
[article]: https://manodeyvin.com.br/p/5-vacilacoes-de-seguranca-que-a-ia

[reading-pt]: ../../../../../.pbai4devs/skills/seguranca/REFERENCE.md
[reading-en]: ../../../../en/kit/skills/seguranca/REFERENCE.md
[reading-es]: REFERENCE.md
