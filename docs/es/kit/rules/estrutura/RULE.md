---
trigger: always_on
description: "Organización, concisión y sincronización de los recursos compartidos."
language: es
---

# Estructura

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use skill específico o `criar-recurso`. Reutilize antes de crear. Mantenga un
origen por recurso, una carpeta por nombre y un archivo principal por tipo.
Escriba instrucciones cortas; pulse detalles opcionales solo cuando sea
necesario.

Después de crear, cambiar, renombrar o eliminar recursos del hub, ejecute
`sincronizar-agentes` y su `--check`. Regístrar clientes agênticos en las
plantillas en `.pbai4devs/templates/clients/`, sin tratar tools como destinos.
Documentos de producto fuera del hub siguen sus propios índices; modificarlos no
requiere sincronizar los agentes. Los espejos contienen metadatos y
apuntamientos. Sólo tiene los principales `SKILL.md`, `AGENT.md`, `COMMAND.md` e
`RULE.md`. No replique templates, scripts, tools, estado, pruebas, docs o guías.
Tenga en cuenta `--force` cuando sea necesario: los destinos administrados
pueden ser sobrescritos y limpios; preserve el origen y los archivos nativos
fuera de ese alcance. Cada carpeta de primer nivel de `.pbai4devs` tiene uno
README corto sobre su uso. Cada carpeta creada en `docs/`, incluyendo ancestros
necesarios, tiene uno README conciso sobre el propósito y el público; preserve
los archivos existentes. Guías `README.md` e `INSTRUCTIONS.md` solo se quedan en
`.pbai4devs`, sin espejos. Automaciones siguen `executar-script`: identifique
SO, runtimes y conectores; reutilize scripts y herramientas instaladas antes de
generar código en la conversación.
Mientras configurar los agentes, mantenga los documentos de producto como
modelos. Las pruebas compartidas se encuentran junto a cada script en `tests/`;
las pruebas del propio AgentDevKit se encuentran en `tests/`, en la raíz. En
tools, versione fuentes; descargas y registros se encuentran en
`<nome>/.local/`, caché en `.cache/`, launchers en `bin/`. No duplique el
instalador ni extienda estos recursos en las herramientas. Mantenga los
derivados locales e ignorados por sincronizador. Nuevas fuentes necesitan
continuar versionables; compruebe el resultado con Git.

[reading-pt]: ../../../../../.pbai4devs/rules/estrutura/RULE.md
[reading-en]: ../../../../en/kit/rules/estrutura/RULE.md
[reading-es]: RULE.md
