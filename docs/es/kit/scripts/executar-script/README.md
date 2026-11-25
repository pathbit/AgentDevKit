---
description: "Executor común de scripts Node del proyecto."
language: es
---

# Ejecutar script

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Utilice Node 24+ con una carpeta o archivo del repositorio. Los nombres cortos
se buscan primero en la raíz del proyecto. Para llamar la automatización del
kit, pase el camino explícito en `.pbai4devs/scripts/`. La orden funciona en los
tres SOs:

```console
cd .pbai4devs/scripts/preparar-ferramentas
node BOOTSTRAP.mjs --executar --plan .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs
node BOOTSTRAP.mjs --executar .pbai4devs/scripts/preparar-ferramentas list
cd ../../..
```

`--executar` preparatoria Node/npm, diagnostica y sólo entonces llama el
seletor. Fallo en el diagnóstico interrumpe la operación, inclusive si hay
configuración de herramienta inválida sin relación con el objetivo; inspecione
el fallo. Diagnóstico con éxito indica inventario concluido, no que todas las
dependencias del blanco están listas. Con `--no-install`, el bootstrap usa el
runtime actual, el primero Node del PATH o caché, siempre que sea compatible,
sin descargar o instalar runtime. Esta opción no restringe la red ni las
instalaciones por el diagnóstico o script hijo. El plan tampoco baja, instala ni
diagnostica, y usa las mismas opciones de runtime. El objetivo, sus argumentos y
el código de salida se conservan. En la salida estándar, `--executar` reúne el
camino del runtime, el diagnóstico, la cabecera del seletor y la salida del
blanco; no es una JSON único ni una salida bruta del blanco. El selector directo
también incluye su propia cabecera.

Use `--raw` antes del nombre del script para enviar al stderr los metadatos y el
diagnóstico del kit, manteniendo la salida del objetivo en stdout:

```sh
node .pbai4devs/scripts/executar-script/SCRIPT.mjs --raw .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
cd .pbai4devs/scripts/preparar-ferramentas
node BOOTSTRAP.mjs --executar --raw .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
cd ../../..
```

En ese modo, runtime, plano, diagnóstico y cabecera van a stderr, junto a los
errores del blanco; stderr puede contener formatos mezclados. Sin otras salidas
del ambiente, `--raw --plan` e `--raw --help` dejan stdout vacío y muestran el
plan o ayuda en stderr. Opciones después del nombre pertenecen al blanco,
inclusive `--raw` e `--plan`.

Preloads o instrumentación del ambiente, como `NODE_OPTIONS`, pueden escribir en
stdout antes de que el kit procese `--raw`, inclusive en plano o ayuda, o
interferir en la identificación del runtime. Para procesar bytes estrictos,
control ese ambiente; el kit preserva `NODE_OPTIONS` y no lo elimina
automáticamente.

Con Node 24+ ya disponible, el selector puede ser llamado directamente:

```console
node .pbai4devs/scripts/executar-script/SCRIPT.mjs --plan .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs list
```

`--plan` muestra el archivo sin ejecutarlo. Los argumentos y el código de salida
se conservan; fallas no intentan otro runtime. Scripts shell/Python y los
enlaces simbólicos son rechazados. Archivos `.js`/`.cjs` Los ya existentes usan
el mismo Node.

Con Node 18+, el [bootstrap JavaScript](../preparar-ferramentas/BOOTSTRAP.md)
acepta `--runtime-only` y prepara Node 24+ antes de la operación solicitada. Sin
Node/npm, el agente instala primero el runtime por el mecanismo del SO. El modo
estándar de bootstrap también prepara las herramientas; reserve al setup.

`testar-navegador` mantiene el executor Playwright indicado en `SCRIPT.conf`;
sin `--plan`, retorna 69 al agente usar el conector, sin ejecutar el archivo.
Cuando presente, `SCRIPT.conf` requiere una sola entrada `executor=node` o
`executor=playwright-mcp`; comentarios `#` Se permiten. Ajustes vacíos,
desconocidas o duplicadas fallan antes de ejecutar cualquier script.

[reading-pt]: ../../../../../.pbai4devs/scripts/executar-script/README.md
[reading-en]: ../../../../en/kit/scripts/executar-script/README.md
[reading-es]: README.md
