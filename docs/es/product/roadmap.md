---
description: "Entregas publicadas, especificaciones y próximos pasos del AgentDevKit."
status: vigente
language: es
---

# Roadmap

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit comparte recursos entre agentes y los instala en proyectos nuevos o
existentes, preservando los archivos del equipo. El trabajo sigue producto,
experiencia, diseño, arquitectura, roadmap, spec, implementación y revisión.
[PRD](prd.md), a [UX CLI](ux-ui.md) e o [diseño técnico](design.md) Están
registrados como aprobados; esto no sustituye las pruebas de cada entrega.

Este roadmap organiza lo que ya se ha especificado y lo que falta verificar.
`[x]` identifica una **release publicada**; no significa que todos los criterios
de las specs hayan sido nuevamente auditados. `[-]` indica trabajo en curso; `[
]`, trabajo pendiente. Los resultados dependen de las evidencias y del ambiente
indicado, no sólo de una marca en este documento.

## Entregas publicadas

Las releases de `v0.0.1` a `v0.0.35` constam no [GitHub][releases]. O
[changelog][changelog] detalla cada versión; la tabla agrupa las entregas para
facilitar la lectura. Las versiones registran comportamiento histórico y no
reemplazan las decisiones más recientes del proyecto.

| Estado | Versiones | Entrega | Especificaciones relacionadas |
| --- | --- | --- | --- |
| [x] | 0.0.1–0.0.3 | Distribución, selección de clientes y fuentes compartidas. | [0.0.1][v1], [0.0.2][v2], [0.0.3][v3] |
| [x] | 0.0.4–0.0.6 | Estructura del proyecto, ejemplos, registros, licencia y presentación. | [GitHub Packages][packages], [0.0.4][v4], [0.0.5][v5], [0.0.6][v6] |
| [x] | 0.0.7–0.0.10 | Proyectos existentes, preservación, coexistencia y dos registries. | [0.0.7][v7], [0.0.8][v8], [0.0.9][v9], [dos registries][dual], [0.0.10][v10] |
| [x] | 0.0.11–0.0.13 | Seguridad local, integración aditiva y pruebas en proyectos reales. | [seguridad][security], [integración][additive], [proyectos reales][real] |
| [x] | 0.0.14–0.0.16 | Preservación del ignore de la raíz, especialistas y CI portátil. | [ignore del proyecto][project-ignore], [desarrollo][development], [CI][ci] |
| [x] | 0.0.17–0.0.21 | Migración de estado, sincronización, ignore local histórico y etiquetas. | [Estado][state], [Sincronización][sync], [ignore a los clientes][client-ignore], [herramienta][tool], [etiquetas][tags] |
| [x] | 0.0.22–0.0.23 | Descubrimiento, preservación, destinos y orden de implementación. | [descubrimiento][discovery], [destinos][targets], [orden][order] |
| [x] | 0.0.24–0.0.27 | Protección de contenido humano, revisión, índice y límites de consultas Git. | [descubrimiento][discovery], [Sincronización][sync] |
| [x] | 0.0.28–0.0.30 | Preparo y ejecución de scripts, bootstrap y matriz de proyectos. | [desarrollo][development], [descubrimiento][discovery] |
| [x] | 0.0.31–0.0.33 | Diario de recuperación, revisión por criterios y migración de adaptadores. | [recuperación][recovery], [diario][journal], [el alcance Claude][claude-scope] |
| [x] | 0.0.34 | Jornada guiada y referencias a métodos ya presentes en el proyecto. | [experiencia guiada][guided] |
| [x] | 0.0.35 | Inventario y jornada de documentación de sistemas existentes. | [documentación de legado][legacy-doc] |

A [spec inicial][v1] organiza la primera entrega; las demás están en [índice de
specs][specs]. Una spec aprobada registra alcance, no comprueba por sí solo que
sus criterios continúan atendidos en todas las versiones o clientes. O [control
de las specs](spec-audit.md) reúne el estado de la auditoría de cada una.

## Prioridades y pendencias

| Frente | Siguiente verificación |
| --- | --- |
| Preservación y recuperación | Revalidar los criterios de las specs de recuperación con las pruebas de Git, metadados y competencia para cada plataforma. [Control de las specs](spec-audit.md) |
| Clientes, órdenes y recursos | Conferir cambios de descubrimiento, metadados y compatibilidad en el cliente afectado y probar la preservación al actualizar instalaciones existentes. [Compatibilidad](../kit/COMPATIBILIDADE.md) |
| Documentación de sistemas existentes | Comprobar la conexión entre inventario, comportamiento del código y pruebas por flujo. [Guía](../guides/documentation.md) |
| Pipeline y distribución | Ejecutar las pruebas del commit candidato y comparar el artefacto aprobado en los dos registries cuando haya una nueva versión. [Mantenimiento](../maintainers/maintenance.md) |

## Dependencias para una próxima publicación

1. Concluir los ajustes y resolver los criterios pendientes de las specs
   afectadas.
2. Prueba el estado final y registrar evidencias, limitaciones y revisión
   independiente.
3. Aprobar la matriz de CI y verificar el artefacto candidato antes de la
   publicación.
4. Definir la siguiente versión y publicar release y paquetes asociados a su
   etiqueta; comparar los artefactos publicados y probar su instalación en los
   dos registros.

Ninguna versión o fecha futura es presumida. La aprobación de una spec o la
existencia de una etiqueta no sustituye las pruebas de la modificación en curso.

## Registro histórico de validaciones

Los registros abajo preservan resultados, hipótesis y pendencias observadas en
candidatas anteriores. Menciones a un checkout, estado local o CI se refieren al
contexto de cada ensayo. Use los frentes arriba y las evidencias de la versión
correspondiente para decidir lo que todavía necesita ser verificado.

### 1. Preservación y confiabilidad

- [-] Validar y entregar la corrección local de la divergencia entre el sync de
  CLI y sincronizador directo. La candidata reconcilia la transición observada
  al añadir metadatos; bloquea los estados ambiguos cubiertos por las fixtures,
  incluso con `--force`, y revalida las dependencias registradas para esa
  reconciliación antes y después de la copia de seguridad. Eso no garantiza
  atomicidad después de la última lectura. Las pruebas de regresión cubren
  Claude, Codex, Gemini, contenido humano e índice staged en fixtures; integran
  el perfil portátil de la pipeline. Referencias ya duplicadas no son reparadas
  automáticamente. La versión alterada todavía precisa de CI en Windows,
  revisión de migraciones y validación antes de la publicación; no fue aplicada
  al router. Una falla simulada de lectura del proyecto también reveló
  diagnóstico preexistente con alcance `staging` incorrecto; código y camino
  fueron mantenidos. La revisión de la migración también identificó limpieza de
  directorios vacíos sin comprobar su creación por la operación; la preservación
  de ese caso necesita prueba. La suíte de preservación Git pasó en 140 pruebas
  en macOS y 139 en Linux; respectivamente uno y dos casos fueron pulados por
  dependencias de plataforma.
- [-] Comprobar la integración de [registros de
  recuperación](../specs/registro-recuperacao/SPEC.md), del [diario en
  disco](../specs/diario-disco/SPEC.md) y del [backup y
  manifiesto](../specs/manifesto-recuperacao/SPEC.md) En el instalador y el
  sync. Una espera en el diario bloquea nuevas mutaciones hasta la resolución
  explícita. Los primeros tests aislados verificaron la negativa de propietario
  o modo incompatible y la detección de cambios observables durante la lectura.
  ACLs y intercambios de ancestros exigen comprobaciones propias.
- [-] Corregir la creación de temporales para no ampliar el modo de archivos
  existentes; la [spec](../specs/sync-permissoes/SPEC.md) registra pruebas y
  límites.
