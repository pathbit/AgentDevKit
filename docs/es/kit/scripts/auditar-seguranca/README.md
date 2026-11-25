---
description: "Analice local de secretos, dependencias y padroes de codigo."
language: es
---

# Auditar seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Solicitante Node.js 24+ y herramientas preparadas con `setup security` En el
administrador. El comando nunca instala herramientas y no envía fuentes a
servicios remotos.

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs check
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs update-data --ecosystems npm,Go
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets,sast
```

`run` usa un snapshot de texto sin seguir enlaces. Excluidos binarios,
directorios generados y configuraciones que podrían suprimir hallazgos. El
informe registra las exclusiones. `--target` restringe a una carpeta dentro del
proyecto; `--include-history` añade el historial Git al check de secretos y
exige que el destino sea la raíz de ese repositorio. Carpetas `dist/` e `build/`
También son leídas; un bundle de texto no está oculto por ser un artefacto de
build. `examples/generated/` sólo se excluye cuando una regla en `.gitignore`
idéntico al blob del índice a ignora y el índice no contiene caminos de la
carpeta. Ignore global, `info/exclude` y reglas sólo en el trabajo tree no la
excluyen. Seleccione la carpeta directamente con `--target` También la analiza.

`update-data` Baja solamente bases públicas del OSV por HTTPS, sin analizar o
enviar el proyecto. Las bases se encuentran en la caché local del escáner, con
tamaño, fecha y SHA-256 de integridad local. Ese hash no es firma del
publicador. Antes de la promoción, valida ZIP/ZIP64límites, CRC y los registros
JSON OSV. Actualizaciones preservan la base anterior si la descarga o la
promoción falla.

Los análisis usan Gitleaks, OSV com `--offline` y Opengrep con reglas JS/TS
locales. Las reglas propias detectan entradas HTTP en `eval`, shell y consultas
SQL, además de TLS desactivado; exigen un análisis de contexto, no comprueban
explotación. O OSV requiere bases locales de los ecosistemas detectados. Falta
de herramienta, base o error de parsing genera estado incompleto, nunca
aprobación.

| Salida | Significado |
| --- | --- |
| `0` | Checks concluidos sin hallazgos; elementos no aplicables quedan explícitos. |
| `1` | Hallos para el triaje. |
| `2` | Ejecución no válida, interrumpida o incompleta. |

Resultados redactados se encuentran en
`.agent-tests/security/<execução>/report.json`. No incluyen código, matches o
valores de secretos. JSON bruto y snapshots temporales se eliminan. Un destino
`--output` Necesita ser nuevo, ignorado por Git y estar bajo `.agent-tests/`. La
carpeta de trabajo `.agent-tests/security/` También debe ignorarse la auditoría
de las redirecciones Git y los caminos que puedan combatir con el índice; no
cambia la configuración Git; desactiva `fsmonitor` En las consultas y en el
ambiente suministrado a los escáneres. Al detectar el intercambio de la carpeta
de trabajo, la auditoría interrumpe la limpieza y preserva el contenido
encontrado. La verificación y la remoción no son atómicas; evite cambiar esa
carpeta durante la ejecución.

snapshot acepta hasta 20 mil archivos, 10 MiB por archivo y 256 MiB en total.
Una base OSV Puede tener hasta 512 MiB; superar los límites hace que la
ejecución sea incompleta. La validación acepta hasta un millón de entradas ZIP,
16 MiB por registro y 2 GiB descompactados. Reducea `--target` Cuando sea
necesario. Al finalizar, reenumera el alcance: inclusión, eliminación, cambio de
tipo, modo o contenido durante el análisis invalidan la aprobación.

Scanners no validan autorización por objeto/tenant, RLS o Keller Rules. Complete
el flujo por skill [revisar seguros][skill] y sus pruebas negativas.

[skill]: ../../skills/seguranca/revisar-seguranca/SKILL.md

[reading-pt]: ../../../../../.pbai4devs/scripts/auditar-seguranca/README.md
[reading-en]: ../../../../en/kit/scripts/auditar-seguranca/README.md
[reading-es]: README.md
