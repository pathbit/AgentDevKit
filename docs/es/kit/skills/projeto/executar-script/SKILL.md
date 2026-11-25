---
name: executar-script
description: "Identifica herramientas instaladas y ejecuta scripts por el intérprete compatible."
language: es
---

# Ejecutar script

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Con Node 18+ y npm, use bootstrap para preparar Node 24+, diagnosticar y
ejecutar el script solicitado en ese orden. El mínimo 24 es de Node; verifique
el npm separadamente e informe su versión solamente cuando medida:

```sh
node .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --executar <script> [argumentos...]
```

Si el diagnóstico falla, inspecione la causa; el script no es ejecutado. Su
éxito indica inventario completado, no dependencias necesariamente listas.
`--executar --no-install` evita solo la descarga e instalación de runtime; usa
el actual, el primero Node del PATH o caché, si es compatible. No restringe el
diagnóstico o script hijo. Cuando se prohíbe la red o instalaciones, solo
ejecute etapas comprobadamente compatibles con estas restricciones o utilice
aislamiento adecuado. Sin Node/npm, instarlos al mecanismo del SO cuando esté
autorizado. Preserve la operación y los argumentos solicitados.

Prefiere scripts existentes. Use `--executar --plan <script>` para consultar la
ejecución sin instalar ni diagnosticar; el plan utiliza las mismas opciones de
runtime. Consulte prerrequisitos, efectos y autorización, y ejecute sin
`--plan`. El seletor directo continúa disponible y no hace preparación ni
diagnóstico. El bootstrap reúne en la salida informaciones del runtime,
diagnóstico y ejecución; identifique cada tramo antes de relatar el resultado
del script. Para redirigir metadados y diagnóstico del kit a stderr, use `--raw`
antes del nombre; errores también comparten stderr. Sin salidas extras del
ambiente, planes y ayuda en modo raw dejan stdout vacío. Preloads en
`NODE_OPTIONS` Pueden escribir en stdout antes del kit; para bytes estrictos,
controlar el ambiente sin modificarlo automáticamente. Argumentos después del
nombre pertenecen al objetivo. Consulte
[referencia](../../../scripts/executar-script/README.md).

Si se indica `playwright-mcp`, use el conector conforme a
[referencia](../../../scripts/testar-navegador/REFERENCE.md). No ejecute este
archivo como Node. Sin el conector requerido, informe el prerrequisito.

Versione automaciones reutilizables y sus pruebas; salve solamente diagnósticos,
informes y capturas en `.agent-tests/`. Resuma orden, resultado y fallas; lea
salidas completas sólo para investigar problemas.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/executar-script/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/executar-script/SKILL.md
[reading-es]: SKILL.md