- [-] Finalizar y revisar los cambios locales `init`, `update`, `sync`,
  diagnóstico y auditoría. Preservar archivos humanos, contenido staged, índice,
  configuración Git y `.gitignore` del proyecto; probar colisiones, migraciones,
  enlaces, aliases de caminos, fallas y recuperación. La consulta directa
  muestra caminos conflictivos y los subprocesos Git de la candidata desactivan
  rastreos heredados sin alterar la configuración. Las consultas de exclusión,
  índice y alteraciones staged usan idioma estable en el subproceso para
  reconocer ausencia de Git; señales y errores inesperados continúan bloqueando.
  Las pruebas de exclusión e índice pasaron en macOS y Linux con mensajes
  localizadas; Windows y las demás consultas Git todavía necesitan verificación
  específica. Un tarball local también pasó de verificación específica. `init`,
  `update` e `sync` en tres fixtures Linux con Git en francés, sin repositorio o
  con índice staged; no fueron probados registry, `npx` o Windows en esa prueba.
  Fixtures y revisión independiente cubren trace y Trace2 en macOS; pruebas
  locales también pasaron en Linux. Esto no prueba ausencia de otros efectos
  externos. En el checkout actual, `sync --check` identifica nueve conflictos
  preservados:
  cinco reglas Claude sin propiedad comprobada, una referencia Git que puede
  continuar activa globalmente y tres catálogos sin historial de propiedad.
  Después de reconocer referencias totalmente idénticas sin modificarlas, la
  consulta
  pasó de 1.077 para 453 derivaciones desactualizadas y mantuvo nueve conflictos
  y
  una exclusión local legada. En la versión anterior, una fixture descartó un
  registro histórico desconocido. El ajuste integrado cubre la misma grafía;
  La reconciliación de los aliases y las migraciones aún necesita trabajo.
  En la candidata local, `doctor`, `sync --check` y el sync directo identifican
  registro de archivo eliminado sin entrada en estado instalado cuando
  La consulta alcanza el diagnóstico. `sync --check` conserva la observación si
  el
  planificación falla después de la lectura; errores anteriores todavía pueden
  ocultarla.
  La candidata local preserva registros desconocidos por la misma grafía y
  bloquea colisiones en el objetivo; fixtures cubren selección, `--force` y
  bloques
  coexistentes. Aliases entre registros y metadatos siguen sin prueba completa.
  Una revisión confirmó en fixture sintética que la migración de `estado`
  recreación
  un archivo correlacionado, pero conserva el registro antiguo y lo indica como
  modificado. Lo mismo ocurre en la base; una guardia experimental falló con
  `Derived.json` En volumen insensible la caja. Otra rechazó ese caso y
  permitió migración independiente y fue integrada como bloqueo conservador;
  La reactivación automática y aliases entre registros siguen pendientes.
  En una fixture con registros de archivo y bloque coexistentes fuera de la
  selección,
  la candidata preservó los tres registros y permitió operación independiente;
  El origen natural de ese estado no fue comprobado.
  Un prototipo para aliases bloqueó caminos Unicode físicamente distintos;
  un intento de reducir el bloqueo añadió bloque en fixture humana y
  preservó texto e índice, como permite el contrato. La fixture no tenía
  frontmatter y no comprueba el descubrimiento ni preservación de metadatos.
  Después de la integración, un tarball local pasó instalación offline vía
  `npx`,
  proyecto nuevo, proyecto existente y actualización en macOS. La prueba no
  cubre
  registries publicados ni comprueba todos los aliases o metadados.
  En ocho fixtures de la versión npm `0.0.21`, los caminos Git y contenidos
  humanos
  Los muestreos pasaron en las comparaciones de la actualización. Claude bloqueó
  en ocho
  reglas legadas; Codex, Copilot, Gemini, OpenCode y Cursor actualizaron, pero
  Todos mantuvieron su vida en el mundo. `shared-ignore-legacy` el check. La
  variante Codex con regla
  Claude también informó activación no verificada. El init antiguo alteró
  `info/exclude` en las ocho fixtures. Esto no permite eliminar reglas
  existentes.
  Un prototipo de actualización preservó las reglas y sus fuentes en dos
  fixtures
  Claude, pero alteró skills Git referenciadas por ellas. Él volvió éxito
  con aviso a pesar de la espera; falta definir un estado explícito. No prueba
  preservación de comportamiento y permanece fuera del kit.
  Compara candidatos y preserve contenido antes de resolver; no force sync.
  Una suíte específica pasó en macOS y Linux con marcadores de exclusión
  antiguos íntegros, alterados, truncados y múltiples, además de worktree
  vinculada. Ella compara contenido Git e índices; los patrones legados
  continúan
  activos y la prueba no cubre metadatos del sistema de archivos ni Windows.
  La candidata bloquea caminos afectados por Git aninhado o gitlink, inclusive
  backups; pruebas aisladas cubren índices externos e internos, submódulos no
  relacionados y detección durante la aplicación. Revisión y validación en los
  sistemas
  soportados continúan necesarias; la protección no es atómica. El sync elige el
  nombre de copia de seguridad antes de consultar el índice, permitiendo
  submódulos hermanos y
  negando gitlinks coincidentes, incluso ausentes en el disco. Evaluar lo mismo
  falso bloqueo en el instalador. La copia de seguridad de sync crea archivos
  exclusivamente,
  copia en bloques limitados y verifica identidad y hash antes de continuar;
  fallas en el intento de crear la carpeta o durante la copia informan su camino
  Como incierto y no la eliminan. Esto no fija a los ancestros ni elimina
  intercambios
  Después de la última verificación, definir y probar la política
  de lectura y generación a partir de fuentes que estén en un Git aninhado;
  La protección actual cubre mutaciones, no impide esa lectura.
- [-] Validar a [recuperación
  conservadora](../specs/recuperacao-conservadora/SPEC.md) implementada en el
  instalador y en la sincronización. La candidata prepara la copia anterior y
  registra la operación antes de las mutaciones. Después de una falla, preserva
  los caminos públicos y exige una revisión explícita del proyecto parcial antes
  de retomar las alteraciones. El aceptado depende de los resultados de la
  matriz. Prueba y correcciones de competencia durante la aplicación siguen como
  trabajo separado. El perfil completo ejecuta la regresión en modo estricto. La
  investigación comenzó con sustituciones humanas retiradas o sobrescritas
  durante el rollback, inclusive después de actualización y con contenido
  diferente. A [spec histórica de rollback][v8] registra el contrato anterior.
  Durante la investigación, el instalador pasó a rechazar caminos exactamente
  duplicados y conferir nuevamente caminos y acciones después de la copia de
  seguridad. Las fixtures cubren creación, actualización, remoción y
  alteraciones mixtas. Esta verificación cubre nombres exactos hasta el momento
  de la última conferencia. Una revisión estática identificó que ese control no
  comparaba alteraciones en los bytes del plan.
  La candidata rechaza acciones incompatibles con el contenido o con el estado
  anterior informado antes de la aplicación; ocho escenarios sintéticos pasaron
  En macOS y Linux. Propiedades calculadas solo se evalúan durante la ejecución.
  Para añadir o retirar bloque en contenido staged divergente, ella también
  repite la verificación de preservación con el estado y los bytes observados en
  aplicación. Casos de aumento Markdown y retirada TOML con ediciones staged y
  no se ha pasado en macOS y Linux; la verificación no impide el cambio
  posterior del propio plan en memoria.
  Para estos bloques staged, la candidata valida y publica una copia privada de
  los
  bytes propuestos; migración y demás acciones todavía no usan ese mecanismo.
  En Gemini, añadir y eliminar un bloque puede reerializar el valor TOML de
  `prompt` y mantener roturas de línea extras o una atribución antes ausente.
  En seis ejemplos, un parser independiente confirmó que la vuelta no preservó
  ni los bytes ni el valor original del documento. Un prototipo aislado con
  metadados en el bloque pasó 1.024 variaciones de las cuatro formas de string y
  256
  casos sin `prompt`, con parser independiente. Son ejemplos sintéticos, no
  proyectos distintos; todavía no comprueban propiedad, legado o integración.
  El cargador local de Gemini 0.67.0 aceptó las etapas aplicables en cinco
  fixtures aisladas, sin red o inferencia; eso no comprueba ejecución del
  orden, procesamiento de referencias o comportamiento del modelo. La prueba
  También observó el helper público `0.0.21`: las cinco fixtures no volvieron al
  valor y bytes originales. La prueba versionada
  `tests/toml-preservation-proof.mjs` apuntó 40 diferencias en la implementación
  anterior. Con la candidata integrada, los 40 casos restauraron los bytes en
  macOS; esta prueba no usa parser independiente o cliente real.
  Una prueba posterior del cargador expandió un archivo sintético incluido y
  confirmó la duplicación de argumentos cuando el TOML y la inclusión contienen
  `{{args}}`. A CLI y sync ahora usan la misma regla de argumentos para el
  texto humano de TOML. En la implementación anterior, en 20 fixtures Linux el
  El marcador permaneció único, pero la restauración byte la byte falló.
  parser semántico de esta matriz es el del kit, no una verificación
  independiente.
  En la candidata integrada, esos 20 ciclos pasaron en Linux, inclusive a
  restauración de bytes y verificación del comentario de procedencia. Uno
  lector restringido a las fixtures compara los bytes humanos sin usar la
  restauración
  del kit; el parser semántico y el digest siguen siendo los del producto. BOM e
  CRLF Fueron ejercitados en fixtures sintéticas. O TOML no estaba staged y
  estos ciclos no incluyeron `update` o edición humana intermedia.
  Estas pruebas no incluyen respuesta de modelo o sesión completa de Gemini.
  La validación TOML la candidata pasó a aceptar enteros de 64 bits sin
  convertirlos a `Number`. Una fixture con entero mayor que la precisión de
  `Number` pasó por la razón de la muerte. `init`, `update` y los dos caminos de
  `sync` en macOS
  y Linux, preservando los bytes del entero y los archivos Git observados.
  prueba no cubre la restauración integral del prompt ni TOML arbitrario; el
  Windows sigue pendiente.
  La candidata registra procedencia en comentario externo al prompt, vinculada
  al digest existente. Un ciclo de downgrade para la CLI `0.0.21` Se denegado
  preservando los archivos observados; eso no garantiza todas las versiones o
  situaciones. No presumirá la forma original de archivos legados.
  El cargador local de Gemini 0.67.0 aceptó las cuatro formas de órdenes V3
  generados por el helper, expandiendo un argumento y una referencia sintética;
  Un parser independiente también aceptó los archivos. La prueba no ejecutó el
  flujo de instalación o modelo. En otras fixtures, TOML staged divergente
  provocó rechazos conservadores en `init`, `update` y en los dos syncs; a
  cambio
  de cliente ha conservado el índice y el texto humano en macOS y Linux. Windows
  y
  Otras combinaciones staged permanecen pendientes.
  A CLI ahora preserva un TOML preexistente con bloque sin propiedad
  comprobada e instala los demás recursos; cuatro fixtures cubren `init` e
  `sync`, con bloques idénticos o diferentes e índice staged. Esa prueba de
  propiedad no cubre la restauración de prompts con bloque nuevo.
  En otra fixture, un hash antiguo preparado manualmente en `derived.files`
  permaneció después de la TOML humano ser preservado. No se observó ninguna
  pérdida;
  `sync --check` Volvió éxito a pesar de ese registro. El origen natural de esa
  La persistencia y su política de descarte aún necesitan investigación.
  otro flujo natural, un registro antiguo coexistió
  temporalmente con un nuevo bloque y fue consolidado por el sync siguiente; el
  prompt resultante presentó dos referencias al mismo origen. En fixture
  aislada, el cargador Gemini amplió ambas; no hubo llamada modelo. A
  corrección local preserva sin adopción un prompt integralmente equivalente al
  generado. El parser y su licencia acompañan el kit; prompts diferentes y la
  La retirada sigue a la candidata de preservación TOML,
  Todavía está sujeta a los criterios y límites de la spec.
  O [borrador de preservación TOML](../specs/toml-preservacao/SPEC.md) registra
  los criterios, los casos ambiguos y la validación necesaria.
  Validar las demás hipótesis y diseñar un plan inmutable siguen pendientes.
  Las pruebas de esa ronda todavía eran ignoradas en Windows.
  Antes de la implementación de la recuperación conservadora, la pérdida fue
  reproducida
  en macOS y Linux. Después de los primeros controles de protección, la suíte
  estricta en
  macOS tuvo 9 aprobaciones, 23 fallas y 3 pruebas ignoradas. Las fallas
  incluyen
  sobrescrita después de la actualización, limpieza después de publicación y
  pérdida de metadatos.
  La matriz CI exige el perfil nativo de macOS, que rechaza pruebas ausentes,
  ignorados o pendientes.
  Otra fixture reprodujo en macOS y Linux la creación de archivo fuera de la
  proyecto cuando un escritor intercambia un ancestro de copia de seguridad por
  enlace antes de
  apertura. La creación exclusiva protege el nombre final, no los ancestros.
  Un prototipo POSIX com `openat` evitó el enlace en la fixture, pero no impide
  que
  la propia carpeta abierta se mueve fuera antes de la creación.
  Otra reproducción cambia la copia de seguridad después de la verificación de
  contenido y antes de la reproducción
  timestamps; sync puede anunciar la copia modificada como válida.
  Los escenarios actuales no cubren todas las formas de alteración.
  En la respuesta inmediata a un fallo posiblemente parcial de planificación,
  aplicación o herramienta, CLI orienta revisión y no sugiere nueva mutación.
  Una etapa intermedia pasó a informar caminos de copia de seguridad conocidos
  en
  fallas, sin afirmar que las copias estuviesen completas, y distinguiendo
  caminos
  de etapa en fixtures. El sync directo ya avisaba sobre aplicación parcial.
  Esa etapa precedió la introducción del diario persistente.
  Una investigación local de init, migración y eliminación ha demostrado que la
  captura
  Necesita incluir directorios. La investigación cubrió llamadas instrumentadas
  y
  Precedió la reserva de la raíz ausente y el manifiesto previo del sync
  directo.
  sync ahora usa la misma secuencia interna de acciones lógicas para calcular
  caminos afectados y ejecutar escritos y remociones. Cada escritura incluye los
  padres candidatos, verificados nuevamente en el momento de la creación. La
  secuencia
  No representa temporales, copias de seguridad o rollback y no es un plan de
  recuperación.
  El instalador también calcula y reutiliza candidatos a la poda de directorios;
  La lista es condicional y no cubre todos los efectos ni captura sus datos.
  En la aplicación del plan y en el sync directo, el nombre temporal se conserva
  después
  `rename` exitoso, evitando apagar una recreación concurrente en ese punto.
  Después de la planificación exitosa, todavía intenta eliminar la etapa
  recursivamente.
  Un rename
  entre hardlinks del mismo inode puede dejar el nombre original sin aviso;
  La limpieza después de la publicación por hardlink continúa pendiente.
  En fallo en la creación exclusiva, la aplicación del plan y el sync directo
  preservan e informan el nombre incierto, incluso en colisiones y grabaciones
  parciales; eso no comprueba su existencia. Cuando el sync de la etapa privada
  informa caminos inciertos, la etapa también es mantenida y reportado. Otras
  Las formas de falla y los cambios competidores todavía necesitan verificación.
  Errores antes o después del intento de publicación también preservan el nombre
  temporal incierto; esto no corrige la limpieza después de publicación exitosa.
  En sync directo, fallas antes del intento de publicación no restauran el
  grupo inalterado sin acciones anteriores. Una alteración concurrente observada
  se conserva incluso si tiene los bytes planificados; en fallo pre-publicación,
  la
  limpieza no elimina el temporal creado e informa su camino como incierto.
  El caso original ejercitaba la protección antes de la publicación. El
  diagnóstico de
  candidata informa caminos afectados o inciertos para revisión.
