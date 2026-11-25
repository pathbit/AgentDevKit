---
name: criar-comando
description: "Crea o actualiza órdenes compartidas y sus apuntes."
language: es
---

# Crear orden

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Trate órdenes como entradas de casos de uso. Cree o actualice
`.pbai4devs/commands/<nome>/COMMAND.md` el
[modelo](../../../templates/comando/TEMPLATE.md): ajuste descripción y H1,
remova `status: modelo` y defina entrada, patrones, prerrequisitos, ejecución y
salida. Reúna dudas que alteren estos contratos antes de ejecutar.

Reutilize skills para decisiones y perfiles para responsabilidades. Informe
quién recibe la salida, con qué pruebas y en qué condición. Introduzca los
nombres y argumentos de los scripts `.mjs` y use `executar-script` com Node.js
24+. Seletor directo no requiere npm por sí solo; compruebe los requisitos
previos de bootstrap y del script blanco por separado. Referencie herramientas y
carpetas necesarias; no copie código, binarios o instrucciones. Consulte los
contratos de scripts y skills referenciados antes de restringir argumentos; no
declare rejeiciones que no hayan sido verificadas. Consulte la salida completa,
incluyendo mensajes de executor, `stdout`, `stderr`, código de salida y efecto
de `--raw`; no describe solo la salida del script como si fuera toda la salida
del comando. `--raw` e `--plan` antes del objetivo son opciones del ejecutador;
después del objetivo, son argumentos del script. `--plan` no ejecuta el
objetivo. Documente esta distinción sin prohibir opciones válidas; no generalice
el canal de errores más allá de lo que se ha verificado. Preserve argumentos y
documentos.

Cuando sea aplicable, vea el prompt nativo generado en `.github/prompts/`:
contiene solo metadatos, H1 y el enlace al origen. El manifiesto se genera; no
lo edite a mano. No prometa importación o ejecución automática por Markdown.

Actualizar índice/guia, siga las reglas de estructura y calidad y finalice con
`sincronizar-agentes`, incluso después de renombrar o eliminar órdenes. Consulte
los argumentos y el descubrimiento; informe cuando la lectura necesita ser
explícita.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-comando/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/criar-comando/SKILL.md
[reading-es]: SKILL.md
