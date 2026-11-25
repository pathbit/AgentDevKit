---
description: "Catálogo revisado y copias locales de skills externos."
language: es
---

# Skills externas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

[CATALOG.json](../../../../.pbai4devs/external-skills/CATALOG.json) registra
origen, commit inmutable, archivo, nombre,
licencia, finalidad y revisión local. `reviewed` indica curadora para el uso
descrito. Las instrucciones del usuario y las reglas del proyecto prevalecen.
Entradas `candidate` se dispone de una consulta y una evaluación de origen.

Use el [administrador](../scripts/gerenciar-skills-externas/README.md) Para
listar, averiguar, instalar, verificar o leer una entrada. Instale antes CLI
`skills` por el gestor de herramientas. Node.js 24+ es el runtime común. Na CLI,
`agentdevkit plugins list` e `plugins info <id>` muestran origen, licencia y
revisión. El administrador detalla la preparación de una entrada revisada.

Las copias completas se quedan en `.local/<id>/`, con referencias y licencias
incluidas en el origen. CLI oficial descarga y copia; ninguna skill se refleja
en `.pbai4devs/skills/`, carpetas de clientes o directorios globales. Sólo
catálogo, guías y automaciones propias son versionados. `licenseSource` apunta a
la declaración de licencia en el mismo commit, incluso cuando se encuentra en la
raíz del repositorio y no viene junto a la carpeta de la skill.

Actualizaciones requieren revisar y registrar un nuevo SHA en el catálogo. Leer
una skill no ejecuta sus instrucciones: aplique solamente a la tarea pertinente.
Evidencias quedan en `.agent-tests/`; publicación, instalación global y flujos
externos que alteran el proyecto dependen de la solicitud correspondiente. Spec
Kit y OpenSpec siguen sus propios flujos y no son iniciados por este catálogo.

Las notas de cada entrada registran dependencias y contenido remoto adicional.
pin congela los archivos copiados; reglas buscadas después en `main` Necesitan
una nueva lectura antes de su uso.

## Seguridad local

OpenAI Security Best Practices, OpenAI Security Threat Model y GitHub Security
Review tienen entradas revisadas para lectura local. El catálogo registra sus
límites: no tratar watchlists antiguas como base actual ni incluir secretos en
los informes. El flujo del kit usa escáneres locales y no exige cuenta externa.
Trail of Bits Differential Review es una referencia candidata CC-BY-SA-4.0;
preserve asignación y licencia, sin copiar su contenido a archivos MIT.

Ver la [curadora y los criterios de adopción][security].

## Otras fuentes y flujos

| Fuente | Aplicación |
| --- | --- |
| [Vercel](https://vercel.com/docs/agent-resources/skills), [CLI skills](https://github.com/vercel-labs/skills) | Descubrimiento y descarga por CLI ya preparado. |
| [Cloudflare](https://github.com/cloudflare/skills), [APIs de skills](https://developers.cloudflare.com/agents/tools/skills/) | Catálogo local y APIs de runtime son recursos distintos. |
| [Microsoft](https://github.com/microsoft/skills), [Anthropic](https://github.com/anthropics/skills), [OpenAI](https://github.com/openai/skills) | Referencias por tarea; comprueba licencia y dependencias de cada carpeta. |
| [Oracle](https://github.com/oracle/skills) | Candidatas para banco y Graal; uso depende del stack. |
| [Tech Leads Club](https://github.com/tech-leads-club/agent-skills) | Fuente comunitaria; revisar la licencia y los destinos de pruebas. |
| [Spec Kit](https://github.github.com/spec-kit/), [código](https://github.com/github/spec-kit) | Aprovechar fases, artefactos y convergencia; el CLI Python/uv Está fuera del runtime Node adoptado. |
| [OpenSpec](https://openspec.dev/), [código](https://github.com/Fission-AI/OpenSpec) | Flujo propio de proposal/design/tasks/verify; `init` depende de una decisión explícita porque cambia el proyecto. |
| [Dotcontext](https://github.com/vinilana/dotcontext), antiguo [AI Coders Context](https://www.npmjs.com/package/@ai-coders/context) | Evaluar manualmente el flujo PREVC e `.context`; CLI, MCP, harness y hooks opcionales pueden cambiar destinos. |

Las entradas revisadas de Microsoft, Anthropic y OpenAI están identificadas en
el catálogo. Vercel Writing Guidelines sólo debe contribuir con principios
editoriales compatibles: sus estándares MDX/TypeScript y atribución de agentes
no sustituyen los estándares locales de Markdown, Node y autoría Git.

[security]: ../../guides/security-references.md

[reading-pt]: ../../../../.pbai4devs/external-skills/README.md
[reading-en]: ../../../en/kit/external-skills/README.md
[reading-es]: README.md
