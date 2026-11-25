---
description: "Genera catálogos y apuntamientos a partir del origen compartido."
language: es
---

# Sincronizar agentes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --check
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --force
node --test .pbai4devs/scripts/sincronizar-agentes/tests/TEST.mjs
```

`--check` Sólo confiere y muestra hasta diez caminos en conflicto; la ejecución
normal actualiza los recursos. `--force` puede guardar copia de seguridad en
`.agent-tests/` antes de reparar caminos administrados; conflictos protegidos
continúan bloqueados. El sync directo usa el mismo diario de la CLI para
registrar la operación y proteger la etapa temporal. Si hay una espera, detenga
los procesos que escriben en el proyecto y consulte `npx @pathbit/agentdevkit
recovery --json` en la raíz del proyecto. Utilice el registro del proyecto y la
versión de la CLI que inició la operación. Conserve una copia de los archivos
actuales y compare los cambios con la copia de seguridad disponible. Después de
revisar la operación pendiente, consulte la generación y el ID nuevamente y
ejecute `npx @pathbit/agentdevkit recovery resolve <geração> <id>`. A
continuación, ejecute `npx @pathbit/agentdevkit doctor` y vea el plan con `npx
@pathbit/agentdevkit sync --dry-run --json`. Un diario no válido requiere
revisar sus evidencias y bloquea la resolución. El script rechaza actualizar o
eliminar un archivo cuando identifica más de un hardlink o no puede verificar un
recuento válido. Esto puede bloquear
operación en sistemas de archivos que no proporcionan el recuento. La
conferencia no impide cambios competidores después de la lectura; interrumpa
otros procesos antes de sincronizar. O `--check` informa hardlinks y conteos no
verificados en los caminos que planea cambiar; la situación puede cambiar antes
de la aplicación. En actualizaciones en macOS y Linux, la etapa copia los
metadatos nativos soportados y verifica la copia antes de la publicación. En
macOS, ACLs que niegan escritura, flags de protección o consultas inconclusivas
bloquean la operación; ACLs legibles y xattrs se conservan cuando la
verificación nativa pasa. Remociones con metadatos que se perderían continúan
bloqueadas. ACLs de directorios y alteraciones competidores después de la
verificación no están cubiertas. Un camino informado después de falla puede
contener datos parciales o de otro origen; preservelo y revise antes de
cualquier recuperación. En macOS, un destino de copia de seguridad con ACL
heredada o consulta inconclusiva se niega antes de la copia. La carpeta vacía se
informa para la revisión; la inspección no garantiza privacidad contra los
cambios competidores ni cubre otros sistemas.
Las consultas Git desactivan rastreos heredados solamente en los subprocesos,
sin alterar la configuración del usuario. Lecturas todavía pueden actualizar
metadatos de acceso del sistema de archivos. O [mando
agêntico](../../commands/sincronizar/COMMAND.md) usa la CLI: Ver `sync --dry-run
--json`, aplique `sync` y vete `sync --check`. El script directo utiliza el
manifiesto existente; su `--check` No detecta YAMLs nativos todavía ausentes de
ese manifiesto. A CLI Recompone el manifiesto en la planificación. Recursos
nativos compatibles pueden recibir un bloque corto con la referencia al hub. El
estado guarda el hash del bloque y permite ediciones externas. Un bloque
alterado permanece protegido incluso con `--force`Los enlaces humanos siguen
siendo opacos. Un subagente propio en `.zcode/agents/<nome>.md` Se conserva por
completo cuando ocupa el camino que el kit usaría. Instalaciones legadas de
Gemini CLI pueden tener una contribución del kit en `prompt` TOML. El
sincronizador reconoce su formato en la migración. El sync directo rechaza
líneas del manifiesto que apuntan para `.gemini`, incluso en configuraciones
manuales. En instalaciones antiguas, revise el plan de
`agentdevkit update` conforme a la [migración de clientes][migration]. Archivos
propios del equipo permanecen en el proyecto.

Metadados vienen de la fuente o de la YAML nativo declarado en el manifiesto.
Reglas exigen `trigger` válido; `glob` exige `globs`. Origenes nativos necesitan
pertenecer al catálogo; resultados, cachés y carpetas temporales no entran en
los índices. El tratamiento de los gatillos de Copilot y la migración
conservadora de instrucciones antiguas están descritos en
[Compatibilidad](../../COMPATIBILIDADE.md).

`espelhos.conf` define `agente|pasta|layout`, puede ajustar cada tipo con
`formato|pasta|tipo|formato` y registrar `descoberta|.agents|antigravity`.
`agrupado` preserva el árbol; `plano` retira categorías; `arquivo` preserva
categorías y usa `nome.md`. `mdc`, `instrucoes`, `prompt` e `agente` producen
extensiones nativas; `nenhum` desactiva la derivación del tipo en la ruta
indicada. Con `agents none`, el manifiesto mantiene sólo el catálogo del hub y
las instrucciones comunes. Sin Antigravity en la selección, el Codex usa
`.agents` Solo para skills. `fallback|destino|origem|skills` utiliza el destino
para cada skill cuya ruta de origen está obstruida. El descubrimiento genera los
tres manifiestos JSON Antigravity. Vea los motivos y límites en
[Compatibilidad](../../COMPATIBILIDADE.md).

Sin manifiesto, el sincronizador genera la política de
`templates/clients/ADAPTERS.json` usando la selección salva. Un estado legado
sin selección mantiene `all`. Sin manifiesto ni estado instalado, genera sólo el
hub. Después de la instalación, depende solamente de Node y del hub local, sin
el paquete npm. Él respeta los clientes escogidos. Use `agentdevkit agents
<lista>` para cambiar la selección, o `agents add <id>` e `agents remove <id>`
para ajustarla. El manifiesto generado acompaña estas operaciones de la CLI. En
instalaciones antiguas, use `agentdevkit update` para revisar la migración del
manifiesto Antigravity o la retirada de los apuntamientos legados de Kimi.

El sync directo preserva las reglas humanas de ignore y el índice Git. El bloque
legado de la versión 0.0.21 en `.git/info/exclude` Puede ser migrado cuando hay
prueba de autoría y una sola obra. El original está en
`.agent-tests/agentdevkit/ignore-migrations/`. Apuntamientos y artefactos pueden
ser visibles; comprueba el estado antes de añadir archivos. El diagnóstico
informa archivos privados expuestos y bloques antiguos en el exclude que todavía
puedan afectar a otras worktrees. Entradas nuevas utilizan las templates; hashes
en `state/derived.json` permiten actualizar archivos generados y bloques por
separado, preservando cambios humanos. Una referencia CRLF ya equivalente a la
salida esperada puede ser mantenida intacta, sin bloque duplicado o adopción de
propiedad. Si hay divergencia con un registro derivado, el check directo informa
el conflicto y la API puede regresar `line-ending-diverged`. La normalización no
autoriza sobrescrita. `--check` Sólo verifica; no cambia el índice. Reglas
Claude remanentes después de demarcar el cliente generan aviso y fallo en el
check, ya que todavía pueden estar activas. Consultelas antes de eliminarlas. Un
enlace, error o límite de barrido
También deja el alcance no verificado. Posibles enlaces en ejemplos Markdown
pueden generar aviso conservador; el archivo no es adoptado por ello. Los
efectos obsoletos pueden ser eliminados cuando se demuestre la propiedad;
archivos y carpetas propios, incluso los adicionales dentro del mismo recurso,
deben permanecer. El estado derivado registra remociones comprobadas para
conciliarlas en el próximo `update`; campos adicionales existentes en el estado
se conservan.

## Mantenimiento de sincronizador

- [SCRIPT.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs)
  proporciona CLI, las exportaciones públicas y la
  entrada a la etapa privada.
  [private-stage.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/private-stage.mjs)
  confiere la
  identidad de la etapa antes de permitir operaciones en ese modo.
  [synchronize.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/synchronize.mjs)
  el plan, verifica las precondiciones y
  produce el informe de `--check`.
- [manifest.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/manifest.mjs)
  resuelve la selección de clientes y los destinos.
  [references.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/references.mjs)
  Se trata de los formatos de las referencias.
  [projections.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/projections.mjs)
  deriva los catálogos y entradas raíz,
  incluyendo la retirada de archivos de propiedad comprobada.
- [workspace.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/workspace.mjs)
  confiere límites e identidad de los caminos.
  [operations.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/operations.mjs)
  ordena las escrituras y remociones, captura
  los bytes esperados y usa
  [git-safety.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/git-safety.mjs)
  En las consultas
  Git.
  [derived-state.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/derived-state.mjs)
  preserva los registros de
  propiedad.
- [metadata.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/metadata.mjs)
  concentra las verificaciones de metadados.
  [apply.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/apply.mjs)
  aplica el plan y registra la recuperación.
  [backup.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/backup.mjs)
  verifica las copias adicionales solicitadas por
  `--force`.

[migration]: ../../COMPATIBILIDADE.md#migrar-carpetas-legadas

[reading-pt]: ../../../../../.pbai4devs/scripts/sincronizar-agentes/README.md
[reading-en]: ../../../../en/kit/scripts/sincronizar-agentes/README.md
[reading-es]: README.md
