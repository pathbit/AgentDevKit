---
description: "Ejemplos locales de los agentes y de las etapas de un proyecto."
language: es
---

# Ejemplos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Instalación en proyectos sintéticos

Estos ingresos usan Git, Node.js 24+ y un tarball local creado de la copia
actual de AgentDevKit. El paquete acepta Node.js 18+; con Node 18–23, el
launcher puede necesitar preparar Node 24 antes de la ejecución. Para este
ejemplo offline, use Node 24+; vea
[prerrequisitos](../guides/prerequisites.md).

Utilice directorios temporales fuera de cualquier repositorio Git. Los ingresos
muestran la instalación y la consulta al siguiente paso, sin simular aprobación
de producto; no las ejecute en un proyecto real. Use un shell POSIX. Los
ingresos se verificaron en macOS; la ejecución en Windows con Git Bash todavía
no ha sido validada.

En la raíz de AgentDevKit, cree una carpeta temporal para el paquete y utilice
el camino impreso en la siguiente orden:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-pacote-')))"
npm pack --offline --ignore-scripts --pack-destination "<pasta-do-pacote>"
```

Reemplazar `<pacote-local.tgz>` debajo del camino absoluto del archivo generado.
tarball puede contener cambios locales aún no publicados; estos ingresos no
comprueban el comportamiento de la versión publicada. El modo offline limita el
npm, pero no impide el acceso a la red por otros procesos. Para la instalación
pública, consulte [guía de instalación](../guides/installation.md).

### Proyecto nuevo

Cree otra carpeta temporal con la primera orden y entre en el camino impreso.
Compruebe que está fuera de cualquier repositorio Git antes de inicializarla:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-novo-')))"
cd "<pasta-do-projeto-novo>"
git init
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit init --agents codex,claude --lang es --yes
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit next --intent product --lang es --json
```

Consulte la skill indicada en el campo `next` y responda a las preguntas para
preparar el proyecto y definir el producto. La instalación no crea PRD ni
aprueba decisiones.

### Proyecto existente

