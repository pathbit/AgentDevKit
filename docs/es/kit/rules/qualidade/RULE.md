---
trigger: always_on
description: "Estándares de pruebas, evidencias y Markdown del proyecto."
language: es
---

# Calidad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Versione código de pruebas y fixtures en `tests/`; las pruebas de la
infraestructura de agentes se encuentran en `.pbai4devs/scripts/<nome>/tests/`.
No versione resultados, informes, capturas o artefactos temporales: use
`.agent-tests/`, directorios ignorados o carpeta temporal fuera del repositorio.
Informe las comprobaciones necesarias que no pueda ejecutar.

Use `verificar-trabalho` Para probar los cambios. Cambios web requieren probar
el flujo real en el navegador; desktop requiere abrir y probar la aplicación.
Código revisado, build o fixture solo no sustituyen esa prueba funcional.

Comience nuevos archivos Markdown con frontmatter YAML adecuado al tipo y título
H1; preserve los metadatos exigidos por la herramienta. En documentos humanos
existentes, mantenga el formato y el contenido: no los reformate sólo para
imponer ese patrón.

O `.gitignore` De la raíz pertenece al proyecto y no es alterado por el kit. O
[modelo de gitignore](../../templates/gitignore/TEMPLATE.md) Es opcional para
reglas del proyecto. `.pbai4devs/.gitignore` controla el hub; el generador
protege los derivados externos en Git local. Sin Git, esa protección queda
pendiente hasta `git init` y sincronización antes de añadir archivos al índice.
Consulte con Git tanto los archivos permitidos como los artefactos ignorados.
Scripts compartidos deben ser versionados; resultados locales, ignorados. Ignore
el contenido descargado de tools, preservando `TOOL.json`, scripts propios y
guías. No esconda scripts, fixtures o templates por nombre genérico o extensión.
Cualquier archivo o carpeta `.playwright*` Se ignora, en cualquier caja, incluso
`.playwright-mcp`.

[reading-pt]: ../../../../../.pbai4devs/rules/qualidade/RULE.md
[reading-en]: ../../../../en/kit/rules/qualidade/RULE.md
[reading-es]: RULE.md
