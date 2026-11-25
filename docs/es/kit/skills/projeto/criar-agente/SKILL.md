---
name: criar-agente
description: "Crea o actualiza perfiles compartidos de agentes y apuntamientos."
language: es
---

# Crear agente

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Establezca papel cuando delegar, entrada, resultado, herramientas y límites.
Cree o actualice `.pbai4devs/agents/<nome>/AGENT.md`, con metadados apropiados y
perfil conciso. Preserve instrucciones y permisos existentes. Vincule las skills
pertinentes y diga al perfil a quien devolver resultados.

Mapeie modo y permisos en los YAMLs nativos al lado de la fuente; mantenga la
cabecera compartida portátil. Cuando hay soporte, los valide e informe
diferencias de descubrimiento. Cuando el formato no sea reconocido, pida la
lectura explícita del origen. Para Antigravity, mantenga a los YAMLs específicos
junto al `AGENT.md`. El manifiesto es generado: no lo edite a mano. La
sincronización genera apuntamientos.

Actualizar índice/guia, siga las reglas de estructura y calidad y finalice con
`sincronizar-agentes` la CLI, incluso después de renombrar o eliminar perfiles;
vea los metadatos nativos generados para cada cliente elegido.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-agente/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/criar-agente/SKILL.md
[reading-es]: SKILL.md