- [-] Garantizar la protección y el diagnóstico de las copias de seguridad que
  pueden contener datos privados. Una fixture confirmó que pueden aparecer en
  Git cuando el proyecto no los ignora. Preserve el índice, los ignores y la
  configuración Git; no presuma que el directorio de copia de seguridad esté
  protegido. [Seguridad privada](../specs/backup-privado/SPEC.md) cubre la
  carpeta del instalador; hay corrección local en evaluación. ACLs, Windows y el
  resto de la recuperación requieren validación separada.
- [-] Comprobar la preservación de metadatos nativos de archivos existentes en
  las plataformas soportadas. Fixtures en macOS han reproducido pérdida de ACL y
  atributos extendidos en `0.0.21` y en una candidata anterior. Las pérdidas
  afectaron las copias de seguridad comprobadas y la actualización directa del
  catálogo. Fixtures Linux en tmpfs reproduciron la pérdida de xattr en el
  instalador, en la copia de seguridad y en sync. El ensayo no cubrió ACL en
  Linux. Testar `init`, `update` e `sync` en cada sistema soportado. En fixtures
  macOS una ACL que negaba la escritura se perdió cuando el instalador
  complemento `AGENTS.md` existente y cuando el sync actualizó el catálogo;
  ambas operaciones retornaron éxito. A flag inmutable `uchg` bloqueó la
  sustitución en los dos escenarios observados. Las pruebas de ACL Deben
  distinguir reglas benignas de negaciones de escritura. Antes de los controles
  de metadados, `update` y los dos modos de sync perdieron un atributo sintético
  en TOML Gemini mixto en macOS y Linux. Un control intermedio en macOS ha
  rechazado cambios si la utilidad lista atributos en el archivo planificado o
  no pudiera verificarlos. Los tres
  Los flujos pasaron por rechazo en el ensayo. El listado por sí solo no
  comprueba
  atributos ocultos, ACLs, flags o autorización.
  Un helper experimental en macOS copió una ACL benigna y un atributo entre
  archivos sintéticos; todavía no comprueba autorización ni integra el paquete.
  En Linux arm64, un prototipo consultó el tamaño de la lista de nombres de
  xattrs
  accesible con el mismo binario en dos imágenes glibc y musl. La consulta
  básica
  También pasó en x64 bajo traducción, en `tmpfs` e `overlayfs`, sin ejecutar
  kit. Las pruebas no abarcan x64 nativo, atributos ocultos, ACLs, distribución
  o preservación integral.
  En otra fixture `overlayfs`, ACL benigna y xattr fueron copiados entre
  archivos;
  tmpfs regresó `ENOTSUP` y musl no encargó o resolvió la biblioteca. La copia
  de seguridad
  demuestrativo no testó restauración ni comprobó autorización o sigilo.
  En otro ensayo aislado, un addon temporal copió ACL benigna y tres xattrs
  para copia de seguridad y archivo actualizado `overlayfs` ARM64, con glibc y
  musl;
  el lector independiente confirió valores. El fallback y la integración no
  fueron
  probados, y otros namespaces dependen de un chequeo realizado por el ensayo.
  Un paquete npm sintético ha instalado este binario offline en las dos
  imágenes, sin
  scripts o compilador PATH de la instalación. Eso no prueba `npx` Ni el kit.
  Una copia experimental del kit pasó 48 escenarios de actualización y sync:
  24 ARM64 y 24 x64 bajo traducción, con 12 alteraciones y 36 recusas esperadas
  por
  atributo sintético o addon ausente o corrompido.
  En musl, Git vino de un wrapper glibc; x64 nativo, soporte a ACL benigna
  kit y distribución permanecen sin prueba. Una reconstrucción en la misma
  imagen produjo
  el mismo hash del addon; fuente y build no están versionados ni validados en
  CI. Esa copia permanece aislada y no fue publicada.
  En macOS y Linux, sync directo y la aplicación por CLI Ahora se niegan los
  cambios
  planificados en archivos regulares con bits POSIX especiales. Esta protección
  no
  cobre directorios, ACLs/xattrs o los planes mostrados por `--check` e
  `--dry-run`.
- [-] Diagnosticar registros derivados divergentes sin reemplazar TOML humano.
  Después de una edición humana y `update`, `doctor` e `sync --check` Regresaban
  éxito a pesar del viejo hash. Para TOML preservado, la candidata informa
  divergencia, ausencia o lectura no verificable en esos comandos; el check
  directo todavía no identifica el camino. Ausencia y error fueron cubiertos por
  test unitarios. La corrección no resuelve la ambigüedad de propiedad cuando
  bytes antiguos vuelven.
- [-] Aplicar la decisión actual: nuevas operaciones no deben cambiar la
  configuración Git, editar `.git/info/exclude` ni crear ni cambiar ignores en
  la raíz o en los clientes. Ignores existentes en el hub también se conservan.
  Algunos archivos pueden aparecer en `git status`; el diagnóstico debe avisar
  sobre archivos privados visibles. Criterios históricos, como los de [ignore
  del proyecto][project-ignore], [ignore a los clientes][client-ignore],
  [integración][additive], [0.0.3][v3], [0.0.7][v7] e [Estado][state], necesitan
  ser revisados antes de servir como contrato para esa evolución.
- [-] Validar los ajustes de reglas de Copilot y la preservación de reglas y
  metadatos humanos. El descubrimiento y la carga varían por cliente; una
  referencia generada no prueba la ejecución de la regla o skill.
- [-] Corrigir el [el alcance de las reglas
  Claude](../specs/escopo-regras-claude/SPEC.md) e migrar apuntamientos sin
  ampliar activación ni borrar contenido humano. El planificador ahora está
  conectado al sync local, con preservación conservadora de reglas legadas y
  diagnóstico de alcance no verificado. La revisión pasó en las pruebas de
  recursos en macOS y de proyectos en Linux. Una prueba con Claude confirmó la
  carga por `paths` En regla generada por el sync integrado y la lectura
  explícita del origen en sesión separada; ella no prueba lectura automática.
  Otra prueba con Claude  encargó la apertura tanto `always_on` cuánto
  `model_decision` Legadas sin `paths`; llamadas `Read` Las fuentes solo
  ocurrieron en la sesión que pidió lectura explícita. Son fixtures con sandbox
  y no prueban obediencia ni comportamiento de todos los clientes. Persisten la
  validación Windows, la prueba de la generación por el instalador y la
  recuperación concurrente. Un intento de observar la regla en el router paró
  antes de iniciar el modelo porque el aislamiento bloqueó un área temporal
  compartida; su carga en ese proyecto no fue verificado. El ajuste
  Todavía no se ha aplicado al proyecto consumidor ni publicado.
  En laboratorio, una interrupción deliberada del prototipo dejó un apuntamiento
  sin registro; la retomada informó pendencia. El prototipo no fue integrado y
  Necesita recuperación confiable antes de uso en proyectos existentes.