Cree otra carpeta temporal, confirme que está fuera de cualquier repositorio
Git, entre en ella y gestiona solo archivos ficticios:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-existente-')))"
cd "<pasta-do-projeto-existente>"
git init
node -e "const f=require('node:fs');\
f.mkdirSync('.claude');\
f.writeFileSync('AGENTS.md',\
'# Instruções existentes\n\nRegra sintética preservada.\n');\
f.writeFileSync('.claude/settings.json',\
JSON.stringify({env:{EXEMPLO:'local'}},null,2)+'\n');\
f.writeFileSync('.gitignore','cache-do-projeto/\n');\
f.writeFileSync('exemplo.txt','conteúdo preparado\n')"
git add -- exemplo.txt
git diff --cached -- exemplo.txt
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit init --agents codex,claude --lang es --yes
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit next --intent run --lang es --json
git diff --cached -- exemplo.txt
```

Ver `AGENTS.md`, `.claude/settings.json` e `.gitignore` en la carpeta sintética
y compare las dos salidas de `git diff --cached`. La orientación humana debe
continuar presente, incluso si el kit añade un bloque al `AGENTS.md`; se deben
conservar otras configuraciones y el contenido preparado. Utilice la skill
indicada en `next` para la etapa pendiente y, al preparar la ejecución de un
proyecto existente, siga `preparar-dev`.

Las órdenes generan carpetas nuevas y no eliminan ejemplos anteriores. El código
de aplicaciones y los datos de estos proyectos son ficticios y no forman parte
de Git de AgentDevKit.

## Dos proyectos de cero, con tres specs

Los ejemplos crean una API HTTP de tareas en memoria y una calculadora de
terminal. Cada proyecto recibe PRD, decisión de UX, diseño y roadmap; después,
cada una de las tres specs es escrita, implementada y comprobada en secuencia.
Son productos didácticos: aprobaciones y revisión son simuladas y no reemplazan
decisiones ni revisión humana en un proyecto real.

En la raíz de este repositorio, con Git, red y Node.js 24+ con npm:

```sh
node tests/example-workflows.mjs
```

El comando instala la versión pública del `@pathbit/agentdevkit` indicada en
`package.json` Este repositorio, con los clientes Codex, Claude y Copilot en dos
proyectos Git nuevos. Crea una carpeta exclusiva en el directorio temporal del
sistema, fuera de Git, e informa el camino del informe. Ninguna carpeta anterior
es borrada. Para probar otra versión publicada, pase el número de la versión
como argumento.

Para validar un tarball local sin consultar el registry npm, use `node
tests/example-workflows.mjs 0.0.30 --tarball /caminho/pacote.tgz`. Informe la
versión exacta del tarball; sin versión, usa la de `package.json`. El modo
offline del npm no bloquea la red de otros procesos. `--output` acepta una
carpeta nueva con padre existente, fuera de Git o en `tmp/`, `temp/`,
`.agent-tests/` e `examples/generated/` del origen, desde que se ignora y sin
archivos staged. `git add -f` o cambios competidores en las reglas de ignorar
pueden versionar los ejemplos.

1. Abra `REPORT.json` la carpeta informada y elección `api-tarefas` o
   `cli-calculadora`.
2. Lea `docs/PRD.md`, `docs/UX.md`, `docs/DESIGN.md` e `docs/ROADMAP.md`.
3. Lea `docs/specs/01/SPEC.md`, `02/SPEC.md` e `03/SPEC.md`; las pruebas de cada
   etapa quedan en `tests/` y los resultados en `.agent-tests/`.
4. Dentro del proyecto elegido, rode `node --test tests/*.test.mjs`. Para la
   calculadora, pruebe `node src/calc.mjs sum 2 3` e `node src/calc.mjs mean 2
   4`.

A API es ejercitada en una puerta local temporal por las pruebas; no persiste
datos y no es un servicio listo para producción. El código del generador es
versionado; por estándar, proyectos, cachés e informes quedan fuera del checkout
del AgentDevKit.

### Reproducir manualmente con un agente

Cree una carpeta temporal fuera de cualquier repositorio Git y entre en ella. La
orden abajo imprime un camino nuevo; use `cd` con el camino retornado:

```sh
node -e "const fs=require('node:fs'),os=require('node:os'),p=require('node:path');console.log(fs.mkdtempSync(p.join(os.tmpdir(),'agentdevkit-manual-')))"
```

Compruebe que la carpeta elegida no pertenece a un repositorio Git y ejecute:

```sh
git init
npm init -y
npx --yes @pathbit/agentdevkit init --agents codex,claude,copilot --lang es --yes
```

En el agente elegido, ejecute las etapas y responda a las preguntas antes de
avanzar:

1. Pídales `configurar-projeto`, después `criar-prd`defina API Para crear y
   listar tareas en memoria. Use `criar-ux-ui` para justificar la ausencia de
   interfaz visual y `criar-design-doc` Para decidir el diseño técnico.
2. Pídales `gerenciar-roadmap` para ordenar tres incrementos: salud de API,
   creación de tareas y lista de tareas. Revise las decisiones propuestas.
3. Para cada incremento, pieza `criar-spec`, responda a las dudas y revise los
   criterios. Pida `implementar-spec` y valide las pruebas antes de la próxima
   spec.
4. Compara tus archivos y resultados con `api-tarefas` En el ejemplo automático.
   Para repetir con la calculadora, use las specs suma, media y validación de
   entrada.

Las decisiones del proyecto manual son sus; el generador automático utiliza
datos sintéticos.

## Proyectos reales existentes

Para verificar la instalación en clones públicos fijados, en la raíz del
repositorio:

```sh
npm run test:oss
```

A [matriz de proyectos](../../../tests/fixtures/oss-projects.json) registra los
commits de Hibernate ORM, EF6, Rust, Go, Tailcat, Express y Requests, además de
Zod y Chi. Para un proyecto solo, use por ejemplo `npm run test:oss -- --project
express`. Los clones e informes se encuentran en una carpeta nueva dentro de
`tmp/oss-compatibility/`. La prueba valida el kit, incluyendo preservación de
archivos e índice Git; no compila ni ejecuta las aplicaciones clonadas. Requiere
red y puede descargar grandes proyectos. Para otras opciones y límites, consulte
[pruebas](../tests/README.md).

## Cenarios de madurez

En la raíz de AgentDevKit, con Node.js 24+ y Git:

```sh
npm run examples
npm run test:examples
```

El primer comando prepara ocho proyectos; el segundo prepara y prueba otros ocho
en una nueva carpeta temporal fuera de Git. Cada comando informa el camino. Para
ejecutar sólo un escenario:

```sh
npm run test:examples -- --case somente-agentes
```

Las copias muestran a los clientes seleccionados en el origen y sus
apuntamientos:

```text
<pasta temporária>/agentdevkit-maturity-<id>/
├── README.md                    índice dos cenários
├── REPORT.json                  prepared, passed ou failed
└── somente-agentes/
    ├── .pbai4devs/              recursos compartilhados
    ├── .claude/                 apontamentos do Claude
    ├── .codex/                  apontamentos do Codex
    ├── .cursor/                 apontamentos do Cursor
    ├── .github/                 apontamentos do Copilot
    └── .opencode/               apontamentos do OpenCode
```

Con todos los clientes seleccionados, el kit también genera `.agents`, `.zcode`,
`.kimi-code`, `.minimax`, `.mimocode` e `.dsh`. Los ejemplos pueden copiar
configuraciones existentes del proyecto, como `.vscode`. Las plantillas y
lassets del generador son la fuente versionada.

| Cenario | Contenido |
| --- | --- |
| sólo agentes | Recursos compartidos, sin aplicación |
| descubrimiento | PRD en borrador |
| planificado | Producto y diseño definidos, sin código |
| app-inicial | API con estructura incompleta |
| app-configurada | API, planificación y configuración |
| Manutencao | Aplicación con historial sintético de release |
| legado | Layout y configuraciones preexistentes |
| monorepo | Dos módulos y caminos con espacios |

Cada ejecución crea una carpeta propia y preserva proyectos e informes
anteriores, incluso archivos humanos añadidos a ellos. Un destino explícito
existente se rechaza antes de cualquier cambio.

Las pruebas ejercitan scripts y APIs locales. Aprobaciones de producto y
dictámenes del gate son datos sintéticos; no comprueban revisión humana, Docker,
interfaz visual, implantación u otros sistemas operativos.

Detalles: [prueba madurez](../kit/scripts/testar-maturidade/README.md).

[reading-pt]: ../../../examples/README.md
[reading-en]: ../../en/examples/README.md
[reading-es]: README.md
