---
description: "Selección y uso de las automaciones compartidas."
language: es
---

# Scripts

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Prerrequisito: [Node.js 24+ con npm](https://nodejs.org/en/download),
preferentemente una versión LTS. Automaciones propias usan `.mjs` y el mismo
comando en macOS, Linux y Windows. Bun no forma parte del contrato validado.
Versione scripts y pruebas; guarde resultados en `.agent-tests/` Solo si el
proyecto ignora, o usa una carpeta temporal fuera del repositorio. Prepare
herramientas locales con `preparar-ferramentas`, sin instalaciones globales. El
runtime de la aplicación se decidirá en el diseño doc; este requisito es de los
agentes. Con Node 18+, el [bootstrap
JavaScript](preparar-ferramentas/BOOTSTRAP.md) prepara Node 24+ con
`--runtime-only` o encadena preparación, diagnóstico y selección con
[`--executar`](executar-script/README.md). Sin Node/npm, el agente instala
primero por el mecanismo del sistema operativo. No hay inicializadores `.sh` o
`.ps1` en el kit.

En la raíz del repositorio, utilice el camino del script para consultar el
entorno:

```sh
node .pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs --no-docker-probe
```

En el diagnóstico, `docker.daemonStatus` e `docker.composeStatus` Son
`available`, `unverified`, `not-found` (ejecutable ausente del PATH) o
`not-requested` (ejecutable encontrado, pero sondeo desactivado). Fallo en la
consulta no comprueba que el servicio está parado. La consulta usa el contexto
Docker configurado, que puede ser remoto. Para no llamar Docker, use
`--no-docker-probe` en el script de diagnóstico. Los booleanos anteriores
permanecen para compatibilidad.

| Nombre | Finalidad |
| --- | --- |
| `diagnosticar-ambiente` | Runtimes, paquetes y navegadores disponibles |
| `inspecionar-projeto` | Detecta manifests, órdenes y estructura |
| `reunir-contexto-spec` | Lee los documentos configurados para una spec |
| `verificar-configuracao` | Confiere el estado antes de implementar código |
| `preparar-ferramentas` | Instala/atualiza herramientas locales |
| `gerenciar-skills-externas` | Instala/check/read de skills curadas locales |
| `auditar-seguranca` | Scanners offline, bases locales e informes redactados |
| `revisar-entrega` | Confiere documentación, revisión y pruebas del cambio |
| `sincronizar-agentes` | Actualiza apuntamientos; `--check` sólo confiere |
| `verificar-recursos` | Estructura Markdown, enlaces y espejos |
| `testar-infraestrutura` | Ejecutar `tests/TEST.mjs` Con Node |
| `testar-maturidade` | Ejecuta escenarios temporales fuera de Git |
| `testar-navegador` | Cenarios vía conector Playwright; vea la [referencia](testar-navegador/REFERENCE.md) |

## Script de infraestructura

`testar-infraestrutura` Guarda cada ejecución en una carpeta nueva
`.agent-tests/infraestrutura/` e informa el camino del informe. Los registros y
los informes anteriores se conservan; los enlaces simbólicos en los directorios
de salida y en el descubrimiento de los suítes se niegan. Los consumidores del
antiguo `infraestrutura/REPORT.json` Deben usar el camino informado en la
ejecución. Una entrada simbólica en `scripts` También interrumpe el
descubrimiento cuando no sea una suíte. El informe usa `partial` para pruebas
ignoradas, pendientes o sin pruebas observables; en este caso, el comando vuelve
error para evitar una prueba incompleta de pasar como completa. El informe
identifica skips por nombre, archivo relativo y razón, e informa cuando la
justificación está ausente. Un skip por plataforma deja la suíte parcial en el
script instalado. El flujo de release del repositorio acepta solo los casos
listados que tienen cobertura en la plataforma correspondiente de la matriz. En
macOS, una ACL Listada o no verificable en el directorio de salida interrumpa la
ejecución antes de la grabación. Las verificaciones no aislan las pruebas ni
garantizan la contención contra sustituciones simultáneas
de caminos o ACLs no detectados.

## Herramientas locales

Cada [herramienta](../tools/README.md) Tienes `TOOL.json` y uno `SCRIPT.mjs`,
con acciones `install`, `update`, `check`, `info` e `run`. Estos scripts delegan
al mismo instalador; descargas se quedan en `.local/`. `preparar-ferramentas
setup` instala y verifica los CLIs compatibles de la selección general.
Herramientas con `optIn: true` exigen el ID o grupo explícito, como `setup
workflow`. Para un grupo, use `setup base`, `install base` o `update base`;
`check base` No instala ni consulta nuevas versiones. Na CLI, `plugins list` e
`plugins info <id>` consultan los catálogos. `plugins install <id>` e `plugins
check <id>` Delegan a los gestores del hub instalado y operan en una entrada por
vez.

La prueba `preparar-ferramentas/tests/SMOKE_VERCEL.mjs` verifica CLIs opcionales
instaladas con fixtures locales. Ejecute con Node; resultados quedan en
`.agent-tests/vercel-labs/`. La suíte común permanece independiente de estos
descargas.

El selector acepta nombre o camino JavaScript, revisa los argumentos y preserva
el código de salida. Los nombres cortos se buscan primero en la raíz del
proyecto. Para llamar una automatización del kit, use el camino explícito en
`.pbai4devs/scripts/`. Una falla cierra la ejecución con el mismo código.
`playwright-mcp` exige el conector: su `SCRIPT.js` es código para una página, no
un programa Node. Nuevas automaciones usan `.mjs`; `.bun` No es necesario. Las
pruebas de cada script se quedan en `<nome>/tests/`; comprueba si los
directorios de resultados y capturas están ignorados. Scripts, modelos y
herramientas no tienen copias en los agentes.

Los diseños vienen de `templates/clients/ADAPTERS.json` el manifiesto local
`espelhos.conf` es generado de esa fuente. Los metadatos nativos se quedan al
lado de los recursos, con frontmatter YAML Sin cuerpo. Los Caminos son relativos
a la raíz. Solo los cuatro archivos principales son fuentes; no registre
documentos. Use `gitignore|pasta` para registrar carpetas como `.vscode`; la
línea no crea un `.gitignore` para el cliente.

`sincronizar-agentes --force` No autoriza sustituir contenido humano. Backups
locales pueden quedarse en `.agent-tests/`; los revise antes de restaurar.
`--check` No cambia archivos. sincronizador también genera el catálogo completo
y los índices auxiliares a partir de las fuentes. Helpers y pruebas constan como
soporte, sin fingir órdenes propios. Ignores, índice y configuración Git
existentes son preservados; comprueba la visibilidad de los derivados antes de
añadirlos. El estado y los índices son locales. Los ejemplos de madurez usan
copias locales, sin descargas o estado personal.

[reading-pt]: ../../../../.pbai4devs/scripts/README.md
[reading-en]: ../../../en/kit/scripts/README.md
[reading-es]: README.md
