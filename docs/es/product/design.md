---
description: "Fuentes, generación local y arquitectura de AgentDevKit."
status: aprovado
language: es
---

# Diseño técnico

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El repositorio contiene el generador. La instalación produce la estructura usada
por los agentes en otro proyecto. [PRD](prd.md) e [specs](../specs/README.md)
definen los contratos de cada entrega.

## Fuentes en el repositorio

```text
AgentDevKit/
├── src/              CLI e instalação
├── bin/              entrada do pacote npx
├── tests/            testes do produto
├── scripts/release/  CI, empacotamento e publicação
├── examples/         guia de exemplos
├── docs/             guias e decisões do produto
└── .pbai4devs/        skills, regras, templates e ferramentas compartilhadas
```

Los metadatos npm, licencia, documentación y workflows de GitHub se encuentran
en sus lugares estándar. Carpetas nativas de los clientes, índices y estado
local no forman parte de la fuente versionada.

`npm run examples` genera los árboles de demostración en una carpeta temporal
fuera de Git, informada por el comando. Contienen `.claude`, `.codex` y los
demás clientes, sin mezclar ejemplos con la configuración activa de la raíz.
`npm run test:examples` ejecuta los escenarios. O [guía de
desarrollo](../maintainers/development.md) reúne las órdenes del proyecto.

## Salida instalada

`.pbai4devs` recibe los recursos compartidos, sin copiar el núcleo del
generador, las automaciones de release o las pruebas exclusivas del producto.
Los diseños de los clientes vienen de la [configuración declarativa][clients].
Los archivos nativos son pequeños apuntamientos para el hub, sin symlinks.

O `LICENSE` la raíz del paquete es la fuente canónica de la licencia MIT del
kit. `init` e `update` copian sus bytes para `.pbai4devs/LICENSE`; la licencia
raíz del proyecto consumidor permanece intacta. Cambios en la licencia
administrada siguen la misma protección de conflictos y copia de seguridad de
los demás archivos del hub.

La opción salva determina las derivaciones. Actualizaciones y sincronizaciones
no reactivan clientes desmarcados. En una instalación nueva, `none` Solo deja
los recursos compartidos, incluyendo `AGENTS.md`. El manifiesto generado tiene
solamente la cabecera. `all` preserva la intención de usar todos; estados
antiguos sin selección registrada mantienen ese comportamiento.

## Instalación y propiedad

El instalador monta un plan, confiere hashes y caminos, presenta conflictos y
aplica cambios con backup local. `--dry-run` No cambia archivos ni índice.

Las entradas humanas reciben referencias en un bloque delimitado del kit. El
texto externo, frontmatter y nombre existente se conservan; sólo se registra el
hash del bloque. Las alteraciones externas continúan permitidas; las
alteraciones dentro del bloque requieren revisión y no permiten sobrescribir el
archivo con `--force`. Archivos nuevos y totalmente generados continúan con
propiedad integral. El lector de TOML legado reconoce la contribución
administrada en `prompt` en la migración. Desde `0.0.36`, el kit desactiva
creación y renovación en `.gemini/`. `GEMINI.md` permanece como entrada de
Antigravity. Las preferencias nativas permanecen bajo control humano. Nunca es
posible ignorar solamente un extracto de archivo en Git. Vea [spec de
integración][additive].

El kit preserva la configuración Git, los ignores existentes y el índice.
Archivos locales pueden aparecer en el status; el diagnóstico informa esa
visibilidad y posibles archivos privados expuestos. El equipo decide las reglas
del proyecto.

El estado registra versión, elección y propiedad local. Índices y manifiesto
pueden ser reconstruidos. Descargas, credenciales e informes se quedan fuera del
paquete; comprueba los ignores del proyecto antes de preparar cambios Git.

El catálogo de complementos utiliza las definiciones de herramientas y skills
externas. `plugins list` e `plugins info` consultan el paquete antes del `init`
y el catálogo local después de la instalación. `plugins install` e `plugins
check` La operación se deriva al gestor correspondiente. [Complementos y
créditos](../guides/plugins.md)

## Inventario y evolución documental

El inspector incluye metadatos de documentación en el JSON: caminos, tipo, papel
probable, origen de la indicación, tamaño y hash cuando couber en los límites.
No escribe archivos, no emite contenido y no lee destinos simbólicos. Límites y
avisos impiden interpretar una búsqueda parcial como ausencia de docs.

`document` utiliza esta inspección para preparar un borrador de inventario en
Markdown o JSON. `next --intent document` orienta el flujo de lectura por el
agente a partir del estado del proyecto. [Órdenes de CLI](../guides/cli.md)

La skill `atualizar-documentacao` Utiliza este inventario antes de las
plantillas. El agente lee el material, propone acciones por archivo y aplica
complementos autorizados. Organización utiliza índices y enlaces, preservando
caminos y contenido. Producto y aprobaciones dependen de las decisiones reales
del usuario.

## Runtime

El launcher acepta Node 18+ y prepara Node 24+ antes de cargar el núcleo. El
bootstrap usa JavaScript, descarga oficial, SHA-256 y extracción por `tar` con
argumentos separados, sin shell. Falsos preservan el runtime anterior. Sin Node,
el agente utiliza primero el instalador nativo del sistema operativo.

## Verificación y publicación

El CI separa la suíte completa de los test de portabilidad. La publicación
utiliza un artifact aprobado del mismo commit y verifica versión, origen y
checksum. No hay nuevo empacotamento entre test y publicación.

Antes de empaquetar, la etapa de distribución deriva el README público de la
fuente: elimina el frontmatter YAML y resuelve enlaces locales a URLs absolutas
de GitHub. O README Versionado mantiene su YAML y sus enlaces de trabajo. El
paquete identifica a PathBit como autor, incluye palabras clave y declara MIT.

El npm público recibe el mismo tarball de la release, como
`@pathbit/agentdevkit`. El workflow prioriza el secreto `NPMJS_TOKEN` del
repositorio, recibido por la variable interna `NPM_TOKEN`; sin token, usa OIDC.
Confirma la integridad de la versión en el registro y prueba `--version`,
`init`, `doctor` e `sync --check` vía `npm exec`, en proyecto temporal con caché
nuevo. Los comandos sugeridos por CLI y las notas usan el nombre y la versión
del paquete. El modo manual de paquete permite publicar una etiqueta existente
sin alterar su release. La instalación del consumidor es validada sin token o
configuración de autenticación, conforme [paquete
npm](../maintainers/packages.md).

Pruebas comprueban archivos y operaciones ejecutadas. La carga en una aplicación
específica depende de las capacidades de este cliente; generar una referencia no
comprueba la ejecución de la skill.

[Wiki](../README.md) · [Mantenimiento](../maintainers/maintenance.md) ·
[Recursos](../guides/resources.md)

[clients]: ../../../.pbai4devs/templates/clients/ADAPTERS.json
[additive]: ../specs/additive-integration/SPEC.md

[reading-pt]: ../../product/design.md
[reading-en]: ../../en/product/design.md
[reading-es]: design.md
