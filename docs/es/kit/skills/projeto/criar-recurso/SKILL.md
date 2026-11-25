---
name: criar-recurso
description: "Encami creaciones y crea documentos, modelos o nuevos recursos."
language: es
---

# Crear recurso

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Si la solicitud es un modelo, trabaje en `.pbai4devs/templates/` sin iniciar la
definición del producto. Encaminhe documentos reales a la skill correspondiente.
Para documentos, comience por el inventario y plan de `atualizar-documentacao`.

Consulte si el recurso ya existe y use la skill específica cuando esté
disponible: `criar-skill`, `criar-agente`, `criar-comando`, `criar-regra`,
`criar-prd`, `criar-ux-ui`, `criar-design-doc` o `criar-spec`. Preserve los
requisitos previos. Para el conocimiento de proveedores, consulte
`usar-skills-externas` y reutilize el catálogo curado, manteniendo descargas
fuera de las instrucciones versionadas.

Para los demás tipos, esclareza finalidad, público, salida y dudas que afectan a
las decisiones. Cree solo lo necesario: `.pbai4devs/<tipo>/<nome>/<TIPO>.md`
para recursos de los agentes; `.pbai4devs/templates/<nome>/TEMPLATE.md` para
modelos; documentos reales en el destino acordado, solo cuando el proyecto
comience. En cada Markdown nuevo, incluso modelos, incluya frontmatter YAML
adecuado y H1. Scripts y configuraciones utilizan su formato propio en la misma
organización por nombre. Scripts de soporte siguen `executar-script`: Escribe
`.mjs` para Node.js 24+, reutilizando el código común, sin variantes por sistema
operativo. Código de la aplicación sigue `implementar-spec`.

Herramientas usan `.pbai4devs/tools/<nome>/TOOL.json` y uno `SCRIPT.mjs` fino
que delegan a `preparar-ferramentas`. Defina el origen oficial, el método de
descarga, actualización, plataformas y probe; no duplique el instalador. Sólo
las definiciones, scripts y guías son versionados; paquetes y registros se
encuentran en `.local/`. Use `envPaths` solo para directorios soportados por la
aplicación, sin alterar `HOME`.

Mantenga instrucciones cortas y utilice referencias para detalles opcionales.
Use `verificar-trabalho` para elegir y ejecutar las pruebas aplicables. Siga las
reglas de estructura y calidad; actualice los índices si cambia el inventario.
Al crear una carpeta de primer nivel en `.pbai4devs`, incluya uno README corto
sobre finalidad, ítems y momento de uso. Sólo skills, agentes, órdenes y reglas;
modelos, scripts, herramientas locales, estado y guías se encuentran en
`.pbai4devs`. Compruebe si las nuevas fuentes son permitidas por `.gitignore`
locales. Para nuevos tipos o archivos nativos, actualice los
[modelos](../../../templates/gitignore/TEMPLATE.md). Finalice con
`sincronizar-agentes` e `--check`. Documentos y recursos auxiliares nunca se
reflejan. Informe el archivo y las pendencias.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-recurso/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/criar-recurso/SKILL.md
[reading-es]: SKILL.md