- [-] Validar la skill de implementación en clientes reales. En una fixture con
  spec en borrador, Claude leyó la skill, interrumpió la implementación y
  preservó archivos e índice. Una primera respuesta sugirió dispensar PRD o
  diseño; después de aclarar la regla en la skill, otra sesión los reconoció
  como obligatorios. Son sesiones aisladas, sin shell, y no comprueban ejecución
  de pruebas, consulta al remoto o comportamiento en otros proyectos. Después de
  renovar Claude, una prueba de la 0.0.21 Sugó al implementador e intentó editar
  sin spec; el sandbox bloqueó la edición. En el paquete local actualizado, el
  perfil declaró la skill, el Claude leyó su origen y no intentó editar. Incluso
  después de aclarar el orden, otra sesión sugirió crear la spec antes de
  comprobar la preparación del proyecto. Cada resultado es de una sesión
  aislada, sin comprobar comportamiento en proyecto gravable; la orientación de
  etapas permanece pendiente. CLI local ahora distingue producto de preparación
  de medio ambiente con `next` e `--intent`, sin ejecutar la etapa; la respuesta
  continúa exigiendo una conferencia de las evidencias. En el modo de producto,
  las advertencias en el inventario documental interrumpen la
  sugerencia de etapa, incluso por enlaces no seguidos. En otra sesión, el
  Claude
  indicó el orden, pero ofreció implementar
  Sin spec. En la repetición, no ofreció la dispensa, pero volvió a sugerir la
  spec
  sin confirmar la preparación; el comportamiento continúa en revisión.
  En una prueba asistida posterior, leyó el JSON producido por CLI e indicó la
  preparación primero; la sesión no demuestra que llamaría la CLI Por cuenta
  propia.
- [-] Comprobar la creación y uso de skills en sesiones distintas. Con la
  candidata local `0.0.30`El Claude creó una skill de resumen de CSV en proyecto
  sintético con Git preexistente; el controlador sincronía y `--check` pasó.
  Otra sesión descubrió la skill, leyó su origen y el CSV y respondió cuatro
  registros y suma 36, conferidos independientemente. Índice, ignores y archivos
  humanos verificados permanecieron iguales. La prueba no cubre la versión
  pública `0.0.21`, otros clientes o cambios transitorios; Claude no ejecutó
  sync.
- [-] Comprobar compartir entre clientes. Copilot descubrió y llamó a skill
  creada por Claude, leyó su fuente y un nuevo CSV con campo entre aspas y valor
  no válido, y reprodujo una instrucción presente solamente en la fuente. La
  suma y la línea inválida coincidieron con el cálculo independiente. El mismo
  caso pasó con la candidata local y con el paquete npm `0.0.21`, usando una
  copia de la skill ya creada. En una sesión anterior, no hubo lectura separada
  de la fuente; la respuesta correcta, sola, no comprueba que sus instrucciones
  fueron seguidas. Na fixture de la versión publicada, `init` Alteración
  `.git/info/exclude`, preservando el tramo humano; índice y `.gitignore`
  permanecieron iguales. La prueba cubre solamente esos clientes y escenarios,
  sin comprobar la ausencia de cambios transitorios.
- [-] Al crear un agente con YAMLs nativos, usar el `sync` la CLI para
  recomponer el manifiesto y verificar el frontmatter generado. El script
  directo puede validar un manifiesto anterior sin incorporar los nuevos YAMLs.
  Una fixture con Claude y Copilot confirmó la diferencia en la candidata local
  y en el paquete público `0.0.21`. El índice y el `.gitignore` se conservaron;
  la versión pública cambió `.git/info/exclude` En otra sesión, también leyó la
  fuente e incluyó una instrucción presente solamente en ella; hubo un intento
  fallido de lectura fuera del proyecto y lectura de la carpeta temporal que lo
  contenía. Los permisos nativos no fueron comprobadas aisladamente y el perfil
  fue creado por el controlador.
- [ ] Revisar conflictos y apuntamientos desactualizados en la sincronización
      del
  checkout de desarrollo, sin borrar contenido o exclusiones Git existentes.
  La situación depende de los archivos y configuraciones locales de cada
  entorno.
- [ ] Ejecutar la suite completa del estado final, incluyendo el paquete
      instalado,
  y acompañar la matriz real en Linux, Windows y macOS. Los casos NTFS, skips
  volúmenes sin hardlinks y límites de competencia deben haber resultado
  explícito.
- [-] Comprobar copias de seguridad, operación pendiente y revisión del estado
  parcial en la candidata de recuperación conservadora. La aplicación normal
  todavía tiene ventanas entre la verificación y la eliminación o sustitución de
  un camino.
- [ ] Actualizar documentación y registrar evidencias y revisión independiente
  del diff final antes de crear commit, tag o publicar una nueva versión.

### 2. Pruebas en proyectos y clientes

La matriz base define 40 proyectos sintéticos; su ampliación y revisión están en
marcha. Una prueba separada verifica en memoria 16.383 combinaciones de
selección de clientes. También hay flujos con decisiones simuladas. Estas
verificaciones no comprueban la ejecución de cada skill y perfil en cada
proyecto o cliente; sus límites están descritos en sus pruebas.

Después de integrar el ajuste de alcance Claude, el mismo paquete local fue
ejercitado en 40 proyectos en macOS y 40 en Linux: en cada sistema, 34 pasaron y
6 quedaron no verificados, sin fallas clasificadas. Los seis incluyen Claude y
mantienen pendiente la comprobación del alcance nativo de la regla Git; la
fuente disponible para consulta explícita no comprueba su activación. Estas
rondas son estructurales y no demuestran ejecución de cada skill o perfil.

- [-] Ampliar las pruebas en proyectos vacíos y existentes, incluyendo archivos
  de agentes propios, staged, colisiones, selección de clientes y operaciones
  repetidas. Generar proyectos y resultados fuera de Git o en destino
  comprobadamente ignorado; mantener el código de las pruebas versionado. En una
  prueba parcial de `preparar-dev`, Claude leyó el proyecto sintético sin
  editárlo; una repetición reconoció el `.gitignore` y una variable opcional. La
  prueba automatizada fue ejecutada por el controlador, no por el agente; setup,
  servicios y uso en otros proyectos o clientes continúan sin comprobación. La
  sesión no comprobó el ignore efectivo ni la ausencia del archivo `.env`. En
  consultas aisladas de `gerenciar-roadmap`, Claude reconoció dependencias y
  tareas; en la repetición, distinguió tarea pendiente de código no verificado.
  La respuesta todavía tuvo una afirmación ambigua sobre evidencias no leídas.
  En otra fixture, actualizó solamente la línea solicitada de un roadmap staged,
  preservando el índice; informó que no ejecutó la sincronización requerida. En
  consulta de consulta `atualizar-documentacao`, identificó órdenes divergentes
  sin
  executálos. Después de ajustar la skill, no presumió un script obligatorio,
  pero
  presentó como opcional la revisión requerida para una entrega con cambios.
- [ ] Repetir las pruebas en proyectos públicos reales, con revisiones fijas y
      el
  paquete candidato. La orden
  `test:oss` es separado de `npm test`; registrar proyectos, versiones,
  resultados
  y bloqueos sin incluir clones o informes en Git.
- [ ] Conferir el inventario de los catálogos contra las fuentes reales antes de
      medir
  cobertura; reconstruir índices en copias de prueba, preservando el checkout.
- [ ] Mantener una matriz por proyecto, cliente y skill o perfil aplicable, con
  versión, recurso cargado, resultado y evidencia. Distinguir estructura,
  descubrimiento y ejecución real; registrar bloqueos y casos no aplicables.
  Combinaciones de selección no reemplazan pruebas de ejecución en cada cliente.
- [ ] Mantener la evidencia de la instalación `0.0.21` en proyecto consumidor
  separadas de los cambios futuros del kit; antes de la nueva aplicación,
  conferir
  nuevamente archivos existentes, índice y `.gitignore` del proyecto. Localizar
  y
  El informe de esta instalación no podrá consultarse sin exponer datos
  privados.
  En consulta con escritura bloqueada en el router, el `doctor` público `0.0.21`
  Regreso `issues: []`; la candidata `0.0.30` apuntó 52 diferencias, ocho
  conflictos Claude y una exclusión local legada. Los diagnósticos usan
  contratos
  diferentes: no equivalen a una falla comprobada de la versión instalada.
  Índice,
  `.gitignore` e `exclude` mantuvieron los hashes observados antes de la
  consulta.

Na [CI del commit da tag
`v0.0.21`](https://github.com/pathbit/AgentDevKit/actions/runs/43498629228), los
tres jobs Windows examinados registraron 106 aprobaciones y 16 pruebas
ignoradas, incluyendo enlaces simbólicos y permisos POSIX. A
[release](https://github.com/pathbit/AgentDevKit/actions/runs/43499951587)
asoció el artefacto al mismo commit; el hash del tarball en él contenido
coincide con el tarball consultado en el npm. Esta prueba no cubre las pruebas
ignoradas, todas las skills o el estado local posterior. La VM Windows del host
permanece desactivada y su configuración de red y compartir no fue alterada.

En la verificación local del consumidor, los archivos administrados y los
bloques registrados de la instalación `0.0.21` coincidieron con sus hashes, y el
diagnóstico pasó sin alterar los archivos Git monitorizados. En 40 proyectos
sintéticos, sin embargo, el `init` la misma versión cambió `.git/info/exclude`
En todos los casos: ese comportamiento histórico contradice la decisión actual y
impide declarar la versión compatible con ella. Una fixture de worktree confirmó
que las exclusiones también afectan al árbol principal. En el consumidor, una
comparación de antes y después de la actualización registró el exclude
inalterado; el origen anterior del bloque existente no fue probado y se ha
conservado. En 1.000 escenarios sintéticos, las cinco etapas tuvieron retorno
operacional de éxito. Todos continúan falhos por la alteración del exclude; no
hubo otra desviación en los snapshots monitoreados. El mapeo de parte de los
recursos permaneció no verificado. Las pruebas de las cinco etapas ocurrieron en
macOS: 600 casos con Node 24 y 400 con Node 26; ellas no comprueban Windows ni
Linux. En comparación, un paquete local candidato `0.0.30` Pasó las cinco etapas
y la
cobertura estructural en 40 proyectos sintéticos en macOS y otros 40 en
contenedores Linux. Estos lotes no comprueban metadatos nativos, recuperación
concurrente, ejecución de agentes o migración a partir de otra versión
administrada; la candidata aún no se ha publicado.

Otra ronda local con 40 proyectos sintéticos y una copia empaquetada de la
candidata `0.0.30` tuvo 34 escenarios aprobados y seis no verificados. Los seis
incluían Claude y no comprueban la equivalencia de alcance de la regla Git
nativa. La ronda verificó instalación y preservación observadas, sin ejecutar
los flujos de los agentes; el paquete probado antecede ajustes posteriores en
las skills. Una matriz ampliada en macOS ejecutó las cinco etapas en 1.000
proyectos sintéticos: 792 pasaron y 208 quedaron no verificados por el mismo
límite de alcance Claude. El resultado general quedó `not-verified`; `sync
--check` no aplicó cambios. La copia probada previa ajustes posteriores en el
checkout. Una fixture en macOS inició la CLI Con Node 18.20.8, que delega la
ejecución a Node 24 o superior; la versión efectiva del proceso delegado no fue
registrada. Después de preparar una skill propia en el índice, `sync` generó su
apuntamiento y preservó los hashes observados; el `update` la misma versión
informó `changed: false`. Eso no prueba migración, ejecución nativa u otros
sistemas. Una prueba versionado ahora prepara el Node 24 en un paquete temporal
para
ejercitar la entrada por Node 18 sin depender de la caché del checkout. Ha
pasado en macOS y Linux con red bloqueada en el contenedor. La matriz CI propone
ejecutarlo en los tres sistemas; Windows todavía requiere ejecución real.

Una matriz verificó 1.456 entradas estructurales en 28 proyectos sintéticos, con
el paquete publicado `0.0.21` y una candidata local `0.0.30`. En cada paquete,
observó 186 descubrimientos: skills de Gemini y Copilot y perfiles de OpenCode,
en proyectos nuevos y existentes; las otras 1.270 No se ejecutaron. Estas
matrices no ejecutaron los flujos de las skills o perfiles. La candidata todavía
necesita revisión y de pruebas completas, inclusive de la recuperación
concurrente. En el router, una auditoría solamente de lectura confirió 41
skills, 11 perfiles, 18 comandos y ocho reglas en las 14 raíces seleccionadas:
1.092 Señales reconocidos resuelven sus fuentes. La conferencia de órdenes y
reglas se limita a los archivos registrados en el estado. Esto no prueba
descubrimiento, ejecución o alcance activo en los clientes. En pruebas separadas
con inferencia en el Copilot, las 41 skills de `0.0.21` Fueron invocadas y sus
orígenes leídas en un proyecto nuevo y en un existente. Marcadores sintéticos y
eventos confirmaron cada lectura; los flujos completos de las skills no fueron
ejecutados. Cada lote consumió una solicitud premium. Un inventario encontró al
menos un escenario nominal para cada una de las 41
skills. Hay pruebas parciales, rechazos y fallas; eso no comprueba todos los
flujos ni todos los clientes o proyectos. Una prueba exercitó `git-diff`,
distinguiendo cambios staged y unstaged. Skills alteradas después de la
publicación de la versión `0.0.21` exigen validación funcional propia. En
sesiones de `git-worktree`, una respuesta interpretó `AM` incorrectamente y
otra, después del ajuste de la skill, distinguió las alteraciones preparadas y
locales. Las dos tuvieron otras afirmaciones no comprobadas; el índice observado
fue preservado. Una prueba posterior exercitou `criar-ux-ui`: delante de PRD En
borrador, Claude identificó la aprobación pendiente y no creó el documento. Las
lagunas coexistían y no fueron probadas separadamente; Git fue creado después de
la `init`. En otra fixture con Git preexistente, dos sesiones atribuyeron al
documento UX marcadores que estaban en la plantilla, pero no en el documento. La
skill fue ajustada; la repetición todavía mostró la imprecisión, que permanece
pendiente de corrección. Otra prueba exercitou `git-fetch` entre repositorios
sintéticos locales: la refracción remota avanzó y un blob nuevo se transfirió
sin integrar commits ni alterar
el índice y el archivo humano. En otra fixture, `git-log` ejecutó una consulta
Git real e identificó dos commits sintéticos, con índice, refs y árbol
observados preservados; `validar-adversarial` creó una prueba temporal que
expuso una falla de frontera, confirmada por ejecución independiente. El
pipeline usado por el agente en aquella sesión no comprobaba el código de salida
de la prueba. La skill local ahora orienta preservar ese código; en otra
fixture, el Claude ejecutó la prueba directamente y relató la salida 1 con una
revisión intermedia de la skill. La prueba usó sandbox y skill sobreposta el
paquete local; no comprueba pipeline, comportamiento determinístico o versión
publicada. En otra sesión con la skill actual, la prueba pasó y el Claude
informó que la herramienta no expuso el código numérico. La fixture también usó
sandbox; la orientación sobre pipeline permanece sin prueba de ejecución. Tres
sesiones individuales con el Claude y fuentes actuales verificaron respuestas
limitadas: `avaliar-performance` reconoció falta de mediciones,
`avaliar-arquitetura` apuntó decisiones ausentes y `revisar-codigo` identificó
un defecto sintético confirmado por ejecución independiente. El agente solo leyó
archivos; las sesiones no comprueban benchmarks o flujos completos. En otra
consulta de rendimiento, una propuesta de orientación sobre coste de ruta no
eliminó una respuesta contradictoria al repetir el mismo ejemplo y prompt; no
fue integrada y no hubo medición. En otra revisión sintética solamente por
lectura, Claude invocó `revisar-codigo` e identificó la fórmula incorrecta;
extrapoló la cobertura de suíte a partir de un único archivo. La sesión no
ejecutó pruebas ni llamó `validar-adversarial`. En una prueba
`verificar-trabalho`, el cliente reconoció dos criterios sin evidencia y no
concluyó la entrega, pero aprobó un criterio general a partir de dos ejemplos.
Sólo leyó la salida de prueba ejecutado por el controlador. La skill fue
esclarecida; en la repetición, el cliente todavía aprobó el criterio,
interpretandolo como los dos ejemplos. La amplitud puede ser ambigua, y la
prueba no demuestra el comportamiento general de la skill. En
`implementar-backend`, Claude identificó una spec en borrador y paró, pero
sugirió el plan antes de conferir la configuración y el orden de los
prerrequisitos.
La skill fue aclarada; en la repetición, sugirió aprobar la spec antes del plan,
pero no consultó `implementar-spec`, `proximos-passos` o el estado de
configuración. Las pruebas fueron solamente de lectura y prompt ya impedía la
implementación. En `implementar-frontend`, Claude leyó la spec y paró ante
borradores, pero sugirió aprobaciones antes de verificar todas las fases y
atribuyó al roadmap una aprobación no exigida por la skill. Después de la
aclaración de la skill, leyó también `proximos-passos` e intentó leer el estado
ausente, pero también sugirió UX antes de resolver la configuración. Las
sesiones no ejecutaron pruebas o navegador. En otra consulta de performance, el
agente no inventó mediciones, pero generalizó una hipótesis sobre entradas que
un control sintético contradise. La skill fue ajustada, pero la generalización
persistió en la repetición. La prueba no establece un fallo de requisito de
tipos. En otra prueba de tipo. `avaliar-arquitetura`, Claude extrapoló a partir
de un módulo y presentó garantías sin todas las condiciones. La skill fue
aclarada, pero repeticiones todavía tuvieron afirmaciones además de los archivos
leídos; el comportamiento
permanece pendiente de corrección y nueva validación. En otra fixture, el
Copilot  cargó `criar-spec` de la candidata local, pidió los prerrequisitos
ausentes y no creó una spec. El shell fue negado y el inventario automatizado no
fue ejecutado; snapshots de contenido no verifican metadados. Otros escenarios
crearon una branch y hicieron push a un remoto bare local, preservando el índice
y las alteraciones humanas sintéticas. El push no testó divergencia o
proveedores externos. En el merge, una fixture con alteraciones superpuestas fue
preservada por rechazo; otra, limpia y sin conflictos, produjo un commit con los
dos padres esperados. En otra fixture, `criar-agente` generó un apuntamiento
después del ajuste manual del manifiesto, pero el sync cambió el exclude; la
invocación del perfil no fue comprobada. `criar-skill` generó fuente y
apuntamiento, pero también alteró el exclude; el `--check` pasó y no detectó esa
desviación. La nueva skill no fue ejecutada. En la candidata local, otra prueba
preservó Git observado y sincronió la skill; el check pasó con avisos de
visibilidad. Claude todavía relató incorrectamente la ausencia de entradas
existentes en los catálogos y alegó
descubrimiento sin probarla. La nueva skill no fue invocada. `criar-comando`
También cambió el exclude y produjo restricciones imprecisas de argumentos. En
repetición con orientación local, no repitió esas restricciones y ejecutó
`--plan`, pero sync continuó cambiando el exclude de la versión publicada.
`criar-regra` generó apuntamiento en el Claude sin preservar el alcance
condicional; la sesión expiró. Una prueba nativa confirmó carga inicial de
reglas manuales y con glob también en la candidata local. La corrección
permanece pendiente. En otra fixture, un subagente leyó la skill explícitamente
y configuró un glob con sidecar Claude: los apuntamientos generados para Claude
y Copilot mantuvieron el alcance informado. La prueba confirió archivos, sin
ejecutar los clientes o comprobar su activación efectiva; no sustituye la sesión
que expiró. En nuevas fixtures con la candidata local, `criar-comando` generó y
sincronió el apuntamiento; el comando no fue invocado, y los intentos de
ejecutar su script dependiente fueron bloqueados. `criar-regra` generó la
fuente, el sidecar Claude y el apuntamento Copilot; el controlador sincronió el
apuntamento Claude después.
El Git observado se ha conservado en las sesiones. En una prueba posterior,
Claude encargó la regla para un archivo correspondiente al glob y no la cargó
para un archivo fuera de él; eso no comprueba obediencia o activación en el
Copilot. No Copilot CLI, una prueba con los mismos caminos registró
descubrimiento contextual solo dentro del glob; la lectura y aplicación de la
fuente permanecieron no verificadas. En otra sesión, el cliente leyó la fuente
en el caso correspondiente y usó una instrucción sintética; en el control fuera
del glob, no la leyó. Eso no garantiza el comportamiento en otras sesiones o
versiones. En el router, `.claude/rules/git/RULE.md` también declara
`model_decision` sin `paths`; esta inspección no comprueba cómo cada sesión del
proyecto usó la regla. `executar-script` informó correctamente un `--check`
falho, pero no hubo bootstrap observado; el diagnóstico consultó al Docker local
y la respuesta confundió al mínimo de Node con la versión del npm. Las skills
actuales ahora distinguen el mínimo del Node de la verificación del npm. Una
evaluación independiente solamente de lectura medió Node y npm separadamente e
identificó los límites de la consulta; ella no ejecutó bootstrap o script.
En otra fixture Linux aislada, un subagente leyó la skill explícitamente: el
plan no ejecutó el script y el bootstrap realizó diagnóstico y ejecución,
preservando seis argumentos y los archivos Git observados. La red estaba
bloqueada. Eso no prueba descubrimiento nativo de la skill, obediencia de un
modelo offline, otras plataformas o alteraciones transitorias revertidas. En
fixture separada, un subagente aplicó `verificar-trabalho`: distinguió un
aceptado aprobado, un falho y un no verificable, preservando los archivos Git
observados. La revisión fue preparada, pero su check paró primero en una
decisión de documentación pendiente; no llegó a evaluar los aceptados. La
lectura de la skill fue explícita y no demuestra descubrimiento nativo o
ejecución de modelo. Las pruebas de roadmap y preparación del ambiente quedaron
parciales; el check offline de herramienta ausente no ejecutó bootstrap ni
verificó el npm. La invocación directa de sync repitió la alteración indebida de
exclude mismo con `--check` verde. En la candidata local, la orientación de
`sincronizar-agentes` Se corrigió: sync conserva ignores existentes y no crea
ignores en los clientes. En una fixture
Git con contenido staged, índice, exclude y ignores monitorizados permanecieron
iguales después `init`, `update`, `sync --check` e `sync --force`; la prueba no
detecta alteraciones transitorias ni verifica ACLs, atributos extendidos o
ediciones competidores. En otra fixture Linux con Git y contenido staged, un
subagente leyó la skill explícitamente y ejecutó un plan, sync y check. Un
recurso libre recibió el apuntamiento; un archivo humano vinculado fue
complementado con el bloque esperado, manteniendo su texto original. Los bytes
del archivo cambiaron. El informe resume la integridad, pero no enumera los
archivos Git conferidos; la preservación del índice en esa sesión no fue
auditada independientemente. Un test separado cubre el índice en fixture
semejante. La prueba no ejecutó descubrimiento nativo, modelo, otros sistemas o
verificación de ACLs y atributos extendidos. Una corrección sintética de
autorización pasó en nueve pruebas independientes, pero la respuesta del Claude
hizo una afirmación incorrecta sobre las pruebas anteriores y no ejecutó escáner
o revisión de la entrega. El modelado de amenazas identificó el acceso indebido,
pero extrapoló evidencias y dejó partes del flujo pendiente.
En una prueba funcional con escritura permitida, el perfil `implementador` y la
skill de backend se negaron a implementar sin spec aprobada; la fixture y su
índice permanecieron intactos. Eso cubre apenas ese escenario. El intento
equivalente en Claude regresó 401 antes de la inferencia; en nuevo intento, el
Claude invocó `implementar-spec`, propuso un plan y pidió aprobación sin
implementar. Archivos, índice y referencias Git permanecieron iguales durante la
sesión. Git de fixture fue creado después de la instalación, y los resultados
completos de las herramientas no fueron preservados; la prueba no cobre Git
preexistente en el `init`. En una fixture sin estado de configuración, Claude
invocó `criar-prd` y orientó concluir la configuración antes del PRD. La sesión
sólo permitía lectura; ella no prueba el comportamiento con escritura ni que la
ausencia de estado signifique que la configuración nunca ocurrió. Git fue creado
después del `init`. En repetición con una candidata local de skill, Claude
reconoció esta distinción, pero leyó solo parte de la configuración y volvió a
preguntar qué clientes usar, a pesar de la selección salva. Después de otra
orientación sobre lecturas
truncadas, una nueva sesión leyó el resto y reconoció el cliente y el idioma;
afirmó, sin inventario comprobado, que no había documentos de producto. Con
orientación adicional en la candidata, otra sesión informó que todavía no había
verificado esos documentos y reutilizó las opciones salvas. En la skill
ajustada, consultas con contenido suministrado en el prompt encaminaron la
configuración sin evidencia y preservaron UX no aplicable ya justificada. La
configuración técnica pendiente no bloqueó el producto; no hubo escritura ni
descubrimiento nativo en esas consultas. En sesión posterior con invocación
explícita de la herramienta Skill, Claude leyó la fuente y encaminó la
configuración. La petición también solicitaba preguntas, que fueron listadas
como futuras; por lo tanto, la sesión no prueba su suspensión en una solicitud
sin esta solicitud. Los snapshots de la sesión no mostraron escrita. Con
petición neutral posterior, Claude encaminó la configuración sin listar
preguntas concretas, aunque haya anticipado categorías de descubrimiento.
Sesiones aisladas no demuestran consistencia ni ejecución completa de la skill.
En fixture Linux separada, la skill fue leída y aplicada manualmente para crear
un PRD ficticio en borrador, con respuestas ausentes pendientes y Git observado
preservado. No hubo descubrimiento nativo, modelo o secuencia interactiva de
preguntas antes de la escritura; la preparación también fue sintética. En otra
fixture, Claude invocó `criar-spec`, hizo preguntas y orientó pasar por PRD y
diseño sin escribir archivos. El índice y las referencias permanecieron iguales
durante la sesión, pero Git fue creado después del `init`. Él dijo que `docs/`
No existía, aunque el directorio estaba vacío; los resultados completos de las
herramientas no fueron preservados. Una prueba separada llamó
`verificar-trabalho` en Claude: la prueba real pasó en un aceptado y falló en
otro, y el cliente dejó un tercero no verificado. Los archivos y el índice
permanecieron iguales; Git fue creado después del `init`. En una API sintética,
`revisar-autorizacao` identificó lectura entre cuentas; prueba HTTP
independiente confirmó el acceso indebido. La prueba cubre solo GET, y Git
también fue creado después del `init`. En otra fixture gravable con PRD en
borrador y UX/UI pendiente, Claude usó `criar-design-doc`, apuntó las
dependencias y no creó el diseño. Los bloqueos
coexistían y no fueron probados separadamente; el Git fue creado después del
`init`. En una fixture Linux sin red y con Git preexistente, la misma skill fue
aplicada manualmente para complementar un diseño ficticio en borrador,
preservando el contenido anterior y el Git observado. Las aprobaciones eran
datos de la fixture; no hubo descubrimiento nativo, preguntas interactivas o
consulta referencias oficiales. En una fixture Git sintética, `git-status` Se
aplicó manualmente: la consulta identificó cambios staged, no staged, archivo no
rastreado y upstream local. El índice observado se mantuvo igual; no hubo
descubrimiento nativo ni red. Otra aplicación manual de instrucciones `git-diff`
distinguió cambios staged y no staged usando una copia temporal del índice. El
índice original observado permaneció igual; la prueba no cubre worktrees
múltiples ni todos los metadados Git. En otra fixture, Claude invocó
`git-merge`, leyó un informe Git preparado por el controlador y recomendó no
integrar sin revisión y verificaciones. La sesión preservó los archivos humanos
y Git observados; no ejecutó el gate ni merge. Em `git-pull`, una sesión trató
como inofensivo un aviso de ignore global
inaccesible. La orientación fue ampliada; otra sesión reconoció la limitación al
interpretar consultas proporcionadas por el controlador, sin ejecutar pull o
fetch. También sugirió resolver alteraciones locales antes de cualquier fetch,
requisito que no fue demostrado. En consultas asistidas de `git-commit`, Claude
distinguió staged y unstaged; después de ajustes en la skill, reconoció la
opción de mantener ambos. Persistiram afirmaciones y sugerencias sin prueba; el
cliente no ejecutó órdenes o commit, y el controlador proporcionó consultas Git.
En una consulta de `git-push`, Claude leyó la skill y la regla Git cuando
solicitó explícitamente; no ejecutó push. La sesión hizo una afirmación sin
prueba sobre la branch principal y no comprueba activación automática de la
regla. En otra fixture, `git-branch` creó una branch a partir de `develop` sin
cambiar la branch actual; índice y alteraciones humanas observadas fueron
preservados. La prueba fue manual y no cobre intercambio de branch ni
descubrimiento nativo. En una fixture con Git preexistente, Claude leyó
directamente `configurar-projeto` e identificó la fase y la secuencia de
trabajo. Ninguna llamada explícita a
La herramienta de skill fue registrada y la sesión sólo permitía lectura. El
cliente sugirió un comando inexistente. Después de la orientación explícita en
la skill local, otra sesión indicó el comando Node correcto; ejecutó e informó
una espera de la fixture, sin pasar en el `check`. O `init` la versión publicada
preservó índice, `.gitignore` y configuración Git, pero añadió un bloque al
exclude. En otra fixture, el revisor de Copilot apuntó un error numérico
confirmado por test ejecutado por el controlador. La sesión preservó el
proyecto; Git fue iniciado después del `init`, entonces esa prueba no cubre Git
preexistente. En fixture con Git preexistente, Claude delegó al revisor; la
respuesta final identificó otro error numérico. El controlador confirmó el fallo
en prueba después de la sesión, que preservó el Git observado. El texto del
subagente no fue capturado. En una tercera fixture, el auditor de seguridad
identificó acceso entre cuentas confirmado por prueba del controlador. La sesión
preservó el proyecto, pero no ejecutó escáneres; Git también fue iniciado
después de la sesión `init`. En otra fixture, el ingeniero de QA ejecutó una
prueba e identificó un fallo
de límite. El proyecto fue preservado durante la sesión; Git fue iniciado
después del `init`. Cada piloto cubre sólo su escenario sintético. En una prueba
de `planejar-qa` con Git preexistente, Claude leyó la spec y las pruebas; el
controlador ejecutó dos ejemplos y los demás aceptados quedaron sin
verificación. Después de una clasificación amplia demasiado, la skill fue
ajustada; en una nueva sesión, el agente separó los ejemplos aprobados del
criterio general no verificado. La sesión no ejecutó órdenes ni alteró archivos;
la cobertura permanece parcial. En una fixture con spec aprobada, el
especialista de backend aplicó una corrección; la repetición independiente de
las pruebas pasó después de la alteración. Git fue iniciado después de la
modificación. `init`, y los logs resumidos no preservan la salida de la prueba
ejecutada por el agente. En una página sintética, el experto de frontend
corrigió el estado accesible de un botón. El controlador verificó la interacción
en Chromium y en viewport móvil emulado; el cliente no ejecutó el navegador y
Git fue creado después de init. En otra fixture, el analista de rendimiento
ejecutó una medición de conteo de operaciones confirmada por el controlador.
Ella no mide tiempo o desempeño en el mismo.
producción; Git también fue iniciado después de la `init`. En una fixture de
aceptados, el validador ejecutó pruebas y distinguió un criterio aprobado, un
fajo y una integración no disponible no verificada. La revisión independiente
repitió las pruebas; el Git fue iniciado después de la `init`. En una fila
sintética, el arquitecto apuntó la falta de persistencia entre procesos. El
cliente no ejecutó pruebas; el controlador y la revisión repitieron la prueba,
que no demuestra recuperación después de caída o durabilidad. En otra fixture,
el documentador actualizó apenas el archivo autorizado, preservando texto
humano, y ejecutó tres pruebas. El controlador reprodujo el ejemplo
separadamente; en el `init` anterior, Git preexistente tuvo su exclude ampliado.
Los eventos resumidos no sustituyen el log bruto de la sesión. El planificador
levantó dudas de una spec en borrador, pero no preguntó sobre permisos y
retención. La candidata explicita esas verificaciones en el perfil; en una
repetición, preguntó los papeles y el almacenamiento, plazo y exclusión. Una
sesión no comprueba que el comportamiento será repetido en otras tareas. Después
de renovar la sesión del Claude Code, la misma prueba confirmó las 41
invocaciones
y lecturas en un proyecto existente y en otro nuevo. En el primero, un intento
adicional de lectura de un plan personal volvió a archivo inexistente; en el
segundo, directorios personales fueron bloqueados por el sistema y no hubo
intento externo. El costo informado por Claude fue de aproximadamente 0,33 y US$
0,38, respectivamente. Eso no comprueba los flujos completos de las skills. En
Claude Code, los 11 perfiles de la `0.0.21` También se iniciaron en paralelo en
un proyecto nuevo y en un existente. En cada sesión, los marcadores sintéticos
aprobaron la carga de los perfiles y la lectura de sus orígenes; los demás
archivos de la fixture permanecieron iguales. Claude informó costos de
aproximadamente US$ 0,28 y US$ 0,30, respectivamente. Eso no comprueba los
flujos completos de los agentes ni su ejecución en todos los proyectos. En otra
prueba con Copilot, los 11 perfiles de la `0.0.21` Fueron delegados en un
proyecto existente: nueve leeron sus orígenes y dos no pudieron ser verificados.
La solicitud explicaba la resolución de enlaces relativos; ningún flujo completo
de perfil fue comprobado. En repetición separada de los dos perfiles, aclarando
También la raíz del proyecto, ambos leeron sus orígenes. En proyecto nuevo, con
la raíz y la resolución de enlaces esclarecidas, los 11 perfiles leeron sus
orígenes. Algunos intentos de lectura fuera de la fixture fueron bloqueados;
ninguna fue concluida. En otra ronda sintética, con el camino visible en el link
y sin explicación de resolución, nueve perfiles fueron comprobados y dos otros
no fueron verificados. Los resultados no establecen que la alternativa de
apuntamiento sea mejor. En Linux, otra matriz de la candidata pasó en 40
proyectos sintéticos para las operaciones y verificaciones documentadas en los
[pruebas del repositorio][testes-kit]; esto no sustituye la prueba de
recuperación, que falló por separado. En una repetición posterior con el paquete
local y los cambios TOML, 34 de los 40 proyectos pasaron; seis selecciones con
Claude quedaron no verificadas en cuanto al alcance nativo de una regla. La
auditoría fue posterior a la ejecución; la matriz no ejecuta los flujos de las
skills ni comprueba ACLs, xattrs o Windows. Con el generador ajustado para
evaluar la cobertura de todas las etapas, otra matriz Linux tuvo los mismos 34
aprobados y seis no verificados. Las cinco
Las operaciones registraron estos recuentos por separado; el resultado global
continuó no verificado. Después de los ajustes de diagnóstico y protección
POSIX, un paquete local pasó en 34 de 40 proyectos Linux; seis continuaron no
verificados en cuanto al alcance Claude. La auditoría constató coherencia de los
registros, sin probar ejecución nativa ni todos los metadatos. El paquete fue
comparado al tarball después de la ejecución. Después de añadir la consulta
parcial de xattrs en macOS, otro paquete local tuvo 34 aprobados y seis no
verificados en 40 proyectos macOS. La auditoría de los logs fue consistente y el
paquete correspondió al tarball después de la matriz; ninguna de las dos pruebas
verifica alteraciones transitorias o ejecución nativa de las skills. El auditor
versionable confiere la coherencia de los informes y de los hashes de logs,
incluyendo las etapas y snapshots obligatorios. No autentica la ejecución, el
paquete o la preservación antes de la baseline; un informe coherente todavía
puede haber resultado `failed` o `not-verified`. Una repetición posterior de la
candidata `0.0.30` Pasó en 80 proyectos en Linux, con dos variaciones de
fixtures, sin probar la ejecución de las skills y perfiles. O
executor ahora permite dividir la matriz en lotes reproducibles; esta opción fue
probada en macOS y Linux y tuvo revisión independiente. Windows sigue pendiente.
Una tercera ronda, iniciada por esa opción, pasó en más 40 proyectos en Linux
con el mismo paquete local; ella tampoco ejecuta skills o perfiles. En macOS,
con Git y ignore XDG aislados, la candidata local `0.0.30` Ha pasado en las
pruebas de compatibilidad de los commits fijos de Express, Zod, Chi, Tailcat,
Requests, Go, Hibernate y Rust. Express y Chi fueron repetidos después de
reforzar la conferencia de las centinelas humanas y del origen de la regla
local. EF6 fue bloqueado en el diagnóstico por excepciones ambiguas en el ignore
existente; una fixture confirmó que la excepción `!*.[Cc]ache/` Puede exponer un
caché de cliente antes ignorado. Los archivos y Git conferidos en el clon fueron
preservados. La versión publicada `0.0.21` Alteración `.git/info/exclude` En los
clones de Express y Zod, fracasó en el criterio de preservación. Las pruebas OSS
No ejecutaron las aplicaciones ni todos los flujos de skills y agentes. Los
informes y clones se encuentran en `tmp/` ignorado; vea los límites y el
diagnóstico de archivos privados en las pruebas.
Una ejecución exploratoria posterior, interrumpida antes de completar la matriz,
utilizó el paquete público `0.0.30`: la prueba de Hibernate detectó alteración
de exclusiones locales y EF6 fue bloqueado por excepciones ambiguas en
`.gitignore`. Esos resultados no comprueban el comportamiento de los demás
proyectos ni de la candidata local de alcance Claude. En 17/11/2026, una
candidata local `0.0.30` Pasó los controles de instalación y preservación en
nueve proyectos: Hibernate, EF6, Rust, Go, Tailcat, Requests, Express, Zod y
Chi. La ronda usó macOS ARM64, Node 26.13 y el tarball SHA-256
`ca490c637ef2796268daff07f607ded7c65343d8f3038483f6335b948ac8e5f4`. Después
replique el oráculo textual actualizado a las salidas registradas de los otros
ocho proyectos y repeti el EF6 con diagnósticos esperados explícitos. No EF6,
`doctor` e `sync --check` requieren atención: 15 sondas de caché aparecen
visibles al Git, dos reglas existentes del `.gitignore` Son ambiguas y la prueba
incluye una centinela privada visible. Los snapshots verificaron archivos
originales, contenido humano, índice y exclusiones Git, admitiendo solamente
aumentos administrados comprobados. `passed` indica aprobación de los controles
observados
En esos proyectos y versiones, no salud del EF6. La prueba no ejecuta las
aplicaciones ni los clientes y skills nativos. El agregado en
`tmp/oss-compatibility/candidate-final-20261117/AGGREGATE.json` referencia a los
informes y las evidencias en `tmp/oss-compatibility/`, ignorado por Git. En
macOS ARM64, con Node 26, las cinco operaciones de la candidata local `0.0.30`
Regresaron a cero en 1.000 proyectos sintéticos: 500 nuevos y 500 existentes.
Fueron 792 casos aprobados, 208 no verificados en cuanto al alcance nativo de la
regla Claude y ninguna falla; el resultado general permaneció no verificado.
Después de la corrección del inspector, un nuevo paquete local pasó en más de 40
proyectos. Estas pruebas no ejecutan los clientes o los flujos de las skills y
no comprueban actualización de una versión administrada anterior diferente. Otro
paquete local local. `0.0.30` passou nas verificações da CLI en 200 proyectos
sintéticos adicionales, en las rondas 26 a 30. Precedió el ajuste posterior de
la skill de PRD y tampoco comprueba la ejecución nativa de skills o agentes. En
una matriz posterior con la candidata de alcance Claude, Linux ARM64 y Node 24,
fueron ejercitados 1.000 proyectos sintéticos, la mitad nuevos y la mitad
existentes. Las cinco operaciones volvieron éxito en todos; 792 proyectos
pasaron las verificaciones y 208 quedaron inconclusos en cuanto al alcance
nativo de la regla Git del Claude. Estos números son los registrados por las
pruebas, no una certificación completa: el controlador rechazó un lote de 200
proyectos que las pruebas clasificaron como aprobados, sin preservar el motivo
del rechazo. Además, el hash externo del árbol del paquete difirió en el último
lote; no está comprobado que todo el contenido de los cinco lotes fuera
idéntico. Las 208 ocurrencias inconclusivas coinciden con la selección Claude y
la omisión de la regla Git de alcance nativo no comprobado. La matriz no ejecuta
skills o clientes, no prueba recuperación concurrente ni prueba Windows; el
paquete antecede a la alteración posterior de la skill. `implementar-spec`. Una
repetición en ejecución separada pasó en los mismos 200 escenarios y fue
aceptada por el nuevo controlador. El árbol extraído posteriormente del tar
salvo coincidió con el hash de la repetición; la causa del rechazo anterior y la
diferencia entre los hashes históricos continúan sin explicación. Después de la
corrección local de referencias derivadas, dos ejecuciones en macOS con el
mismo paquete local ejercitaron 1.000 proyectos: 792 pasaron, 208 quedaron
inconclusos por el alcance Claude y ninguno fue clasificado como fallo. La
auditoría consideró los informes consistentes; ella no autentica los resultados.
La matriz no ejecutó clientes o aplicaciones y precedió el ajuste de los mismos.
`criar-prd`. Una ronda posterior con esa skill ajustada tuvo 34 proyectos
aprobados y seis inconclusos entre 40; la auditoría también consideró el informe
consistente.

En una fixture con preparación ausente y Claude ya seleccionado, la `0.0.21`
Encaminó la preparación antes del PRD, pero preguntó nuevamente a los clientes.
Después de ajustar la skill, una sesión de la candidata consultó a los clientes
y el idioma salvados sin repetir esas preguntas. La prueba cubre solamente esa
situación, no la configuración del proyecto o la creación completa del PRD. En
otra fixture, la `0.0.21` pidió aprobación de un plan sin aclarar una edición
staged conflitante. Con la skill ajustada, Claude preguntó cómo conservarla,
pero todavía propuso un plan sin leer los documentos requeridos. La verificación
completa de la planificación continúa pendiente. En la actualización de esta
fixture para la candidata, los archivos protegidos fueron preservados, pero
`doctor` e `sync --check` Señalaron la exclusión local legada de `0.0.21`. Una
recolección de contexto en evaluación reunió los documentos configurados en esa
fixture sin alterar Git; ella no comprueba aprobación ni lectura por el agente.
Una nueva sesión autenticada del Claude inició la skill y leyó la spec, pero
alcanzó el límite de costo antes de concluir. La prueba de la planificación
sigue pendiente.
En dos sesiones posteriores con la misma skill y restricción de órdenes Git,
ambas leeron los documentos y la prueba de la fixture; una ejecutó Node a pesar
de la restricción y la otra usó apenas Git. Ambas sesiones no comprueban
obediencia determinística ni preservación sin sandbox. En sesiones posteriores,
Claude leyó los documentos y el diff staged, identificó el conflicto y preguntó
antes del plan. Una respuesta sugirió dispensar la configuración; después del
ajuste de la skill, otra a trató como obligatoria, pero ofreció commit o stash a
pesar de la preservación del índice. La skill fue nuevamente ajustada; esas
pruebas no ejecutaron implementación o test ni comprueban el comportamiento de
otras sesiones. En el último ensayo con la fuente ajustada, el Claude mantuvo el
índice observado y reconoció la configuración obligatoria, pero trató
inferencias sobre uso del código y resultado de prueba no ejecutado como hechos.
La validación funcional continua parcial; ninguna alternativa sugerida fue
aplicada. En un paquete local posterior, una instalación offline en una fixture
Git con fixture Git con
Claude seleccionado conserva los archivos humanos y el estado Git observados;
`init` e `sync --check` Pasaron. La skill instalada y su apuntamiento fueron
conferidos por hash y camino. Esa prueba estructural no ejecutó la skill y no
verificó ACLs, atributos extendidos o cambios transitorios revertidas. El
inspector también pasó a rechazar continuaciones y retornos de coche aislados
que podrían transformar metadados ambiguos en aprobación indebida.

### 3. Evolución continua

- [ ] Revisar las specs y los criterios afectados por la política actual de Git,
  manteniendo el historial de las releases y sin declarar criterios antiguos
  aprobados
  por equivalencia. Registrar decisiones y dependencias antes de nuevos
  incrementos.
- [ ] Evoluir skills, perfiles y pruebas de arquitectura, backend, frontend, QA,
  seguridad, revisión y rendimiento conforme a las necesidades comprobadas. Usar
  Los subagentes disponibles y la revisión adversarial cuando el alcance
  permita.
- [ ] Perfeccionamiento del flujo de configuración, producto, UX, diseño,
      arquitectura y
  specs: reunir dudas al principio, respetar dependencias y validar criterios
  Antes de implementar, Templates deben apoyar decisiones sin inventar producto.
- [ ] Validar selección y sincronización de los clientes soportados en las
      interfaces
  disponibles, incluso Copilot y Antigravity. Fuentes compartidas permanecen
  en el hub; recursos y configuraciones preexistentes del usuario son
  preservados.
- [ ] Comprobar detección e instalación de Node.js cuando no está ausente,
      conforme a lo que se refiere a
  sistema, e instalación, actualización y diagnóstico de las herramientas por
  órdenes
  reproducibles. Orientar pruebas reales de navegador y escritorio cuando sean
  aplicables;
  versionar el código de las pruebas y mantener resultados y proyectos
  temporales fuera
  del Git.
- [ ] Mantener instalación, prerrequisitos, órdenes, solución de problemas y
  publicación coherentes con el comportamiento efectivo. [Issues][issues] e
  [contribuciones][contributing] pueden proponer mejoras; cada entrega exige
  ámbito y validación propios.
- [-] Continuar verificando CI en Linux, macOS y Windows y el flujo de tag,
  release y publicación en los dos registries con el mismo artefacto aprobado.
  El build local preserva una salida anterior divergente y la verificación
  prepara copia separada. Las suítes de release pasaron en macOS y Linux; `full`
  Fue simulado. Windows, Actions real y publicación del estado actual están
  pendientes.

[Wiki](../README.md) · [Producto](README.md) · [Specs][specs] · [Proceso de
release](../maintainers/maintenance.md)

[releases]: https://github.com/pathbit/AgentDevKit/releases
[issues]: https://github.com/pathbit/AgentDevKit/issues
[contributing]: ../CONTRIBUTING.md
[changelog]: ../CHANGELOG.md
[specs]: ../specs/README.md
[v1]: ../specs/v0.0.1/SPEC.md
[v2]: ../specs/v0.0.2/SPEC.md
[v3]: ../specs/v0.0.3/SPEC.md
[packages]: ../specs/github-packages/SPEC.md
[v4]: ../specs/v0.0.4/SPEC.md
[v5]: ../specs/v0.0.5/SPEC.md
[v6]: ../specs/v0.0.6/SPEC.md
[v7]: ../specs/v0.0.7/SPEC.md
[v8]: ../specs/v0.0.8/SPEC.md
[v9]: ../specs/v0.0.9/SPEC.md
[dual]: ../specs/dual-registry/SPEC.md
[v10]: ../specs/v0.0.10/SPEC.md
[security]: ../specs/security-ecosystem/SPEC.md
[additive]: ../specs/additive-integration/SPEC.md
[real]: ../specs/real-projects/SPEC.md
[project-ignore]: ../specs/project-ignore/SPEC.md
[development]: ../specs/development-ecosystem/SPEC.md
[ci]: ../specs/ci-resilience/SPEC.md
[state]: ../specs/state-directory/SPEC.md
[sync]: ../specs/safe-synchronization/SPEC.md
[client-ignore]: ../specs/client-ignore/SPEC.md
[tool]: ../specs/tool-release/SPEC.md
[tags]: ../specs/automatic-release-tags/SPEC.md
[discovery]: ../specs/discovery-preservation/SPEC.md
[targets]: ../specs/target-paths/SPEC.md
[order]: ../specs/preimplementation-order/SPEC.md

[testes-kit]: ../tests/README.md
[recovery]: ../specs/recuperacao-conservadora/SPEC.md
[journal]: ../specs/diario-disco/SPEC.md
[claude-scope]: ../specs/escopo-regras-claude/SPEC.md
[guided]: ../specs/experiencia-guiada/SPEC.md
[legacy-doc]: ../specs/documentacao-legado/SPEC.md

[reading-pt]: ../../product/roadmap.md
[reading-en]: ../../en/product/roadmap.md
[reading-es]: roadmap.md
