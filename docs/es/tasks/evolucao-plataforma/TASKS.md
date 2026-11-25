---
description: "Grupo de tareas para la evolución y entrega de AgentDevKit."
status: em andamento
language: es
---

# Evolución de la plataforma

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Este grupo reúne las solicitudes de evolución; véase la [lista
agrupada](GRUPOS.md) para prioridades y seguimiento. Marque cada elemento
completado solamente después de la implementación y validación; preserve
archivos y configuraciones existentes.

## Validación actual

- El primer grupo de pipeline completo en macOS pasó: 37 pruebas.
- El siguiente grupo encontró fallas estrictas ya pendientes en recuperación,
  copia de seguridad y metadatos. La ejecución se interrumpió después de
  identificarlas; las pruebas canceladas no son resultados de fallo del
  producto.
- El perfil completo fue reordenado para ejecutar una recuperación estricta
  primero, manteniendo las otras suítes obligatorias después de ella. La suíte
  estricta actual en macOS terminó con 21 aprobados, 17 fallas y tres ignorados;
  los grupos siguientes no fueron ejecutados. Los 32 tests de la lógica de la
  pipeline pasaron en macOS y Linux. La suíte de fallos de remoción pasó con 31
  pruebas en macOS y Linux después de la restauración dejar de borrar el archivo
  antes de preparar la copia anterior. El cambio reduce una pérdida en falla de
  recreación, pero no resuelve las carreras de reemplazo ni el resto del gate.
- El sync verifica nuevamente el contenido de la copia de seguridad después de
  ajustar timestamps y interrumpe la operación si detecta cambios en el
  contenido o horario de acceso. El escenario de edición en esa etapa pasó en
  macOS y Linux, así como una prueba que simula alteración de horario. Linux usa
  lectura sin actualización de acceso; la verificación puede rechazar archivos o
  sistemas que no la permitan. La verificación no es atómica y no resuelve el
  intercambio de ancestros o ediciones posteriores; Windows y otros filesystems
  permanecen no verificados. Una prueba confirmó que la negativa de la lectura
  sin actualización del acceso interrumpe el sync y preserva la copia de
  seguridad en revisión en Linux.
- Una revisión independiente apuntó posibles rechazos legítimos en volúmenes que
  actualizan el horario de acceso o niegan `O_NOATIME`. La relectura Linux ha
  abierto el descriptor antes de aplicar permisos restrictivos a la copia: en
  fixture con usuarios distintos, la copia de seguridad de archivo legible solo
  por el grupo se ha producido con el modo original antes de la protección
  posterior. El sync completo de ese escenario todavía no está soportado: ahora
  se rechaza antes de escribir para evitar reemplazar un archivo con otro
  propietario o sin lectura del propietario. Otro test reveló que la
  planificación puede cambiar un horario de acceso antiguo antes de la copia;
  esta preservación también sigue pendiente. No hay prueba de Windows.
- A CLI y el sync directo verifican propietario POSIX En la planificación y
  antes de aplicar. En una fixture Linux con usuarios distintos, ambos
  rechazaron la operación y preservaron el contenido y el índice; una prueba
  simulada también cubrió cambio después de la planificación en macOS y Linux.
  Eso no comprueba preservación de grupos, ACLs, cambios simultáneos o soporte
  en Windows.
- Una revisión independiente apuntó que el rollback de sync elimina un archivo
  antes de reproducirlo. Una prueba sintética confirmó, en macOS y Linux, que
  una falla en la recreación puede dejar el camino ausente. La regresión está en
  el grupo estricto; todavía falta corregir la recuperación sin sobrescribir
  otro contenido. Un intento de preparar la copia y renombrarla fue descartada:
  pruebas mostraron regresión en la preservación de archivos creados durante la
  restauración.
- El camino normal de `sync --force` Ahora tiene una prueba activa: la copia
  anterior del catálogo se conferida en macOS y Linux, con índice, reglas Git y
  archivo humano staged y unstaged preservados. No cubre ningún fallo ni
  competencia.
- En la instalación y en el sync, un intercambio del nombre temporal detectado
  antes de la limpieza ahora interrumpe la operación y preserva el sustituto. La
  prueba pasa en macOS y Linux. Otro test estricto reprodujo la pérdida cuando
  el cambio ocurre entre la verificación y la remoción: la protección continúa
  parcial y no atómica.
- En macOS, 25 pruebas de protección confirmaron los casos cubiertos de
  denegación delante de ACL o atributos extendidos. Un experimento aislado con
  `cp -p` preservó una ACL y un atributo sintéticos, tanto por el origen nominal
  como por un descriptor heredado; reescribir la primera copia mantuvo los
  metadatos. El experimento no ejecutó el kit ni probó seguridad contra
  competencia, metadatos arbitrarios, recuperación o portabilidad.
- Una prueba de referencia del directorio después de la renombración funcionó en
  Linux probado y regresó `ENOENT` En macOS probado. No fue integrada al
  producto; no prueba protección de los ancestros ni compatibilidad con otros
  ambientes.
- En el router, índice, `.gitignore`, configuración y exclusiones Git
  mantuvieron los hashes anteriores; la instalación candidata todavía presenta
  conflictos y no está lista para publicación como corrección de esos casos.
- La candidata pasó a tratar una barrera estructural en reglas Claude como
  conflicto en las actualizaciones, preservando el motivo del camino. `doctor`,
  `update` e `--force` con enlace no gestionado y Git staged. La instalación
  inicial mantiene el comportamiento aditivo; esto no resuelve la migración de
  los otros conflictos ni prueba seguridad contra competencia. Suíte Claude pasó
  en macOS (37 pruebas) y Linux (36, un ignorado). El diagnóstico de la
  candidata en el router todavía vuelve pendencias.
- Un directorio humano en el nombre de una regla Claude antes causaba error
  genérico en la planificación. La candidata ahora registra el directorio
  preservado y bloquea la actualización; `init` Sigue agregando el kit sin
  eliminar su contenido. Una fixture también verificó el caso de archivo humano
  en el lugar del ancestro. Las suítes Claude y de coexistencia pasaron en macOS
  (52 pruebas); en Linux, la suíte Claude pasó con 39 pruebas y un ignorado. Una
  ejecución anterior fue descartada por coincidir con la edición del código
  durante la prueba.

## Mapa de las solicitudes

Los mensajes fueron consolidados por asunto, incluso decisiones que reemplazaron
solicitudes anteriores. O [roadmap](../../product/roadmap.md) mantiene el
historial de las entregas; los elementos numerados abajo registran el curso de
esta revisión. Una funcionalidad documentada o publicada todavía precisa de las
pruebas indicadas. [inventario por recurso](VALIDACAO-RECURSOS.md) muestra las
pruebas individuales registradas y las que todavía faltan para la versión
`0.0.21`.

- **Seguridad de los proyectos:** integración aditiva, colisiones, migración,
  recuperación y competencia; preservar archivos, índice y configuración Git. O
  `.gitignore` De la raíz pertenece al proyecto. Ver ítems 1, 9 y 10.
- **Estructura y clientes:** Mantener `.pbai4devs` como origen; seleccionar
  clientes y generar sus apuntes, sin replicar herramientas, scripts o
  templates. Validar clientes y recursos nativos, inclusive Copilot y
  Antigravity. Itens 9 y 10.
- **Flujo de trabajo:** guiar configuración, producto, UX/design, arquitectura,
  roadmap, specs e implementación en este orden; reunir dudas antes del plan y
  conferir criterios de aceptación. No inventar contenido de producto. Ver
  evolución continua en el roadmap.
- **Especialistas y calidad:** evolucionar arquitectura, backend, frontend, QA,
  seguridad, revisión y performance; usar subagentes cuando disponibles y
  pruebas adversas proporcionales. Ver ítems 2, 6 y 9.
- **Herramientas y pruebas:** verificar la instalación automática de Node
  ausente e instalación, actualización y validación de las herramientas en una
  orden por sistema; estandarizar pruebas de navegador o escritorio cuando se
  puedan realizar. Versionar pruebas e ingresos; ignorar resultados, variaciones
  de caja `.playwright*` y clones o proyectos temporales. Ver evolución continua
  en el roadmap.
- **Distribución e CI:** validar paquete y metadatos, npm público y GitHub
  Packages, instaladores útiles, releases y etiquetas de la misma versión;
  probar CI en Linux, macOS y Windows. Publicar en los dos registries después de
  los gates y validar las instalaciones. Ver elementos 4 y 8.
- **Documentación y comunidad:** Mantener README, wiki, guías, ejemplos, issues
  y enlaces claros y actuales; documentar las órdenes y preservar la autoría
  humana de los commits. Validar Markdown con frontmatter adecuado al tipo y
  lint. Ver ítems 3, 5, 7 y 8.
- **Aplicación en el router:** validar la versión instalada y las órdenes sin
  alterar archivos humanos, índice o `.gitignore`; aplicar nuevas versiones
  solamente después de comprobar la preservación. Ver ítems 1 y 9.
- **Operación local:** investigar sesiones o loops no deseados de OpenCode y
  documentar la eliminación manual cuando se identifica; no crear agendas sin
  solicitud. Verificación pendiente.

## Andación y evidencia

1. [-] **Preservación y migración:** completar las pruebas y corregir la
   migración de directorios y los diagnósticos de errores, sin borrar los datos
   o cambiar el índice. Las verificaciones de bits POSIX especiales pasaron en
   macOS y Linux; la protección de atributos extendidos y el comportamiento
   delante de cambios competidores todavía están en validación. En macOS, una
   ACL de prueba no fue detectada por el verificador de atributos; en Linux, fue
   reproducida la pérdida de un atributo extendido sintético. No presumir
   preservación de esos metadados en la migración. Una opción de bloqueo está en
   evaluación e impide también migraciones legítimas mientras la verificación no
   sea confiable; en esa propuesta, pruebas existentes que exigen migración
   exitosa fallan. El intento del gate completo detectó pérdida de ACL en
   actualización en macOS y fallas de recuperación concurrente; una prueba
   independiente observó pérdida de atributos extendidos en Linux. El intento
   dejó después de 42 fallas; las pruebas o fixtures de 24 casos fueron
   ajustadas y verificados aisladamente. Falta corregir los defectos y ejecutar
   nuevamente el gate estricto completo. Una repetición con paquete local
   observó los tres flujos `update`, sync CLI
   y sync directo: en Linux, los tres perdieron un xattr sintético; en macOS,
   los
   tres perdieron una ACL benigna. macOS rechazó las mismas operaciones con
   xattr
   presente, preservandolo. Índice, configuración Git y archivos humanos
   comparados fueron preservados; no hay prueba para todos los metadados.
   Una prueba de regresión versionado reprodujo la pérdida en sync directo en
   Linux
   También con finales LF normales y archivo staged: confirmó el atributo antes
   y después de preparar el índice, pero no lo encontró después de la
   sincronización. O
   prueba falla hasta que sync preserve el atributo o recuse sin alterar el
   archivo; en macOS se ignora por ser específico de Linux. La ejecución
   usó paquete local con el mismo hash del script de sincronización del
   checkout;
   No comprueba la equivalencia de los demás archivos del paquete.
   Una consulta Linux experimental usa `getfattr` para listar nombres, sin
   obtener
   valores. En contêiner Debian identificó un xattr y una ACL POSIX de prueba;
   Sin la herramienta volvió estado desconocido. Ella todavía no bloquea ni
   protege operaciones: faltan cobertura de namespaces y permisos, ambientes
   Sin la herramienta, competencia e integración con todos los puntos de
   escritura.
   Protección parcial posterior: planificación y aplicación de la CLI y sync
   directo se niegan a sustituir archivos regulares con atributos que
   `/usr/bin/getfattr` Puede listar. La consulta directa y la CLI informan
   bloqueo. En Linux con `attr` instalado, fixtures confirmaron preservación
   los archivos con xattr; sin la herramienta o con atributos no listables,
   La protección no está comprobada y la sustitución todavía puede perder datos.
   Para no presentar esa laguna como verificada, CLI y sync directo ahora
   avisan cuando hay archivos existentes planificados sin inspección
   concluyente;
   El aviso también aparece en la aplicación, que todavía está permitido.
   Pruebas sin la
   herramienta confirmaron advertencia y preservación durante el check, pero no
   demuestran la seguridad de la escritura posterior.
   Com `getfattr` disponible, un control añadió el atributo después del plan;
   La aplicación lo detectó y rechazó el intercambio, preservando el archivo.
   Las pruebas
   También confirmaron que el diagnóstico no expone nombre o valor del atributo
   y
   que los avisos inconclusivos están disponibles en portugués, inglés y
   español.
   A CLI y sync directo vuelven a consultar atributos listables inmediatamente
   antes de reemplazar un archivo en Linux. Fixtures con `attr` confirmaram
   rechazo y preservación del valor añadido después de la verificación inicial.
   Todavía
   Hay una ventana entre esta consulta y el intercambio, y los casos sin
   herramienta o
   con atributos no listables siguen sin protección comprobada.
   La misma revalidación se ha añadido antes de eliminar archivos regulares.
   Dos fixtures Linux con `attr` Confirmaron rechazo y preservación del valor
   cuando se añadió el atributo después de la inspección inicial; los 27 tests
   de
   fallas de eliminación pasaron en macOS y Linux. La ventana concurrente y los
   Los casos de inspección inconclusiva siguen pendientes.
   La eliminación de referencias por sync dejó de ser recursiva: una fixture que
   Cambia el archivo por una carpeta con contenido humano en el momento de la
   eliminación
   Ahora preserva la carpeta y el índice. La suíte de fallos de remoción pasó
   con
   28 pruebas en macOS y Linux. Otros intercambios competidores no están
   cubiertos.
   En la restauración después de falla, sync dejó de eliminar carpetas
   recursivamente y
   Ha pasado a recrear archivos de forma exclusiva. Fixtures preservaron
   archivos
   y pasta humana creada durante el rollback en macOS y Linux, informando
   error y el camino para la revisión. La escritura y el permiso usan el
   descriptor
   abierto, con verificación de identidad; otra fixture ha conservado un archivo
   Su reemplazo y su modo, pasaron 31 pruebas de remoción y siete de
   recuperación
   En cada sistema, otras ventanas competidoras siguen abiertas.
   La documentación de
   [`listxattr(2)`](https://man7.org/linux/man-pages/man2/listxattr.2.html)
   informa que los nombres inaccesibles pueden ser omitidos. Por eso la consulta
   fue
   corregida: listado vacío también retorna desconocido, nunca ausencia
   comprobada. Una lista no vacía indica solamente presencia observada.
   En una fixture Linux, escrita en el mismo inode preservó xattr y ACL
   observados, así como los bytes del índice Git. Sin embargo, una interrupción
   simulada después de escribir parcial dejó contenido incompleto. El
   experimento es
   reproducible en `tests/linux-inplace-metadata-experiment.test.mjs`; no es
   usado por el producto y no comprueba recuperación, competencia o durabilidad.
   Una repetición dirigida de dos pruebas estrictos falló en ambos en macOS
   y en Linux: el intercambio de un ancestro de copia de seguridad creó un
   archivo fuera de la fixture,
   y una edición de copia de seguridad entre la verificación y el ajuste de
   timestamps no
   impidió el éxito. Estas fallas bloquean la validación segura de la operación.
   Una revisión estática adicional identificó que la limpieza después de
   publicación
   exclusiva puede eliminar un sustituto humano en el nombre temporal. Comparar
   inodes antes de eliminar no elimina la ventana concurrente; la corrección
   exige
   una frontera de propiedad y diagnóstico de residuos. Esta revisión no
   repitió la prueba estricta ni demuestra una solución implementada.
   Una variante experimental preserva caminos inciertos para revisión después
   fallo posterior a una publicación, en lugar de restaurarlos automáticamente.
   En cada uno de los sistemas
   macOS y Linux, pasó cuatro controles de falla sintética y dos de flujo
   normal. Puede dejar la operación parcialmente aplicada; no cubre la creación
   anterior de la copia de seguridad y no se ha demostrado contra los
   intercambios competidores. A
   La variante permanece aislada y requiere la definición del contrato de
   recuperación.
   Una corrección separada informa el temporal preservado cuando la limpieza
   falla
   con error congelado, manteniendo causa y código. Pruebas sintéticas cubren
   los
   flujos de instalación, sync y etapa; las suítes dirigidas pasaron con
   86 pruebas en macOS y 86 en Linux. La clasificación de pipeline pasó con
   32 pruebas en cada sistema. Mensajes y caminos de los errores todavía no
   tienen prueba
   General de sanitización. Esa corrección no resuelve la carrera ni fue
   validada
   Windows. Un paquete local contiene los dos archivos corregidos con bytes
   iguales a los del checkout; esta comparación no prueba la instalación del
   paquete.
   El ejecutor de infraestructura rechazó enlaces simbólicos estáticos en los
   orígenes
   y salidas y se han creado informes exclusivos por ejecución. La reproducción
   anterior sobrescreció un log fuera de la fixture por medio de un enlace; los
   nuevos
   Los controles pasaron en macOS y Linux, y un paquete local preservó el
   destino
   externo, informe anterior e índice observados. El cambio del camino fijo
   El informe y los límites para los intercambios competidores están
   documentados.
   En una ejecución Linux del paquete aislado, 12 suítes volvieron código cero y
   la sincronización falló en el caso de `autocrlf` staged. El código cero no
   demuestra que no hubo pruebas ignoradas. Un primer intento con checkout
   sólo de lectura tuvo fallas adicionales de ambiente; la repetición usó Git
   y no cargaba la herramienta local incompatible de la máquina.
   Una ejecución dirigida posterior en macOS también falló en este caso: después
   cambiar LF por CRLF, la referencia divergió del hash registrado y el sync
   rechazó
   la actualización como contenido propio. La comparación del índice reconoce
   CRLF,
   Pero eso no basta para comprobar la propiedad de la referencia. La corrección
   Entonces se aplicó a la copia de desarrollo: exige hash idéntico después
   normalización y atributos Git compatibles, sin ejecutar filtros. Los 30
   pruebas
   La preservación ha pasado en macOS y en contêiner Linux, incluyendo índice
   staged, edición humana, filtro y conversión desactivada. La suíte ampliada de
   Sincronización en macOS se repitió después de un ajuste adicional que limita
   esta
   equivalencia a la actualización de referencias activas: tuvo 358 aprobaciones
   y
   dos pruebas ignoradas. Después del ajuste, 31 pruebas de preservación pasaron
   en macOS, Linux y el paquete local extraído; la referencia obsoleta
   convertida se ha conservado. Todavía faltan el gate completo, Windows y la
   validación del paquete publicado o de una nueva versión.
   Un control posterior configuró un filtro Git sintético: la sincronización
   No lo ejecutó mientras lo ejecutó. `git add` De la propia fixture lo ejecutó.
   Ese
   El control pasó en macOS y en contêiner Linux. La consulta `check` e a
   aplicación también preservaron índice, estado y bytes delante de filtro,
   alteración humana o conversión desactivada en los mismos sistemas.
   **Ejecutación retirada:** la revisión posterior identificó que la
   actualización
   CRLF integrada no protegía atributos extendidos en Linux, una limitación ya
   observada en el experimento anterior. El sync volvió a rechazar esa
   actualización;
   la prueba positiva de `autocrlf` volvió a fallar en macOS. Un nuevo control
   Linux confirmó que la negativa preserva bytes, índice y un xattr sintético.
   Los resultados de éxito anteriores describen la variante retirada, no la
   implementación actual. Es necesario resolver la protección de metadatos antes
   de volver a permitir la actualización.
   Una variante posterior habilita la equivalencia CRLF Solo en macOS, para
   referencias activas cuyo hash normalizado y atributos Git sean compatibles.
   La limpieza de referencias obsoletas continúa exigiendo bytes exactos.
   Pruebas
   En macOS cubren índice staged, filtros, edición humana y rechazo delante de
   ACL o xattr; la protección Linux y la operación completa continúan
   pendientes.
   **Variante retirada:** un control posterior mostró que ella aceptaba CRLF
   incluso con `eol=lf`, que requiere LF en el checkout. Además, normalización
   para
   El índice no distingue una edición humana de una conversión de checkout.
   sync volvió a preservar bytes divergentes; la actualización automática del
   caso CRLF El equivalente continúa fallando y requiere solución sin pérdida de
   datos.
   El check directo ahora identifica `line-ending-diverged` Cuando solo se trata
   de una especie de arte,
   normalización CRLF corresponde al registro, sin autorizar la escritura.
   Pruebas
   En macOS y Linux cubren la edición humana, UTF-8 no válido y checkout LF;
   los casos conocidos de actualización CRLF y la pérdida de xattr fueron
   excluidos
   Sus ejecuciones ampliadas y siguen pendientes.
   Cuando la referencia CRLF ya coincide con la salida esperada después de
   normalizar
   finales de línea, CLI y sync directo pasan a conservarla sin duplicar el
   apuntamiento o adopción de sus bytes. La prueba cubre dos sincronizaciones y
   una
   cambio posterior de descripción en macOS y Linux; eso no resuelve la
   actualización del registro derivado divergente ni la protección de xattr
   Linux.
   Una revisión encontró que la fuente de esa referencia podría cambiar después
   del
   plano; la aplicación ahora revalida la referencia y su fuente en ese
   escenario.
   Tests en macOS y Linux confirmaron rechazo de cambios secuenciales después de
   la
   plano, con los bytes humanos y Git observados preservados. Eso no prueba
   protección contra todas las carreras durante la aplicación.
   También se ha producido una alteración sintética de la fuente durante la
   creación de la copia de seguridad.
   recusada en los dos sistemas; el archivo editado, el índice, el estado
   observado
   y la copia de seguridad señalada se mantuvieron disponibles para la revisión.
   La suíte principal de CLI en la candidata actual tuvo 29 aprobaciones en
   macOS y
   27 en Linux, con dos skips específicos de macOS.
   paquete incluyó licencia y README y no incluyó los cachés y resultados de
   prueba verificada; no prueba ausencia de todo dato privado o publicación.
   La suíte ampliada en macOS pasó con 362 pruebas y seis skips específicos de
   otras plataformas. Un fallo intermitente en el control positivo de filtro
   Fue corregida usando renormalización explícita; la repetición pasó tres
   veces.
   En la actualización sintética posterior de `0.0.21` publicada para la
   candidata
   local `0.0.30`, ocho de las nueve operaciones `update` Han vuelto éxito y la
   fixture Claude rechazó ocho conflictos. Todas las consultas `sync --check`
   Señalaron cobertura de ignore no verificada e ignore legado. El init
   antiguo alteró `info/exclude` en las nueve fixtures; los caminos humanos y
   Git
   Durante la actualización y la consulta posterior se observaron iguales.
   En la fixture Codex com CRLF staged, la versión actualizada mantuvo el
   contenido
   indexado como prefijo después de normalización y añadió un bloque; eso no
   demuestra que la nueva rama de equivalencia fue usada. La prueba no cobre
   Historia completa, todos los metadatos o activación nativa.
   En una copia de la fixture Codex, desactivar solo el marcador legado preservó
   las reglas y el check pasó con las advertencias de cobertura aún presentes;
   la
   consulta preservó los archivos Git observados. Una prueba aislado confirmó
   En macOS y Linux que estos avisos no bloquean, mientras que el marcador
   legado
   bloquea. Ninguna regla del proyecto real ha sido modificada.
   La prueba de xattr acepta una actualización que preserve el atributo o una
   rechazo sin alteración, sin exigir rechazo permanente. Después de esa
   revisión, la
   Suíte de preservación en macOS registró 30 aprobaciones, una falla de
   `autocrlf` y un skip específico de Linux; el mismo fallo ocurrió en Linux.
   El runner actual clasifica por el código de salida y puede llamar de éxito
   una
   Suíte con pruebas ignoradas. Un reporter experimental distinguió resultado
   parcial y archivo sin pruebas observables, pero la pipeline de release
   todavía
   No consume ese estado y podría aprobarlo. La política para skips esperados
   y TODO necesita ser integrada y validada antes de adoptar el prototipo.
   Dos pruebas pendientes ahora demuestran en macOS y Linux que el runner marca
   como `passed` tanto una suíte solo con skip como un archivo sin pruebas
   declarados. Node 24 también cuenta el archivo vacío como una prueba aprobada;
   Por lo tanto, contar pruebas y verificar código cero no resuelve la brecha.
   dos pruebas estaban marcados como TODO y fallaban en sus aserciones.
   Una implementación posterior clasifica como `partial` skips, TODOs y
   ausencia de pruebas declaradas, y el comando vuelve error para resultado
   parcial. Pasó 15 controles en macOS y Linux, incluyendo salida simulando
   evidencia y opción de filtro heredada. La política todavía trata cualquier
   skip
   como parcial, incluso los esperados por plataforma; faltan integración con
   la política de release, análisis de confiabilidad de los eventos y Windows.
   El informe ha estado registrando la identidad y el motivo de los skips
   observados,
   con el camino relativo al proyecto cuando está disponible. Los 16 controles
   del proyecto
   executor pasaron en macOS y en contêiner Linux; eso todavía no aprueba
   automáticamente ningún skip ni prueba la matriz de CI completa.
   Dos ejecuciones fuera del paquete local extraído en contenedores Linux
   tuvieron
   nueve suítes completas, tres parciales y un fallo de sincronización. Los
   skips identificados en las tres suítes parciales fueron CLI de skills no
   preparada, runner de desarrollo ausente del paquete y Compose ausente;
   la suíte falla también registró la prueba de alias 8.3 exclusivo de Windows.
   Esto caracteriza el paquete y el ambiente del contêiner, no el checkout del
   CI.
   Revisión independiente identificó dos defectos en el colector de esta
   ejecución:
   Node 24.13 no proporciona `entryFile` en eventos de prueba, y cierre
   anticipado con código cero podía parecer éxito. La candidata pasó a la
   exigir el resumen del archivo de entrada y se ha probado con ejecución
   normal,
   importada, vacía e interrumpida. Los 20 controles pasaron en macOS con Node
   24.13 y Linux con Node 24.22; la ejecución completa del paquete anterior
   esta enmienda y no la valida. Otros minors, Windows, identidad de skips
   y confiabilidad de eventos todavía requieren evaluación.
   Un grupo ignorado o pendiente también puede dejar los recuentos de Node sin
   skips o TODOs. La clasificación pasó a considerar los eventos de estos
   grupos; dos controles pasaron en macOS y Linux. La revisión apuntó todavía
   riesgo de ACL heredada para logs: en macOS el ejecutor ahora rechaza una ACL
   listada o no verificable en el directorio de salida antes de ejecutar o
   Guardando. La prueba con ACL heredada pasó; no comprueba ACLs ocultas,
   cambios competidores u otros sistemas. La suíte del ejecutor tuvo 23
   aprobaciones en macOS y 22 en Linux, con un skip específico de macOS.
   Otro intento de ejecutar el paquete coincidió con cambios en el checkout
   durante el empaquetado; sus resultados no validan una versión congelada.
   Una repetición posterior usó un paquete local cuyo SHA-256 permaneció
   `78bfd16d47e82a21c5bf65464e5697e36c21586026eadbbb20ed4a0a9a0d56cf`;
   executor, reporter y su prueba fueron comparados al checkout antes de
   ejecución. En Linux offline, ocho suítes pasaron, cuatro quedaron parciales
   y la sincronización falló en el caso de `autocrlf`. Después del empaquetado,
   una prueba adicional de ACL No verificable pasó en macOS. La suíte actual
   tuvo 24 aprobaciones en macOS y 22 en Linux, con dos skips de macOS. Una
   prueba independiente también observó que ACL de padre no herdable no bloqueó
   la fixture en macOS; no demuestra privacidad ante cambios simultáneos.
   Un control posterior simuló fallo de la consulta después de la suíte: el
   ejecutor
   Se negó a grabar el registro o el informe y preservó el índice en la fixture
   macOS.
   Esto no demuestra protección contra cambios después de la propia
   verificación. Con
   ese control, la suíte del ejecutor tuvo 25 aprobaciones en macOS y 22 en
   Linux, donde tres pruebas específicas de macOS fueron ignorados.
   Una prueba Linux aislada con `cp` y metadados sintéticos preservó ACL e
   xattrs en la copia examinada. Ella no ejecutó el kit ni comprobó copia de
   seguridad,
   recuperación o cambios competidores, y no permite integrar la técnica.
   En otro archivo, `cp --preserve=xattr` Volver a cero incluso sin
   preservar la ACL; con preservación de modo y ACL, volvió error después de ya
   crear el destino con contenido. Los controles usaron archivos sintéticos y
   no justifican tratar el código de salida como prueba de preservación o de
   ausencia de escritura.
   Otra fixture Linux observó una ACL estándar en archivo vacío creado antes
   de la escritura. El archivo fue creado por fixture, no por `cp`; por lo
   tanto,
   Esto no demuestra la secuencia interna de la utilidad ni acceso efectivo.
   El informe identifica la combinación específica de prueba, archivo y evento
   del alias Windows como esperada en Linux y macOS, pero mantiene el resultado
   parcial y no presume ejecución en Windows. La clave no prueba por sí solo la
   causa del skip. Los controles actuales del ejecutor registraron 27
   aprobaciones
   En macOS y 24 en Linux, con tres skips específicos de macOS.
   La clasificación también se ha negado a contajes incompatibles o sin
   aprobaciones. Con ese ajuste, los controles tuvieron 28 aprobaciones en macOS
   y
   25 en Linux, con tres skips específicos de macOS; no se trata del gate
   completo de publicación.
   En la repetición de Linux offline con el reporter experimental, de las 13
   suítes, nueve
   Se quedaron completas, tres parciales y una fracasó en el caso de `autocrlf`;
   a
   Suíte fallo también tuvo un skip. El resultado parcial identifica la laguna,
   Pero aún no informa en el informe la identidad de cada prueba ignorado.
   Una reproducción dirigida en las mismas condiciones encontró cuatro skips
   compatibles con los recuentos: CLI de skills no preparada, runner de
   desarrollo ausente en el paquete, Docker Compose ausente y prueba de
   Alias 8.3 específico de Windows. Como la ejecución completa no registró la
   identidad de los skips, la reproducción no comprueba cuáles ocurrieron en
   ella.
   El CI `full` usa checkout, no esta copia del paquete: la ausencia de runner
   de desarrollo en el tarball no comprueba su ausencia en el CI, y
   No se confirmó la disponibilidad de las herramientas en ese ambiente.
   Una política aislada rechazó evidencia ausente, TODO y skips no aprobados
   En cinco controles por sistema en macOS y Linux. La revisión apuntó que ella
   Aún no vincula resultados al proceso y a la matriz de CI y que la identidad
   propuesta puede colidir. No se ha integrado ni validado en Windows; no
   Se autoriza a publicar.
   Una prueba adicional conectó el runner experimental al perfil `full` en
   copia aislada: cuatro controles pasaron en cada uno de macOS y Linux,
   con las otras etapas simuladas y sin publicación. La exigencia de ejecución
   completa bloquearía releases normales porque la prueba Windows 8.3 es
   ignorado
   en Linux. El contrato del manifiesto y su consumidor también necesitan de
   cambio coordinado; no se ha integrado una regla que esconda el skip.
   Una variante posterior calificó el skip específico de Windows 8.3 Linux
   y registró resultado `partial` en manifiesto experimental. El publicador
   actual rechazó el manifiesto; otros grupos del perfil todavía no tienen
   evidencia
   estructurada de skips. Los controles pasaron 6/6 en Linux y 4 en macOS, con
   dos skips específicos de Linux; las demás etapas fueron simuladas. No
   Hubo build, Actions o publicación, y la variante no fue integrada.
   Otra copia también observó los grupos Node y la distribución: seis controles
   Los sintéticos pasaron en Linux y tres del observador en macOS.
   simulado; la publicación todavía rechaza manifiesto parcial, y la evidencia
   del
   manifiesto necesita revisión. El flujo completo de release no fue probado.
   Una variante posterior también registró recuentos en resultados aprobados
   y repitió builds locales con manifiestos sintéticos. Pasó 14 controles en el
   Linux y 11 en macOS, con tres skips; el publicador rechazó resultados
   parciales y legados sin cobertura. El nuevo contrato todavía requiere
   migración de
   consumidores, política de skips y validación en CI y Windows; no autentica
   El origen de la evidencia y no fue integrado.
   Un control offline distinguió consulta histórica de nueva publicación: el
   publicador propuesto rechazó manifiesto legado sin cobertura, mientras que el
   anterior lo aceptó. La propuesta mantiene la consulta como no verificada y
   requiere nueva evidencia para publicar; no cambia paquetes ya existentes.
   Una prueba aislada mostró que un mensaje arbitrario de fallo de limpieza
   Puede aparecer en la salida JSON de la etapa, inclusive como falla secundaria
   de
   sincronización. Una corrección localizada reemplazó el mensaje secundario en
   diagnóstico de la etapa, manteniendo código, camino y causa de la
   sincronización;
   los controles pasaron 11/11 en macOS y Linux. La eliminación final de la
   etapa
   cuando es falla primaria también recibió mensaje fijo, preservando código y
   causa API; el mensaje de la propia API Cambia a texto fijo. Las suítes
   Pasaron las cosas relacionadas 17/17 en macOS y Linux. Un paquete local
   posterior
   incluyó la fuente con bytes iguales y, después de la extracción y copia de la
   fixture, pasó
   los seis controles de la eliminación final en macOS; no comprueba
   publicación.
   En el rollback del instalador, los mensajes secundarios ya no se han incluido
   en el detalle agregado y en `cleanupFailures` la CLI. Controles de API, JSON
   e
   el texto pasó en macOS y Linux; la API preservó causa primaria y error
   La secundaria en el agregado, y los caminos observados permanecieron
   disponibles.
   La proyección JSON Utiliza el mismo texto para todas las fallas de limpieza y
   pierde
   detalles secundarios; errores primarios y caminos todavía pueden contener
   datos.
   En la repetición de las cinco suítes relacionadas, macOS tuvo 247
   aprobaciones y
   un skip; Linux, 246 aprobaciones y dos skips. No se realizaron pruebas
   Windows ni la pipeline completa en esta repetición.
   El agregado de rollback de sync también dejó de concatenar mensajes
   secundarias, manteniendo los objetos en API; los controles dirigidos pasaron
   En macOS y Linux y en paquete local extraído en macOS. Limpieza interna del
   sincronizador y otras salidas todavía requieren revisión. La falla secundaria
   al
   eliminar la etapa después de un error de sync o de callback de verificación
   de salida está disponible a API la propiedad no comercializable
   `cleanupError`,
   Sin reemplazar la causa primaria; otras ramas todavía no tienen ese campo.
   Las dos suítes de limpieza pasaron 23/23 en macOS y Linux; seis controles
   También pasaron en paquete local extraído en macOS, con prueba copiada
   después de la
   La propiedad es accesible explícitamente y no es un secreto.
   El mismo campo pasó a conservar la falla secundaria cuando el origen es
   callback de verificación de salida. Tres suítes relacionadas pasaron 45/45
   en macOS y Linux; después de reforzar la comparación de caminos, los dos
   controles
   del callback se volvieron a pasar en los dos sistemas y en paquete local
   extraído
   En macOS. Windows y errores secundarios congelados en esta rama no fueron
   probados.
   La planificación ahora registra la ocurrencia de fallas independientemente
   del
   valor lanzado, y usa `Object.is` para correlacionar el error de sync. En 55
   controles sintéticos por sistema, inclusive `undefined`, `null`, `false`,
   cero, string vacía y `NaN`, la falla fue reportada y el residuo observado fue
   preservado cuando la limpieza falló. Eso no comprueba la ocurrencia natural
   Estos valores ni el comportamiento en Windows.
   Una ejecución ampliada de seis archivos registró 329 aprobaciones y un skip
   En macOS, y 328 aprobaciones y dos skips en Linux. Posteriormente, 24
   controles dirigidos para fallas simultáneas pasaron en cada sistema;
   La suíte ampliada no fue repetida después de agregar esos controles.
   Un control de API `applyPlan` mostró que una falla sintética sin valor
   Antes de la publicación podía eliminar el temporal. La escritura atómica
   ahora
   registra la ocurrencia de la falla: siete controles preservaron el temporal,
   la causa, el índice y el archivo humano observado en macOS y Linux. La
   ocurrencia
   natural de estos valores y Windows no fueron comprobados.
   El instalador y el sync directo ahora se niegan a cambios en archivos con ACL
   Listada en macOS o cuando la consulta es inconclusiva. Los controles incluyen
   ACL y xattr simultáneos y diagnóstico de CLI; la inspección no expone su
   salida.
   En la primera versión, planificación y check no consultaban ACL. Han pasado
   informar los bloqueos en los objetivos reales; la detección no comprueba ACLs
   ocultas,
   directorios, otros sistemas o cambios posteriores a la consulta.
   En una suíte de regresión en macOS, 56 pruebas pasaron; en Linux, 42
   Han pasado y 14 fueron ignorados por plataforma. Dos controles estrictos en
   el
   macOS se negaron o preservaron ACL que niega append. La revisión detectó una
   salida malformada inicialmente clasificada como vacía; el clasificador fue
   ajustado para tratarla como no verificada. El Node 18 en Linux ejecutó el
   clasificador, pero ignoró las 11 pruebas específicas de macOS.
   Doce controles también pasaron en macOS después de la extracción del paquete
   local; eso
   No comprueba publicación, instalación en proyecto real o ACLs en directorios.
   El diagnóstico anticipado fue ampliado para plan, doctor y check directo en
   macOS, incluyendo conflictos y cambios después del plan. La suíte relacionada
   Pasó 83 pruebas en macOS; en Linux, 63 pasaron y 20 fueron ignorados por
   plataforma. Tres controles pasaron con paquete local extraído en macOS.
   No hay prueba de Windows, ACLs ocultas, directorios o atomicidad.
   La consulta inicia un proceso por archivo afectado. En una sola
   medición local macOS de 100 archivos sintéticos de 11 bytes sin ACL, as
   consultas sumaron 260,7 ms, con mediana de 2,43 ms y p95 de 4,08 ms; 100
   llamadas `lstat` Han sumado 0,5 ms. No es benchmark del plan completo ni
   previsión para otras máquinas, cargas o sistemas de archivos.
   El mismo defecto fue reproducido en API de sync con siete fallas sintéticas:
   antes de la corrección el temporal era retirado; después de registrar la
   ocurrencia de la
   fallo, los siete controles preservaron el camino, causa, índice y archivo
   humano
   observado. La suíte de preservación de temporales pasó con 94 pruebas en
   macOS y 94 en Linux en contenedores. Ella no comprueba competencia,
   metadados,
   fallas naturales con estos valores o comportamiento en Windows.
   En la copia de seguridad de sync, una falla sintética sin valor durante la
   copia podría ser
   Pasado y la sincronización prosiguiera. La corrección registra la ocurrencia
   de la
   fallo y interrumpe la operación, preservando también la causa si el cierre
   falla. La suíte de copia de seguridad y diagnóstico pasó con 26 pruebas en
   macOS y
   en Linux en contenedores. Esos controles no comprueban seguridad concurrente,
   preservación de metadados, ocurrencia natural de la falla o Windows.
   Los controles de fallos se ampliaron para escritura parcial: la copia de
   seguridad retida
   corresponde al prefijo del origen observado, sin alterar ese origen, el
   apuntamiento, índice o archivos humanos comparados. La suíte ampliada
   pasó con 28 casos en macOS y 28 en Linux en contenedores; las fallas son
   Sin embargo, la seguridad en competencia sigue sin prueba.
   Después de extraer un paquete local con el script comparado al checkout y
   copiar
   fixture, los 14 controles dirigidos también pasaron en macOS; eso no
   representa una instalación publicada o valida el paquete completo.
   Una variante aislada para la limpieza interna del sync pasó ocho controles
   En macOS y Linux, incluso reentrancia con error congelado. El agregado fue
   probado solamente en copia anterior instrumentada; nueva API, valores
   primitivos y Windows permanecen sin prueba. La variante no fue integrada.
   Caminos temporales
   Todavía están disponibles en el diagnóstico para la revisión. Windows no ha
   sido probado.
   Un paquete local offline anterior incluyó la corrección secundaria entonces
   vigente
   con bytes iguales; después de extraer el paquete y añadir la fixture de
   prueba, los
   Dos controles secundarios pasaron en macOS. Este paquete precede a
   corrección primaria y no prueba publicación u otras fallas.
   Una variante de laboratorio para la limpieza primaria pasó 12 controles en
   macOS, pero todavía puede perder la marca de procedencia al cruzar un
   agregado de errores. No fue integrada; Linux, Windows y suíte completa
   Siguen sin prueba para esa variante.
   Un prototipo suprimió
   Pero cambió los mensajes, pero cambió el mensaje. API y tres expectativas
   existentes; permanece
   aislado mientras una alternativa compatible es investigada. Otra prueba
   mostró mensaje secundario de rollback en JSON; la revisión también apuntó
   una rama de limpieza de la etapa sin protección y límites en códigos y
   caminos.
   Una alternativa basada en marca en el objeto preservó la API en el caso
   probado,
   pero clasificó incorrectamente una segunda ocurrencia al reutilizar lo mismo
   error en fixture; esa reproducción evaluó la proyección, no la CLI real.
   El diagnóstico de fallas al inspeccionar el proyecto fue separado de la
   etapa;
   Las suítes relacionadas pasaron en macOS y Linux, con 63 pruebas en cada uno.
   Otros errores todavía pueden divulgar detalles no confiables en la salida de
   la CLI;
   el coleccionista fue protegido y validado en las suítes relacionadas, pero a
   La sanitización de los demás caminos necesita corrección y validación
   propias.
   Otra proyección experimental usó mensajes fijos en CLI y pasó nueve
   controles dirigidos y dos de reutilización de error en macOS, después
   ajustar en la copia una expectativa de texto. Un control adicional pasó en
   ejecutables reales con falla sintética inyectada. La proyección reduce
   detalles
   útiles y todavía puede divulgar caminos sin procedencia comprobada; no fue
   integrada ni demuestra sanitización general o compatibilidad completa.
   Una segunda proyección por ocurrencia pasó 21 controles dirigidos en
   macOS y 21 en Linux en copia congelada. Una llamada de API aninhada
   recibir wrapper y caminos arbitrarios todavía pueden aparecer; códigos no
   También se pueden omitir. La variante sigue aislada y no
   demuestra compatibilidad o sanitización general.
   Errores de sintaxis JSON externo del catálogo ahora informan el camino sin
   incluir extractos del contenido; verificaciones de esquema siguen fuera de
   ese
   alcance. El sincronizador también usa mensajes sin contenido para errores de
   sintaxis en los estados instalado y derivado y en la configuración de
   clientes;
   Las pruebas centradas pasaron en macOS y Linux. En la copia instalada de un
   paquete
   local, tres checks rechazaron estos JSONs sin exponer el contenido y
   preservaron
   el índice y los archivos examinados; el estado derivado fue creado por
   fixture.
   Los lectores locales de
   herramientas y skills externos también usan
   mensajes de sintaxis sin contenido o camino; pruebas y clasificación de la
   pipeline pasaron con 42 pruebas en macOS y 42 en Linux, incluyendo la
   sintaxis de la política local de adaptadores en el planificador de ignore y
   en
   carga inicial del sync directo. Esos casos preservaron el índice observado;
   El primero también preservó el exclude. A CLI principal ahora trata este
   error de carga sin mostrar contenido o camino, en texto y JSON, en los tres
   idiomas; la prueba observó un índice y un archivo humano preservados. Para
   ese
   mismo error, el sync directo también dejó de mostrar el camino del módulo en
   pruebas macOS y Linux. Una copia instalada del paquete local confirmó el caso
   En macOS; otros errores y versiones de runtime no fueron cubiertos por ella.
   Las suítes da CLI y los diagnósticos pasaron con 39 pruebas en macOS y 37
   en Linux, donde dos casos fueron ignorados por plataforma. El idioma del
   error
   de startup utiliza las opciones explícitas, sin consultar el idioma salvo.
   La prueba de distribución del paquete local pasó en seis casos en macOS y
   6 en Linux, antes del ajuste posterior en la skill de PRD. La primera
   ejecución
   Linux falló al ejecutar el paquete en tmpfs montado con `noexec`; repetición
   con ejecución habilitada pasó. Esas pruebas no demuestran publicación ni
   comportamiento en Windows.
   La revisión de entrega también pasó a ocultar contenido de JSON malformado
   En un informe, baseline y sello. Los tres casos han pasado por la API e CLI
   el
   macOS y Linux, con índice y archivos observados preservados. La ausencia
   el informe siguió de regreso `ENOENT` en las dos plataformas. Otras
   Los errores de lectura y los errores de esquema no fueron cubiertos por esas
   pruebas.
   La suíte de revisión pasó con 110 tests en cada sistema; la prueba de
   `ENOENT`, añadido a continuación, pasó por separado en los dos sistemas.
   Una ejecución Linux de las pruebas de adaptadores falló en una fixture en
   tmpfs:
   el verificador encontró el `.git` por encima del punto de montaje, pero Git
   no
   Atravesó el límite del sistema de archivos. La fixture pasó a crear su
   propio repositorio Git en una carpeta temporal; las tres suítes sumaron 69
   pruebas aprobadas en macOS y 69 en Linux después del ajuste, incluyendo una
   selección
   representativa sin Git ancestral. En otra ejecución Linux, en tmpfs que
   Había expuesto la falla, 26 pruebas de adaptadores pasaron y el caso sin Git
   Ancestro fue ignorado porque el temporal estaba dentro del checkout.
   A CLI principal también rechazó los tres JSONs malformados en `sync --check`
   e `update --dry-run`, preservando los archivos Git, de estado y humanos
   observados en la fixture, inclusive el índice con alteraciones preparadas y
   una
   alteración humana todavía no preparada. Eso no prueba el `update` efectivo.
   El primer intento
   macOS anterior falló con un alias en el directorio temporal; se repitió
   La causa exacta de la falla anterior no fue comprobada por
   log. En una
   instalación sintética del paquete local, el check con Node 26 rechazó JSON
   no válido sin mostrar el contenido y mantuvo el índice y el archivo
   examinados.
   Un intento anterior terminó antes del diagnóstico y no registró la
   versión usada. Después
   revisar cinco expectativas de preservación, la suíte ampliada
   de sincronización registró 203 aprobaciones, fallo y skip tanto en
   macOS cuánto en Linux. El fallo restante implica `autocrlf` y sigue en
   investigación; no fue atribuida a la corrección del diagnóstico. Un prototipo
   que
   permitió la escritura perdió ACL en macOS y xattr en Linux; los controles de
   la base
   Se negaron la operación y preservaron los metadados sintéticos observados.
   La prueba ahora exige una descripción nueva en el frontmatter y bytes
   intactos del
   índice, impidiendo aprobar un resultado que preserve el apuntamiento antiguo.
   El control confirmó que un no-op no satisface la aserción; la candidata
   Pasó en copia en macOS y Linux, sin comprobar seguridad o metadatos. La base
   continúa fallando en la colisión en ambos, antes de llegar a las nuevas
   aserciones;
   la prueba normaliza finales de línea y no exige CRLF Y en realidad, en el
   resultado.
   Una repetición con snapshot actualizado confirmó que la normalización
   propuesta
   permite actualizar la referencia y preservar el índice, pero todavía pierde
   ACL el
   macOS y xattr en Linux. Ella permanece fuera del producto.
   Una variante posterior exigió entrada y blob equivalentes en el índice y
   rechazó
   Los metadados observados en las fixtures. La revisión independiente destacó
   que
   hash no comprueba autoría, que el diff depende de addon no distribuido y que
   Los guardias afectan a otras operaciones de sync. Las pruebas no comprueban
   contenido
   preservado en todos los errores, competencia, autorización o compatibilidad
   multiplataforma; la variante permanece en laboratorio.
   Cuatro controles adicionales en macOS se negaron a sustituir con ACL o xattr
   sintético y preservaron los archivos y metadatos observados, con y sin force.
   Sin metadatos, hubo actualización, pero el check inmediato indicó divergencia
   del índice staged preservado; un control sólo quedó saludable después `git
   add`
   explícito y otra sincronización. La repetición Linux fue inconclusiva; según
   la investigación del equipo, el addon no encargó en tmpfs sin ejecución y a
   ACL No estaba soportada allí.
   Ese experimento no fue integrado ni comprueba la portabilidad o la
   atomicidad.
   Una repetición posterior en Linux con filesystem que permitió addon y ACL
   Ha pasado seis controles, así como en macOS. Dos controles adicionales por
   sistema preservaron metadatos sintéticos del directorio padre; no cubren
   ACL herdables o directorios restrictivos. El prototipo todavía depende de
   addon
   experimental y no comprueba todos los metadatos ni Windows.
   Otra variante sin addon pasó cinco controles por sistema: cuatro de
   preservación de referencias CRLF equivalentes y un denegación de modificación
   real. La revisión independiente
   confirmó que ella no resuelve la prueba de CI con descripción alterada: en
   ese
   Si la protección sigue rechazando la operación, la prueba cubre sólo un tipo
   de apuntamiento; faltan suítis completa, CLI, Windows y competencia. A
   La variante permanece en laboratorio.
   Una prueba de escritura directa por el descriptor preservó inode y metadatos
   sintéticos en los controles observados, pero también alteró otro nombre
   conectado
   por hardlink y dejó contenido incompleto después de la interrupción simulada.
   cuatro controles en macOS y cuatro en Linux; no ejecutaron sync. Ese
   mecanismo aislado no es una corrección segura para integrar.
   En otro control, la candidata de sustitución desfez la relación con un
   hardlink humano, aunque preserva los bytes del otro nombre. Una guarda
   experimental rechazó el caso y preservó la relación en las fixtures de macOS
   y
   Linux. Ella todavía depende de sondas experimentales y no comprueba
   metadados,
   competencia o Windows; no fue integrada.
   Una prueba versionada ahora exige la negativa cuando el apuntamento CRLF
   necesita
   cambiar y compartir con un archivo humano. El control pasó en macOS y
   Linux, preservando los bytes, la relación observada y el índice; Windows no
   Fue validado. En la base de esa prueba, la negativa vino de la colisión
   genérica, sin
   comprobar una guarda específica de hardlink. Si no es posible crear el
   enlace,
   la prueba informa skip para las condiciones reconocidas. Esta negativa no
   resuelve
   la actualización de archivos sin enlaces.
   Una guarda posterior en sync directo pasó a rechazar la actualización o
   remoción
   de archivo regular con múltiples hardlinks observados antes de la escritura.
   Los
   cuatro casos con y sin force y un sync sin cambios pasaron en macOS y
   Linux, preservando los caminos comparados; una suíte anterior a la expansión
   Ha pasado 132 pruebas en cada sistema. La verificación no es atómica con la
   escritura,
   y Windows, atributos extendidos y ACLs siguen sin prueba suficiente.
   sync ahora también comprueba el recuento inmediatamente antes de publicar o
   eliminar. Un hardlink creado entre las verificaciones ha llevado a la
   negativa a realizar pruebas
   de actualización y eliminación; la eliminación inicialmente restauraba el
   archivo y
   rompía el enlace, y se ajustó para no restaurar cuando la acción todavía no
   no
   Comenzó. Los dos controles de sync y uno de los instalador pasaron en macOS y
   Linux, así como 140 pruebas de la suítis relacionada en cada sistema. No
   Eliminan la ventana posterior a la última verificación ni comprueban
   seguridad concurrente general. La revisión también apuntó un riesgo sin
   embargo
   reproducción: operaciones anteriores en el mismo límite de transacción pueden
   llevar
   el rollback para restaurar ese límite, mientras que el fingerprint no incluye
   la
   Cuenta de enlaces. Es necesario verificar si el plan permite esa situación.
   Otra corrección impide que se trate un fallo de eliminación con valor vacío
   como éxito. Cuando el contenido observado permanece igual, el rollback evita
   recrear el camino; si hubo un toque anterior en la misma raíz, se conserva
   Como incierta y puede mantener cambios parciales. La suítis relacionada ha
   pasado
   161 casos en cada sistema; los 21 controles dirigidos también pasaron con
   el script extraído de paquete local en macOS. La rama con toque anterior,
   ACL, xattr
   La competencia general y Windows siguen sin pruebas suficientes.
   Posteriormente, seis controles con error `EIO`, inclusive inmutable,
   También pasaron en cada sistema; estos errores son inyectados por la fixture.
   Un prototipo aislado para informar hardlinks en la planificación pasó seis
   controles por sistema, inclusive conflicto simultáneo y cambio posterior
   al plan. No fue integrado: requiere revisión de los caminos y mensajes y no
   prueba atomicidad ni compatibilidad con Windows.
   Una integración selectiva posterior informa hardlinks compartidos y
   recuentos no verificadas en la planificación, check y doctor; conflictos
   humanos
   mantienen prioridad. Los mensajes fueron corregidos después de una revisión
   independiente.
   Siete suítes relacionadas pasaron 219 pruebas en macOS y Linux; dos controles
   Pasaron después de la extracción de paquete local en macOS. La prueba no
   cubre Windows,
   todos los cambios competidores o preservación de ACL y xattr.
   El instalador también pasó a conferir los objetivos reales planeados antes de
   backup y nuevamente antes de la escritura. Pruebas sintéticos de
   actualización y
   la eliminación preservaron los hardlinks observados; la suíte relacionada
   pasó 137
   casos en macOS y Linux. Na CLI real, seis pruebas de init verificaron salida
   humana y JSON en los tres idiomas en ambos sistemas. Una primera ejecución
   Linux informó de error de sintaxis en lectura de archivo incompleta;
   repetición
   Ha pasado, pero la causa de la lectura incompleta no fue comprobada. La
   protección
   Sigue sujeta a cambios competidores y no se ha probado en Windows.
   Recuento de hardlinks no válido o ausentes ahora interrumpen la aplicación
   con diagnóstico de metadados no verificados, en lugar de ser tratadas como
   prueba de ausencia. Doce controles sintéticos de la API, sync y CLI Han
   pasado el
   macOS y Linux, incluso mensajes en los tres idiomas. No se comprobó qué
   filesystems retornan esos valores; la política puede bloquear su operación.
   La suíte relacionada pasó 179 pruebas en macOS y Linux; los 12 controles
   También pasaron después de la extracción de un paquete local en macOS. La
   política no
   Se ha demostrado en Windows o en filesystem que no se haya registrado ningún
   recuento.
   Una hipótesis de bloqueo de la etapa por ACL herdable en el directorio
   temporal
   No ocurrió en fixtures de init y sync. La herencia fue verificada en muestra
   separada, no en el archivo efectivo de la etapa; otras operaciones siguen sin
   prueba, así como la preservación integral de metadados en esos controles.
   Controles posteriores ampliaron los valores sintéticos para conteos
   negativas, fraccionarias, infinitas e imprecisas; 20 pasaron en cada sistema.
   Un control adicional confirmó la negativa cuando el recuento se convirtió en
   un control adicional.
   No disponible después del plan, sin declarar el hardlink como confirmado.
   Los 20 controles ampliados también pasaron después de la extracción de
   paquete local en
   macOS; esto no comprueba una publicación o instalación en otros sistemas.
   Una nueva ejecución del caso `autocrlf` en Linux confirmó la negativa por
   colisión antes de actualizar la referencia. sync compara el hash registrado
   a los bytes actuales, que difieren después de la conversión de finales de
   línea. Aceptar a
   equivalencia por sí solo no protege ACLs, xattrs o hardlinks.
   Los helpers `withUncertainPath` e `withPotentialPartial` Ahora leen el
   mensaje
   Una vez; las pruebas de esta alteración pasaron en macOS y Linux. Eso no
   prueba protección de todos los getters o de la salida del sincronizador. Un
   El prototipo más amplio continúa fuera del producto porque aún expone un
   camino
   no confiable en sync directo.
   El diagnóstico de hardlink inmutable también pasó a conservar el código leído
   en el reconocimiento; las suítes dirigidas pasaron con 21 pruebas en macOS y
   21 en Linux. Estas pruebas no corrigen la recuperación concurrente.
   Se ha ajustado una fixture antigua para exigir truncamiento en diagnóstico
   malformado sin perder datos válidos. Las suítes de configuración Git y locale
   Han pasado con 153 pruebas en macOS y 152 en Linux; uno y dos casos,
   respectivamente, fueron ignorados por plataforma.
   Una copia experimental de ACL para la copia de seguridad preservó la entrada
   `everyone allow read` incluso con el modo `0600`. El acceso efectivo no fue
   probado; copiar metadatos no comprueba la privacidad de la copia de
   seguridad.
   Una fixture separada confirmó ACL heredada en la copia de seguridad y en
   temporales
   init, sin probar acceso por otra identidad. La aplicación y sync ahora
   Se niegan a copiar para una copia de seguridad nueva en macOS cuando la
   carpeta tiene ACL listada o
   su consulta falla; cuatro controles preservaron la copia de seguridad vacía y
   los
   archivos comparados. La guarda no cubre temporales de publicación, otros
   sistemas o cambios competidores después de la consulta.
   Dos controles adicionales confirmaron que ACL no herdable en el directorio
   padre
   no bloqueó las fixtures de instalador y sync; la suíte correspondiente pasó
   78 pruebas en macOS, y 72 en Linux con seis skips específicos de macOS.
   Después de la revisión, los controles exitosos pasaron a comparar los bytes y
   el
   modo de archivo específico en la copia de seguridad con los de origen; siete
   controles
   Se dirigieron a macOS, sin comprobar todos los metadatos.
   Los seis controles de copia de seguridad pasaron también en macOS después de
   extraer el paquete
   local, sin instalar en proyecto real.
   Una prueba adicional ejecutó el init real de CLI com ACL herdable en la raíz
   de
   fixture: la copia de seguridad se ha negado vacío, y el archivo original,
   índice y demás
   Los archivos comparados se han conservado. La prueba también ha pasado con
   paquete
   local extraído. La suíte ampliada pasó 79 pruebas en macOS y 72 en Linux,
   con siete pruebas de macOS ignorados en Linux; no medió acceso de terceros.
   Los cuatro controles anteriores al refuerzo de la inspección de la fixture
   también
   Pasaron con el paquete local extraído; no hubo instalación en proyecto real.
   Un prototipo separado examinó temporales vacíos antes de guardar contenido
   y se negó ACL heredada en las fixtures. Los 24 controles existentes de modo y
   unask no observaron la nueva escritura por descriptor; el prototipo continúa
   aislado hasta que la cobertura sea adaptada y los cierres sean verificados.
   Después de la adaptación experimental del observador, los 24 controles
   pasaron en el
   macOS y Linux. Persisten vacíos en las demás pruebas de fallo, cierre, copia
   de seguridad,
   rollback, atributos extendidos y atomicidad; no hubo integración.
   Una variante de laboratorio preservó errores simultáneos de ACL y cierre
   en seis controles macOS; en Linux pasó un control de agregación y cinco
   específicos de macOS fueron ignorados. La identidad en la publicación
   continúa
   sin prueba después del cierre del descriptor; no fue integrada.
   Otra copia aislada con `cp -p` el macOS conservou ACL y xattr sintéticos.
   Con destino preexistente, `cp -np` volvió error y mantuvo su contenido en
   fixture. Esos controles no comprueban privacidad, atomicidad o tratamiento
   No se integró al producto.
   La primitiva aislada de copia de seguridad ahora se niega a operar sin UID
   efectivo disponible;
   Su suíte pasó con 53 pruebas en macOS y 53 en Linux. Ella todavía no está
   integrada al instalador o al sync y no comprueba privacidad de ACLs.
   Una instrumentación de prueba observó 290 directorios creados y 488 nombres
   temporales en un init sintético; el candidato de captura cubrió los
   directorios, pero no los temporales. En otra fixture, la raíz ausente también
   quedó fuera. Una copia sintética de copia de seguridad fue conferida por
   bytes. La suíte
   pasó con 29 pruebas en macOS y 29 en Linux; eso no prueba un plan
   completo ni recuperación segura.
2. [-] **Prácticas exteriores:** comparar [ECC](https://github.com/affaan-m/ECC)
   e [Superpowers](https://github.com/obra/superpowers) con el kit. Priorizar
   evaluaciones con evidencias, diagnóstico y revisión; respetar licencias y
   evitar copiar contenido innecesario o activar automaciones sin petición.
3. [ ] **Autor:** verificar código, documentación, metadatos e histórico a
   publicar; eliminar referencias a los agentes usados en el desarrollo sin
   eliminar instrucciones de compatibilidad. Reforzar en las skills Git que
   autoría,
   Committer y coautoría de agentes no deben constar en los commits.
4. [-] **Instalación:** verificar publicación en el npm y probar formas útiles
   de ejecución con npm, Yarn, pnpm y Bun, documentando versiones,
   prerrequisitos y limitaciones observadas; no afirmar compatibilidad sin
   prueba. La versión npm `0.0.30` Y lo que hizo fue las cuatro vías en macOS,
   pero alteró `.git/info/exclude` en las fixtures; la preservación integral no
   pasó en esa prueba.
5. [-] **Enlaces externos:** inventariar y probar los enlaces versionados,
   conferir pertinencia y corregir destinos; distinguir fallo comprobado de
   bloqueo, autenticación, límite de acceso o biodisponibilidad temporal. Una
   primera extracción de Markdown rastreado verificó 103 URLs con respuesta 2xx;
   cuatro no fueron verificadas. Otra búsqueda encontró 41 respuestas 2xx entre
   referencias adicionales. sintaxis no capturadas y anclas siguen pendientes;
   HEAD El éxito no demuestra la pertinencia del contenido. Una auditoría
   incremental encontró tres destinos públicos adicionales accesibles; URLs
   privadas, consultas sensibles y endpoints mutables fueron excluidos.
6. [-] **Rendimiento:** incorporar al flujo la definición previa de carga,
   métrica, límites y prueba comparable, conforme al artículo suministrado;
   evitar asumir percentil o cantidad de repeticiones universales.
7. [-] **Ejemplos:** crear ejemplos sintéticos útiles para proyectos nuevos y
   existentes, preservando datos humanos y sin contenido privado. Los ingresos
   se ejecutaron en macOS con paquete local, preservando el índice, las
   configuraciones Git y el contenido humano observados; el kit añadió un bloque
   al `AGENTS.md`. Windows y material visual todavía no se han verificado.
8. [ ] **Entrega:** revisar archivos e índice, datos sensibles, pruebas,
   documentación y paquete publicado. Después de crear commit con identidad del
   usuario y enviar los cambios autorizados; verificar el resultado remoto.
9. [-] **Compatibilidad y ejecución:** validar versiones publicadas en proyectos
   existentes y ejecutar cada skill y agente individualmente. Una matriz de
   1.000 proyectos sintéticos en macOS registró 792 aprobados en las
   verificaciones estructurales de CLI; los otros 208 y el resultado general
   permanecieron no verificados. La matriz no prueba la ejecución real de todas
   las skills y agentes; esa prueba continúa pendiente. En 40 proyectos
   sintéticos Linux, el paquete npm `0.0.21` Alteración `.git/info/exclude`
   durante `init`; los 40 casos fallaron en el criterio estricto y pararon antes
   de las etapas posteriores. Entre los caminos comparados, ese fue el único
   modificado; esto no cubre todos los archivos o metadatos. Los bloques
   añadidos fueron reconocidos en revisión posterior, pero siguen siendo cambios
   reales. El diagnóstico estricto fue corregido para no afirmar que los bloques
   son desconocidos cuando no fueron inspeccionados. La suíte de la matriz pasó
   con 45 pruebas en macOS y 44 en Linux; un caso fue ignorado en Linux. En más
   1.000 proyectos sintéticos Linux, con otras combinaciones de clientes, `init`
   Volvió éxito en todos, pero todos fallaron en la preservación estricta:
   entre los caminos monitorizados, solamente `.git/info/exclude` Ha cambiado.
   Los casos
   pararon después `init`, sin validar update, doctor, sync o ejecución de las
   skills.
   Un lote posterior de 40 proyectos usó `--diagnose-exclude` con la `0.0.21`
   en contêiner Linux sin red. Los 40 continuaron reprobados en la preservación
   estricta, pero el controlador reconoció los bytes del bloque de exclude y
   Prosiguió: `init`, `update`, `update --force`, `doctor` e `sync --check`
   Han regresado cero en todos. El mapeo de recursos permaneció no
   verificado en los 40; reconocer bytes no autentica el paquete o comprueba
   activación, metadados y ausencia de cambios transitorios. Fue preservado el
   informe agregado, no los logs y snapshots individuales del contêiner.
   Una variante experimental del controlador reconoció la exportación de caminos
   la `0.0.21`, condicionado a hashes de tres archivos. En 40 proyectos, marcó
   26 como verificados por los controles instrumentados y 14 no verificados;
   Todos continuaron reprobados por la modificación del excluyente.
   mostró que la variante importa código antes de verificar hashes y no
   prueba metadados como `alwaysApply` e `globs`. La marca de los 26 no
   comprueba cobertura estructural completa, alcance o activación. La variante
   permaneció aislada: faltan procedencia y pruebas de excepciones. Una primera
   variante esperaba incorrectamente el formato Gemini sin argumentos y paró en
   cuatro casos; la segunda usó el formato observado para destinos nuevos.
   Después de esta revisión, el controlador principal pasó a marcar reglas
   Cursor y
   Copilot como no verificadas cuando el alcance de sus metadados no fue
   conferido. Los controles con apuntamientos sintéticos pasaron en macOS y
   Linux; la suíte de la matriz registró 47 aprobaciones en macOS y 46 en Linux,
   con un skip. Resultados anteriores clasificados como verificados no
   prueban esos metadados y no fueron recalculados.
   Después, la matriz pasó a comparar el frontmatter generado simple con la
   regla de origen; sidecars, fuentes humanas y objetivos ambiguos continúan no
   verificados. En la repetición de Linux offline con la candidata local
   anterior,
   30 de los 40 casos quedaron verificados por los controles y diez no
   verificados:
   seis por alcance Claude y cuatro por metadados Cursor con sidecar. El resumen
   agregado fue preservado; logs y snapshots individuales quedaron en el
   contêiner.
   La prueba no cubre activación nativa, todos los metadatos o cambios
   transitorios.
   Una revisión confirmó que la continuación mantiene el fallo original, pero el
   resumen en stdout omitia la indicación del modo diagnóstico. El resumen ahora
   Incluye `diagnosticExclude`; los controles de ejecución diagnóstica y normal
   Han pasado en macOS y Linux. El stdout del lote anterior no contiene ese
   campo.
   El contenedor se operó sin red; los archivos extraídos del paquete
   coincidieron con
   el tarball observado antes y después, sin probar la ausencia de cambio
   transitorio.
   La comparación no cubre todo el árbol o sus metadados.
   Una primera comparación de la candidata
   quedó sin procedencia válida porque el controlador fue editado durante la
   ejecución; sus resultados no comprueban la comparación. La repetición con
   controlador y paquete congelados preservó índice, ignores, configuración y
   paquete
   refs observados en 40 proyectos Linux; documentos pudieron recibir bloques
   Los cinco pasos giraron en todos: 34 tuvieron cobertura
   estructural verificada y seis permanecieron no verificados en cuanto al
   alcance
   nativo Claude. La candidata usada precede el ajuste posterior de la skill
   `verificar-trabalho`. La actualización fue de la candidata sobre ella misma,
   no de la
   `0.0.21` la matriz no prueba el comportamiento de todas las
   skills. La procedencia compara cinco archivos antes y después, no el árbol
   completo del paquete o cambios transitorios.
   El controlador posterior pasó a comparar también catálogo, mapa de destinos
   y política de adaptadores. Una prueba cambió estos archivos durante una
   ejecución sintética y confirmó el fallo de la procedencia. La suíte tuvo 49
   pruebas
   aprobados en macOS y, Linux, 48 aprobados y un ignorado específico del
   macOS. Esta ampliación no autentica el paquete ni observa cambios revertidos.
   Una repetición en Linux sin red usó un paquete local `0.0.30` congelado y
   Preservó el informe fuera del repositorio. De los 40 proyectos, 34 tuvieron
   cobertura estructural verificada y seis quedaron no verificados debido al
   El alcance nativo Claude de la regla Git. La preservación observada fue
   verificada
   en los 40; `init`, `update`, `update --force`, `doctor` e `sync --check`
   Han vuelto cero. El paquete actualizó a sí mismo, no a `0.0.21`; la matriz
   no ejecutó clientes o skills y no cubre todos los metadatos o cambios
   transitorios. El paquete precede a cambios posteriores en el ejecutor de
   infraestructura. El primer ensayo con salida fuera de `/tmp` Se denegado
   antes de la matriz; la repetición usó una carpeta temporal permitida.
   Una prueba posterior instaló la `0.0.21` e intentó actualizar una fixture
   Claude con la candidata local `0.0.30`, sin red en Linux. La actualización
   rechazó ocho conflictos de reglas y no alteró tipos, modos o hashes de los
   caminos observados, incluso Git. En la instalación anterior, el exclude fue
   creado y un agente humano recibió bloque gestionado; una repetición confirmó
   que su texto original se mantuvo como prefijo. La negativa no comprueba
   actualización exitosa, otros proyectos ni ausencia de efectos transitorios.
   En otra fixture preparada con nuevo init da `0.0.21`, tanto `update` cuánto
   `update --force` rechazaron los mismos conflictos; tipo, modo y hashes del
   árbol
   examinada, Git y bytes del agente humano quedaron iguales después de cada
   intento.
   No fueron comparadas ACLs o atributos extendidos.
   La salida humana de CLI pasó a listar hasta cinco conflictos incluso cuando
   el
   plano está vacío. Los controles de formatación y el preview de conflicto
   Claude
   Han pasado en macOS y Linux; la lista completa sigue disponible en JSON.
   Un análisis de otra fixture confirmó que los ocho wrappers correspondían
   a los hashes de `state.files` la `0.0.21` y no estaban en el índice Git.
   Siete
   declaraban `always_on`; cinco de sus fuentes eran idénticas a las de la
   candidata
   y dos difirieron. La regla Git declaraba `model_decision` y su fuente también
   diferia. La candidata preservó los wrappers y bloqueó el plan; preservar
   Solo los wrappers no garantizan que una actualización de las fuentes mantenga
   el
   comportamiento. El hash histórico no comprueba inode, ACL o autorización
   actual, y la activación real en el cliente no fue observada.
   Una alternativa experimental conserva los ocho wrappers, fuentes y hashes
   durante `update`, con advertencia de alcance no verificado, pero no fue
   integrada.
   En fixture, la plantilla gitignore referenciado por calidad y la skill
   `proximos-passos` referenciada por la regla homónimo cambiaron de hash; no
   hay
   prueba de comportamiento transitivo equivalente. sync directo rechazó la
   regla
   Git; la explicación identificada por lectura de código no fue instrumentada.
   No hubo controles con wrapper staged o editado ni fuente humana editada.
   La inspección posterior encontró dos recursos alterados a dos niveles de
   norma de seguridad. Links no permite enumerar con seguridad referencias
   en prosa, caminos variables o dependencias externas; la negativa permanece
   Incluso hay una frontera de compatibilidad comprobada.
   En fixtures macOS separadas para Codex y Copilot, `init` la `0.0.21` e
   `update` la candidata extraída `0.0.30` Han vuelto éxito, con cambios
   en la actualización y sin conflictos. Los siete archivos humanos observados,
   índice,
   configuración, exclude y diffs fueron iguales durante cada actualización.
   anterior alteró `AGENTS.md` y excluye; los bytes humanos iniciales
   `AGENTS.md` Se mantuvieron como prefijo. La actualización cambió 491 caminos
   en la línea.
   fixture Codex y 318 en Copilot, sin inspección individual de todos ellos.
   La prueba no cubre instalación npm, activación nativa, metadados completos o
   estabilidad integral del checkout durante el empaquetado de la candidata.
   La suíte dirigida de alcance y legado pasó 18 pruebas en macOS, incluyendo
   preservación de referencia sin ownership y bloqueo de contenido staged.
   Ella no reproduce, por sí solo, la actualización real entre esas versiones.
   En el router con `0.0.21`, sync directo `--check` Regresó a cero e informó
   ningún cambio o conflicto en una ejecución macOS con escritura y red
   bloqueados. El índice, `.gitignore`, exclude y configuración Git mantuvieron
   sus hashes. Ese check no comprueba activación de reglas ni todos los flujos.
   O `doctor` del paquete publicado también volvió éxito sin issues en el
   router,
   con red y escritura en el proyecto bloqueados y etapa temporal autorizado;
   Los mismos archivos Git mantuvieron los hashes. Un intento anterior falló
   al crear la etapa debido al camino permitido en el sandbox y fue repetida
   con el directorio canónico. El resultado no comprueba las operaciones
   mutables.
   `next` de la misma versión también volvió éxito e indicó preparación inicial
   el router, con escritura y red bloqueadas; los cuatro archivos Git observados
   mantuvieron sus hashes. La recomendación no comprueba la conclusión del
   proyecto.
   Una consulta Git sin escritura confirmó patrones de ignore para seis caminos
   sintéticos en el router, incluyendo tres variaciones de caja
   `.playwright-mcp`;
   Los mismos cuatro hashes permanecieron iguales. Como usó `--no-index`, a
   consulta no comprueba si los caminos son rastreados ni se dejarían de ser
   enviados a Git; tampoco cubre todas las variaciones.
   Otra consulta cubrió las 8.192 combinaciones de caja `.playwright-mcp`
   con un sufijo fijo; todas encontraron patrón de ignore. La revisión
   independiente
   confirmó las tuplas Git y los hashes observados. Los límites de `--no-index`,
   Otros nombres y caminos siguen siendo aplicables.
   Otra consulta preparó el índice y no encontró entradas correspondientes a
   familias de artefactos Playwright y resultados de prueba verificadas. Eso
   No examina el historial ni todos los nombres posibles.
   En pruebas nativas controladas,
   Hubo extrapolación del alcance de una búsqueda y afirmaciones de arquitectura
   y
   documentación sin comprobación; el comportamiento todavía no es consistente.
   En seis sesiones controladas de Copilot CLI, la fuente del perfil fue leída
   en
   una de tres con enlace Markdown y en una de tres con `@`; ninguna prueba
   expansión automática. La muestra no comprueba causalidad o consistencia.
   En una sesión del perfil de rendimiento, el cliente distinguió conteo de
   operaciones de benchmark; la prueba de los recuentos fue ejecutada por el
   controlador,
   No por el agente, y no demuestra desempeño en producción.
   En una sesión con skill `avaliar-performance` la `0.0.21`, el cliente
   también distinguió los recuentos de una medición aislada de latencia; el
   controlador ejecutó la prueba por separado. No hubo benchmark ni validación
   en producción. La instalación anterior cambió el `exclude` local de la
   fixture.
   En un proyecto Express fijado por commit, la versión publicada `0.0.21`
   Alteró las exclusiones locales de Git en macOS. La candidata local preservó a
   los
   Los archivos observados en este sistema. La suíte de Express pasó antes y
   después
   com 1.290 pruebas en cada copia, en Linux ARM64 sin red en la ejecución,
   usando
   las mismas dependencias resueltas sin lockfile.
   Una candidata local también pasó en las verificaciones de instalación en
   commits
   fijas de Zod y Tailcat en macOS ARM64, preservando el contenido humano y las
   configuraciones Git verificados. En las copias sin y con el kit, la ejecución
   El patrón de Vitest en Zod pasó: 8.426 pruebas en 596 ejecuciones de
   archivos,
   en Linux ARM64 sin red durante build y pruebas. La instalación de las
   dependencias usó red y ignoró scripts de instalación.
   La aplicación Tailcat no fue ejecutada en esa prueba.
   En sesiones aisladas, los perfiles planificador y arquitecto fueron leídos
   por
   cliente; los resultados no demuestran consistencia entre sesiones ni
   ejecución
   completa de todas las tareas de estos perfiles.
   O `arquiteto` la `0.0.21` leyó requisito y módulo sintéticos, invocó
   `avaliar-arquitetura` y delimitó la ausencia de persistencia al módulo. Un
   controlador independiente confirmó el caso en dos procesos después de la
   sesión.
   En aplicación manual posterior de skill, dos pruebas confirmaron lectura en
   proceso que grabó y ausencia del valor en proceso nuevo. La necesidad de
   persistencia permanece en una decisión abierta; la prueba no cubre el sistema
   real,
   fallo de disco, cliente nativo o revisión independiente. Los archivos y Git
   observados quedaron iguales después del init, que había alterado el exclude.
   O `especialista-frontend` identificó, por lectura, un campo sin `required`;
   el control fue estático y no ejecutó navegador. En ambas consultas,
   El árbol y Git observados quedaron iguales después de que el init haya
   cambiado el exclude.
   En otra consulta al `planejador` la `0.0.21`, el cliente identificó la
   divergencia de un cálculo, separó dudas y pruebas propuestas y no afirmó
   haber probado. Árbol y Git observados quedaron iguales durante la consulta;
   el
   init anterior añadió un bloque al exclude de la fixture. Buscas ocurrieron,
   Pero sus argumentos y resultados no fueron registrados por el controlador.
   En aplicación manual posterior, el `planejador` consultó `next`, registró
   tareas y dejó la decisión sobre entradas negativas en abierto. Una prueba
   existente fue ejecutado por separado por el controlador y pasó; él no
   cobre esa decisión. Árbol y Git observados permanecieron iguales después del
   init,
   que había cambiado el exclude. No hubo activación nativa o revisión
   independiente.
   En una consulta al agente `analista-performance` la `0.0.21`, el cliente leyó
   la fuente y la skill de performance, explicó el costo bajo hipótesis e
   informó
   que no ejecutó benchmark. Árbol y Git observados quedaron iguales durante la
   consulta después de que el init haya añadido un bloque al exclude de la
   fixture. O
   controlador no observó wrapper en el flujo de eventos; su activación no fue
   comprobada o refutada por esa sesión.
   En aplicación manual posterior, dos implementaciones sintéticas de suma
   produjeron resultados iguales en la entrada examinada; siete rondas
   alternadas
   Fueron medidas en un proceso y una prueba separada pasó. Ninguna meta fue
   proporcionada. Los archivos y Git comparados permanecieron iguales después
   del init,
   que anteriormente alteró el exclude. La prueba no cubre cliente nativo,
   CPU, memoria, revisión independiente o desempeño en producción.
   En otra consulta, el agente `especialista-backend` la `0.0.21` identificó
   un cálculo divergente del contrato e informó que no ejecutó pruebas. O
   cliente leyó la fuente e invocó `revisar-codigo`; no se observó invocación
   de `implementar-backend`. Árbol y Git observados quedaron iguales durante la
   sesión después de que el init haya añadido un bloque al exclude de la
   fixture.
   En aplicación manual posterior, el especialista corrigió una comparación en
   módulo sintético: dos pruebas fallaban antes y los tres pasaron después.
   El diff unstaged del código cambió intencionalmente; comentario humano,
   índice, configuración, excluye y diff staged permanecieron iguales. A spec y
   el plan eran ficticios; no hubo cliente nativo, API real o revisión
   independiente. El init anterior había modificado el exclude.
   En consultas separadas a los agentes `revisor` e `documentador` la `0.0.21`,
   los clientes identificaron divergencias sintéticas y informaron no ejecutar
   pruebas; el controlador dio ejemplos después de las sesiones. Árboles y Git
   Se observaron iguales durante las consultas, después de que los inits
   alteraran los
   excludes de las fixtures. La activación de los wrappers no fue comprobada.
   En aplicación manual posterior del `revisor`, un diff staged sintético con
   error aritmético fue identificado y una prueba real registró una aprobación y
   un fallo. La enmienda no se aprobó. Índice, HEAD, configuración,
   exclude, diffs y árbol observados permanecieron iguales durante la revisión;
   el init anterior había cambiado el exclude. La prueba no usó cliente nativo
   ni revisión independiente y no comprueba funcionamiento en proyecto real.
   En aplicación manual posterior del `documentador`, el manifiesto fue
   consultado
   y su prueba sintética pasó con Node; el README recibió el comando observado
   Sin perder bytes anteriores, y la repetición no duplicó la sección. Índice,
   configuración, exclude, diffs y archivos comparados fueron iguales después de
   la
   init, que anteriormente había cambiado el exclude. La prueba no ejecutó
   `npm test`, cliente nativo o revisión independiente.
   En una consulta al `engenheiro-qa` la `0.0.21`, el cliente leyó la fuente y
   Invoca `planejar-qa`; identificó divergencias en el cálculo y declaró que
   No ejecutó pruebas. El controlador confirmó cuatro ejemplos después de la
   sesión.
   Árbol y Git observados quedaron iguales durante la consulta; el init anterior
   Añadió un bloque al exclude de la fixture. wrapper no se observó en
   eventos, lo que no prueba que haya dejado de ser cargado.
   En aplicación manual separada, cinco pruebas para dos criterios sintéticos
   pasaron con Git y Node en sandbox macOS sin red; el código de prueba staged,
   índice y archivos observados fueron preservados. El primer intento pasó
   las pruebas, pero el controlador rechazó el formato de salida; la repetición
   usó
   TAP explícito en otra fixture. No hubo instalación o activación nativa, ni
   prueba de integración o de todas las entradas posibles.
   En otra aplicación manual del `engenheiro-qa`cuatro pruebas de una fila
   El término sintético pasó: orden, fila vacía, preservación de la entrada y
   rechazo de
   ítem vacío. Código y pruebas estaban staged y permanecieron iguales, así
   como Git y archivos observados después del init; el init había cambiado el
   exclude.
   Persistencia, competencia, integración y revisión independiente no fueron
   comprobadas.
   En una sesión de lectura con `gerenciar-roadmap` la `0.0.21`, el cliente
   reconoció el borrador y el bloqueo por ausencia de PRD. Un intento de
   ejecutar `git status` fue negada; el controlador confirió el índice y los
   archivos observados. La sesión no prueba el flujo completo de skill.
   En aplicación manual posterior, un roadmap sintético registró diseño en
   revisión sin presumir aprobación. Sync y check de API regresaron cero con
   ignores locales y entrypoints desactivados; índice, config, diffs y archivos
   Los humanos comparados permanecieron iguales. El primer intento no registró
   el campo de una falla de comparación; otra comparó objetos por identidad.
   La fixture final corrigió el controlador. No hubo instalación, cliente
   nativo o prueba de los patrones de CLI y de todos los metadatos.
   En una sesión con `criar-recurso` la `0.0.21`, el modelo solicitado fue
   creado sin frontmatter y rechazado por el catálogo en la verificación
   posterior
   del controlador. El índice y los archivos humanos observados fueron
   preservados.
   La candidata pasó a exigir explícitamente frontmatter y H1 para modelos.
   En una sesión nativa posterior, el modelo producido incluyó ambos y el
   catálogo
   aceptó la entrada en el control separado; Git y archivos humanos observados
   permanecieron iguales. La instalación de un paquete local en fixture Git
   incluyó
   la orientación y pasó en el `sync --check`. Una fixture sin Git volvió aviso
   y código 1 en el check. Una sesión no comprueba consistencia entre clientes.
   En prueba manual offline separada de `0.0.21`un modelo sintético con
   frontmatter fue reconocido por el catálogo y pasó en sync y check; Git y
   Los archivos humanos observados fueron iguales. El controlador ejecutó el
   flujo;
   Esa prueba no es una sesión nativa ni invalida la falla anterior.
   En una sesión de `criar-design-doc` la `0.0.21`, el cliente leyó la skill y
   el
   PRD En borrador, informó el bloqueo y no creó el documento. El intento
   de usar Git fue negada; el controlador verificó índice y árbol observado.
   La sesión no comprueba el flujo completo ni la consistencia entre sesiones.
   En aplicación manual posterior, se creó un diseño sintético en borrador
   com PRD y UX se aprobaron de forma ficticia; decisiones y aprobación del
   diseño se quedaron
   pendientes. Sync y check de API Han pasado y los archivos y Git comparados
   fueron
   preservados. Referencias oficiales no fueron consultadas por falta de red;
   No hubo cliente nativo o comprobación del flujo completo.
   En una sesión de `criar-spec` la `0.0.21`, el cliente leyó un PRD en borrador
   Y así creó la spec, incluyendo decisiones sin soporte en PRD sintético.
   El índice y los demás caminos observados quedaron iguales durante la sesión.
   Una revisión intermedia de la candidata no creó la spec en otra sesión.
   Después de un refuerzo explícito de la preparación y del bloqueo, una sesión
   separada leyó
   la orientación, pero creó la spec e incluyó decisiones no comprobadas. El
   índice
   y los archivos humanos observados fueron iguales; el árbol fuera del destino
   No se comparó totalmente. El bloqueo continúa sin garantía.
   El verificador ganó `--preparacao`, para consultar este indicador sin exigir
   configuración técnica anticipada. El resultado positivo todavía requiere
   revisión
   De las evidencias y no impide escribir por quién lo ignore. La suíte del
   script y
   Seletor pasó con 30 pruebas en macOS y 30 en Linux; en paquete local, una
   fixture con preparación completa y configuración pendiente ha pasado en el
   modo de
   preparación y bloqueo en el modo de implementación. Índice y archivo humano
   Se han conservado.
   En sesiones nativas con la candidata, la fixture sin estado permaneció
   intacta
   cuando se negó el shell; en la fixture con preparación completa y tecnología
   pendiente, el cliente creó la spec antes de consultar el estado o ejecutar el
   verificador. No hubo lectura observada de UX o diseño. El control encontró
   enlaces rotos y un comando no comprobado en la spec. El script consultivo no
   Es una barrera de escritura y el orden todavía no está garantizado.
   La instrucción de la skill no impide escribir por sí solo. Hooks varían por
   cliente;
   el [Copilot
   CLI](https://docs.github.com/en/copilot/reference/hooks-reference),
   Por ejemplo, un equipoout en el hook permite que la llamada siga al flujo
   normal
   El aislamiento y la aplicación controlada exigen proyecto y prueba
   propios; no hay bloqueo universal implementado.
   En una sesión de `criar-prd` la `0.0.21`, el cliente leyó el PRD existente,
   buscó el estado ausente, invocó `configurar-projeto` y no creó otro PRD.
   El controlador confirmó índice, cambios y árbol observados inalterados.
   La respuesta puso vacíos, pero no formuló ninguna pregunta ni nombró la skill
   de
   configuración. La prueba cubre solo ese bloqueo en una sesión macOS.
   En una sesión de `criar-ux-ui` la `0.0.21`, el cliente leyó la skill y un PRD
   En borrador y no creó UX sin estado de configuración. Indicó `criar-prd`,
   pero no consultó esa skill ni identificó la preparación como primera
   etapa. Índice, alteraciones y árbol observados quedaron iguales en la sesión,
   Después de que el init haya cambiado el exclude. La prueba cubre una sesión
   con shell y
   URLs negados, no la consistencia o el flujo completo.
   En aplicación manual posterior, un PRD y su aprobación ficticios orientaron
   la creación de UX sintética en borrador, con aprobación pendiente. El sync y
   el
   check de API pasaron con opciones explícitas; índice, config, diffs y
   archivos
   humanos comparados quedaron iguales. No hubo cliente nativo, interfaz,
   validación con usuarios o prueba de los estándares de la CLI.
   En la candidata, las skills de UX y diseño pasaron a exigir preparación
   terminada y comprobada antes de las etapas de producto y a preservar
   aprobaciones
   Sin cambio material. Una revisión independiente confirió la redacción. Un
   paquete local instaló las dos fuentes y pasó en `sync --check` una fixture
   con índice, `.gitignore` y archivo humano observados preservados. Las suítes
   de recursos y próximos pasos pasaron con 50 pruebas en macOS y 50 en Linux;
   No comprueban el comportamiento de las nuevas instrucciones en cliente
   nativo.
   En dos evaluaciones independientes por subagentes, en una fixture sintética
   con
   estado de preparación ausente y PRD En borrador, UX y diseño indicaron
   primero
   verificar la preparación y relataron no ejecutar scripts. El control registró
   igualdad de caminos y modos de 796 entradas y contenido de los archivos
   regulares, inclusive el índice Git. No hubo imposición de lectura por el SO;
   el control no comparó destinos de enlaces simbólicos, timestamps o metadatos
   extendidos, ni armazenou un snapshot final independiente.
   Las evaluaciones no comprueban el descubrimiento por clientes nativos ni la
   consistencia
   En otras sesiones o estados de proyecto.
   Un intento de `preparar-dev` la `0.0.21` leyó skill y documentos de
   fixture, pero expiró sin respuesta final; una llamada de shell fue negada.
   Índice y árbol observados quedaron iguales. La prueba ejecutada antes por
   controlador no se presentó al cliente; la prueba funcional sigue pendiente.
   En consulta separada a la fuente `preparar-dev` la `0.0.21`, un subagente
   identificó el runtime declarado y propuso la prueba existente sin ejecutarlo.
   Los archivos y modos observados permanecieron iguales, incluso índice y
   alteraciones humanas. La lectura de la fixture usó sandbox; el subagente y el
   El controlador no estaba completamente confinado. La fuente se conferida al
   tarball, pero no hubo instalación o cliente nativo en esa consulta.
   En aplicación manual posterior, inventario, diagnóstico y prueba de
   biblioteca
   Sin embargo, los archivos Git y humanos se compararon después de la
   instalación; el init anterior cambió el exclude. Setup, descargas y Docker
   No se probaron. O PATH restringido no demuestra ausencia de herramientas;
   El primer intento falló por parsing del controlador y fue repetido.
   En la candidata, `gerenciar-roadmap` Ha pasado a pedir sync solamente después
   del cambio de
   recurso agêntico. En fixture, un subagente actualizó un marcador de roadmap y
   informó no sincronizar; de los 798 caminos y modos observados, apenas el
   El contenido del roadmap cambió. El SO no impuso aislamiento al subagente, y
   no se
   compararon equiposstamps, atributos extendidos o destinos de enlaces. La
   primera
   evaluación usó Python puntualmente, contrariando la preferencia de Node; fue
   repetida con Node después de restaurar la fixture. Revisión independiente
   posterior
   comparó el resultado con el texto inicial reconstruido y validado por hash;
   confirmó solamente el cambio del marcador, sin comprobar el inventario o el
   aislamiento de la sesión. Un paquete local instaló la skill y pasó
   en `sync --check`; la suíte de recursos pasó con 17 tests en cada sistema,
   macOS y Linux. Esto no demuestra el descubrimiento de clientes nativos.
   En otra consulta a la fuente `criar-skill` la `0.0.21`, un subagente
   identificó
   Una skill humana existente y recomendó reutilizarla, sin crear otra.
   Los caminos, archivos y modos observados fueron iguales. La lectura de
   fixture
   usó sandbox, pero subagente y controlador no estaban integralmente
   confinados; no hubo instalación del paquete o prueba de descubrimiento
   nativo.
   En aplicación manual posterior, una skill sintética fue catalogada y generó
   dos apuntamientos; el check pasó y el catálogo externo fue solo listado,
   sin descarga. Los archivos Git y humanos comparados permanecieron iguales
   después
   la creación. El init anterior cambió `AGENTS.md` y el exclude, preservando el
   prefijo humano. No hubo cliente nativo o prueba de los defaults de sync.
   En consulta separada a `criar-agente` la `0.0.21`, un subagente recomendó
   preservar un perfil humano y aclarar requisitos. Los 45 caminos y modos
   observados, índice y archivos comparados permanecieron iguales. La lectura
   usó
   sandbox; subagente y controlador no estaban completamente confinados. No
   Hubo instalación, creación de perfil, sync o cliente nativo en esa consulta.
   En aplicación manual posterior, un perfil y metadados sintéticos fueron
   catalogados y generaron dos apuntamientos Antigravity y Gemini; el check pasó
   y los archivos Git y humanos comparados fueron iguales después de la
   creación.
   anterior alteró el exclude. Los YAMLs no comprueban el descubrimiento nativo
   o
   aplicación efectiva de permisos; sync usó opciones explícitas.
   Un intento separado de `criar-agente` También expiró después de leer la
   skill,
   Sin respuesta final o perfil creado. Índice y árbol observados quedaron
   iguales; ese equipoout no comprueba falla funcional ni concluye la
   validación.
   Un intento de `git-commit` sin red y sin credenciales personales terminó
   antes de la invocación de la skill por falta de autenticación. Un commit
   sintético
   ejecutado separadamente por el controlador no comprueba la actuación de la
   skill;
   La prueba nativa sigue pendiente.
   En prueba posterior, un subagente siguió la fuente `git-commit` la `0.0.21`
   y creó commit en fixture offline sin remoto y con identidad ficticia.
   blob correspondió a staged; alteración unstaged, archivo no rastreado y
   Los archivos Git observados fueron preservados. HEAD y el índice cambiaron
   por el commit.
   No hubo cliente nativo, push o prueba de firma e identidad real.
   En la aplicación manual de `git-pull` la `0.0.21`, la branch de una fixture
   avanzó por fast-forward a partir de remoto local en sandbox sin red. Blob y
   diff staged, diff unstaged, archivo no rastreado, `.gitignore`, configuración
   Git y exclude observados fueron preservados; HEAD y los bytes del índice
   cambiaron.
   A URL del remoto se conferida; la
   restricción al protocolo `file` No solo limita el camino accesible. No
   Hubo paquete instalado, cliente nativo o prueba de conflictos, merge,
   firma y todos los metadatos.
   En aplicación manual de `git-push` la `0.0.21`, una fixture sin red usó
   identidad y remoto local sintéticos. Después de un push de preparación, un
   push
   normal sin force actualizó el remoto al HEAD esperado. HEAD local, índice,
   contenido staged y unstaged y archivos Git y humanos observados permanecieron
   iguales. A URL local fue conferida; fueron usadas fuentes extraídas, sin
   instalación o cliente nativo. No prueba autenticación, protección de branch,
   divergencia, firma, metadatos generales o efectos transitorios.
   En consulta a la fuente `git-merge` la `0.0.21`, un subagente no ejecutó
   merge
   delante de la restricción de la fixture e indicó verificaciones Git
   pendientes. Los 63
   caminos y modos observados, índice y archivos comparados quedaron iguales. O
   controlador preparó branches y commits sintéticos antes del snapshot; a
   lectura usó sandbox, pero el subagente y el controlador no estaban totalmente
   confinados. No hubo paquete instalado o cliente nativo en esa consulta.
   En aplicación manual posterior, un fast-forward local sintético integró la
   branch esperada y la prueba pasó antes y después. Diffs staged y unstaged y
   los archivos humanos comparados permanecieron iguales; los bytes del índice
   cambiaron
   para reflejar el nuevo commit. Git y Node ejecutaron en sandbox macOS sin
   red, pero el controlador de fixture no. No hubo instalación o activación
   nativo, ni prueba de conflicto, firmas u otros metadatos.
   En la consulta a la fuente `modelar-ameacas` la `0.0.21`, un subagente
   identificó
   activos, fronteras y verificaciones prioritarias en documentación sintética,
   sin presumir controles implementados o fallos confirmados. Las 44 entradas
   y los archivos Git observados permanecieron iguales. La lectura fue
   confinada;
   controlador y subagente no estaban completamente confinados. No hubo
   cliente nativo, paquete instalado, auditor o flujo completo en esa prueba.
   Una aplicación manual posterior produjo modelo para una biblioteca
   sintética y ejecutó cuatro pruebas benignos; índice, config y archivos
   comparados permanecieron iguales. No hubo cliente nativo, auditor
   independiente
   o comprobación de seguridad general y de integraciones desconocidas.
   En consulta separada al perfil `auditor-seguranca`, un subagente examinó
   función sintética sin contexto y distinguió comportamiento observado de una
   vulnerabilidad no comprobada. Las 43 entradas y archivos Git observados
   permanecieron iguales. La lectura fue confinada, pero no el controlador y el
   subagente; no hubo ejecución, escáner, paquete instalado o activación nativa.
   Una sesión nativa Copilot invocó `revisar-autorizacao` la `0.0.21`
   instalada y examinó un archivo de acceso sintético. Indicó como no
   verificados servidor, identidad y autorización. El proyecto y el índice
   observados permanecieron iguales; la sesión fue estática, con shell y
   escritura
   Desbilitados, red de inferencia y autenticación permitida y subprocesos
   No auditados. No prueba el comportamiento de la API o la creación de un
   informe.
   Otra sesión nativa Copilot llamó `revisar-seguranca` la `0.0.21`
   instalada y leyó skill, reglas y código sintético. No apuntó hallazgo en
   trecho y registró ausencia de escáneres, pruebas y diff. Árbol, índice y
   Los cambios staged y unstaged observados fueron iguales. Shell, escritura y
   URL
   fueron negados, pero hubo delegación cuyos eventos internos no fueron
   auditados;
   la red de inferencia y autenticación fue permitida. Sin servidor, barrido
   dinámica o informe salvo, la prueba no demuestra la seguridad de una
   aplicación.
   En aplicación manual de `corrigir-vulnerabilidade` la `0.0.21`, una fixture
   sintética restringió los campos registrados: la prueba preparada por
   controlador falló antes y pasó después de la corrección. Archivos humanos y
   Git
   observados permanecieron iguales. Se usaron fuentes extraídas, sin instalar
   el paquete; no hubo cliente nativo, escáner o revisión independiente de la
   corrección. El flujo integral y la seguridad general no están comprobados.
   Una consulta al perfil `implementador` y skill `implementar-spec` la
   `0.0.21` indicó no iniciar código delante de la preparación pendiente, spec
   en
   borrador y plan informado como ausente. Las 51 entradas y los archivos Git
   observados permanecieron iguales. La lectura fue confinada, pero el subagente
   y el
   controlador no; no hubo cliente nativo, paquete instalado, implementación
   o inventario independiente del plan en la fixture.
   Una sesión nativa Copilot con el perfil `validador` la `0.0.21` leyó
   criterios,
   prueba y evidencia sintética; marcó un criterio como aprobado y otro como
   no verificado. La prueba fue ejecutada previamente por el controlador en otra
   fixture, cuyo código y prueba coinciden en hash con los de la sesión. Árbol y
   índice observado no cambiaron. Shell, escritura y URL estaban desabilitados;
   La autenticación y la red de inferencia estaban disponibles sin auditoría de
   los
   subprocesos. La sesión no comprueba ejecución propia o validación integral.
   En aplicación manual de `preparar-ferramentas` la `0.0.21` instalada en
   fixture offline, ayuda y `info opensrc` retornaron cero; `check opensrc`
   Volvió a fallar porque la herramienta estaba ausente. Las consultas no
   crearon
   la carpeta local del `opensrc` y preservaron árbol, índice y alteraciones
   staged y
   unstaged observados. La prueba no cubre setup, instalación, update, run o
   descubrimiento
   por cliente nativo; la instalación del paquete ocurrió antes del snapshot.
   Un subagente consultó `sincronizar-agentes` la `0.0.21` y propuso verificar
   la colisión antes de usar `--force`, sin ejecutar sync. En copia separada de
   fixture, el controlador ejecutó check y sync directo con Node 24: el check
   regresó divergencia y `--force` Se negó el índice divergente. Índice,
   ignores,
   configuración y archivos humanos comparados fueron iguales después de ambos
   órdenes. Un primer intento no alcanzó el sync por Node incompatible;
   otra fue bloqueada por el sandbox al acceder `/dev/null`La prueba no es una
   sesión nativa no cubre todos los archivos, metadatos u otros conflictos.
   En una sesión nativa anterior y separada de la misma skill, el cliente
   ejecutó
   check, sync sin `--force` y nuevo check; índice y archivos humanos observados
   Pero el sync ha cambiado, pero el sync ha cambiado. `.git/info/exclude`. La
   instalación
   de esa fixture ocurrió antes de la creación de Git; la prueba cubre apenas
   una
   sesión macOS y no detecta cambios transitorios revertidas.
   En una consulta de `proximos-passos` la `0.0.21`, el cliente indicó preparar
   el proyecto antes de retomar el proyecto PRD En borrador. No ejecutó la CLI;
   uno
   control separado recomendó `preparar-dev` para el entorno existente, sin
   que esa diferencia, aisladamente, comprovee error. Índice y árbol observados
   permanecieron iguales durante la sesión, después de que el init modificara el
   exclude.
   En aplicación manual posterior en una biblioteca Node sintética, `next
   --json`
   recomendó `preparar-dev` Y la prueba del proyecto pasó. La consulta preservó
   los archivos Git y humanos comparados; el init anterior preservó el índice y
   o `.gitignore`, pero alteró el exclude. No hubo cliente nativo o prueba de
   Otros estados de proyecto.
   En la candidata, la skill pasó a pedir un próximo paso concreto sin
   anticipar preguntas de producto. En otra sesión con el mismo PRD y solicitud,
   el cliente indicó concluir y registrar la configuración, sin alterar el árbol
   No formuló ninguna pregunta ni nombró a skill; el shell estaba negado.
   Un paquete local con el cambio ha instalado y ha pasado en `sync --check` una
   fixture Git. Las sesiones no prueban comportamiento consistente o causalidad.
   A CLI `next` Ahora también orienta la obtención de pruebas de aprobación en
   el momento de la aprobación.
   etapas de producto del flujo estándar y `run`; la selección de la etapa no
   cambió.
   La suite de próximos pasos pasó con 34 pruebas en macOS y 34 en Linux. Un
   paquete local confirmó la orientación en tres idiomas e intenciones en una
   fixture,
   preservando índice, `.gitignore` y un archivo humano comparados. Eso no hace
   La recomendación de una aprobación no demuestra el comportamiento de los
   clientes nativos.
   En otra sesión, `implementar-backend` la `0.0.21` Alteró una línea con
   edición unstaged para atender a una solicitud puntual y preservó el índice y
   el
   comentario humano observado. El cliente informó que no pudo consultar el
   Git ni probar; el controlador verificó dos ejemplos por separado. Como
   La solicitud no mencionaba spec, esa sesión no comprueba el gate de spec.
   En una sesión de `atualizar-documentacao` la `0.0.21`, el cliente ha
   conservado
   El texto existente y añadió el comando de prueba presente en el proyecto.
   El controlador ejecutó esa prueba antes de la sesión; el cliente no recibió
   la
   prueba y no ejecutó órdenes. Índice y demás caminos observados quedaron
   iguales durante la sesión, después de que el init haya cambiado el exclude de
   la fixture.
   En otra sesión de `implementar-backend`, la solicitud vinculaba la tarea a
   una
   spec en borrador. O
   cliente leyó la spec y la skill de `0.0.21`, pero alteró el archivo incluso
   sin
   aprobación de spec o plan observada. Preservó el índice y el comentario
   humano observado; la línea con edición unstaged cambió. El cliente informó
   que
   No pudo consultar a Git ni probar. Una sesión no comprueba determinismo.
   En una sesión de `implementar-backend` con la candidata y el mismo pedido,
   spec y contenido inicial, el cliente reconoció el bloqueo y no alteró la
   árbol o índice observados. Los históricos y kits de las fixtures difirieron;
   la sesión no prueba causalidad ni consistencia. La consulta por shell fue
   negada.
   En una sesión separada, `implementar-spec` la `0.0.21` También alteró una
   línea con edición unstaged después de leer una spec en borrador, sin
   aprobación o
   configuración comprobada. El índice y comentario humano permanecieron
   iguales,
   pero el diff unstaged cambió; la prueba no cubre consistencia entre sesiones.
   En una sesión con la candidata y los mismos datos principales, el cliente
   leyó la
   skill y spec, indicó `configurar-projeto` y no cambió el proyecto. La prueba
   cobre una sesión con shell negado, no un bloqueo técnico universal.
   En una consulta a `implementar-frontend` la `0.0.21`, el cliente leyó la spec
   e o HTML, recomendó pruebas de teclado y pantallas e informó que no ejecutó
   pruebas o navegador. Git y árbol observados quedaron iguales en la consulta;
   La instalación anterior añadió un bloque al exclude de la fixture.
   En una sesión de lectura con skill `revisar-codigo` publicada en `0.0.21`,
   el cliente identificó divergencia en un cálculo sintético; el controlador
   ejecutó la prueba por separado. La instalación anterior cambió el `exclude`
   local de la fixture, mientras que la sesión preservó el árbol observado.
   En otra sesión con la candidata local, `validar-adversarial` identificó que
   Una implementación sintética aceptaba valores negativos. El cliente informó
   que no ejecutó pruebas; el controlador confirmó el caso aisladamente en
   Linux. Son pruebas de una sesión por skill, no de sus flujos completos.
   Una sesión de la misma skill en `0.0.21` También identificó una entrada
   negativa sin la excepción exigida; el controlador ejecutó el caso por
   separado.
   El árbol y el índice observados fueron iguales durante la sesión, después de
   una
   instalación que alteró el exclude de la fixture.
   En aplicación manual separada de la `0.0.21`, una suítis sintética identificó
   El rechazo indebido de cero: tres casos pasaron y un falló como esperado
   por la hipótesis investigada. Git y Node rodaron en sandbox macOS sin red;
   índice, configuración y cambios observados permanecieron iguales. No hubo
   instalación, cliente nativo, revisión independiente o prueba de integración.
   En otra consulta, `usar-skills-externas` la `0.0.21` leyó la skill y el
   catálogo, orientando sobre origen, licencia y revisión fijada. La consulta
   Se ha conservado el árbol y el índice observado, pero no ha instalado skills
   externos.
   La instalación anterior también agregó un bloque al excluyer de la fixture.
   En una sesión de `verificar-trabalho` la `0.0.21`, el cliente informó que
   No ejecutó pruebas, pero marcó un criterio funcional como cumplido por
   inspección estática. El controlador confirmó ejemplos solo después de la
   sesión;
   El cliente no recibió esa prueba. Una versión candidata que prohibía
   intercambiar
   test exigido por inspección también recibió esa clasificación, inclusive
   Después de lectura explícita. La fixture no definió una prueba como exigido,
   entonces
   La contradicción con esa orientación no fue comprobada. La orientación ahora
   requiere ejecución para aprobar criterio comportamental. En otra sesión con
   lectura explícita, el cliente marcó como no verificado el criterio cuyo
   prueba no pudo ejecutar. Una sesión no comprueba descubrimiento o
   consistencia.
   Una consulta aislada a skill `git-fetch` la `0.0.21` no pasó de
   autenticación; skill no fue invocada y fetch no estaba autorizado en
   sesión. En otra sesión consultiva autenticada, el cliente invocó la skill y
   leyó su fuente; shell y fetch permanecieron desabilitados. El árbol y el Git
   observados no cambiaron durante la consulta, que no valida un fetch real.
   En aplicación manual de la skill extraída del paquete, un parche de remoto
   bare
   sintético avanzó la referencia esperada y preservó índice, árbol, HEAD,
   configuración y cambios observados. Git ejecutó en sandbox macOS con
   red negada y protocolo local; no hubo instalación o cliente nativo. O
   resumen fue sanitizado y no hay copia bruta separada de las advertencias;
   efectos
   No se han demostrado los transitorios y los metadados completos.
   Una sesión con `criar-regra` la `0.0.21` creó una regla sintética y mantuvo
   el árbol fuera del destino y Git observados. En una copia separada, el
   controlador ejecutó el sync de `0.0.21`: una regla con `trigger: manual`
   generó instrucción Copilot con `applyTo: '**'`. Esto solicita alcance global;
   La activación real en el editor no fue verificada. El agente no ejecutó sync.
   En la candidata local, el controlador sincronió la misma regla sin generar
   esa
   instrucción global; la referencia explícita mantuvo `trigger: manual` y el
   check
   final pasó con avisos de visibilidad. La activación nativa sigue sin prueba.
   En el router, la regla Git declara `model_decision`, pero la instrucción
   Copilot
   instalada declara `applyTo: '**'`. El archivo se ha mantenido mientras el
   origen y
   una migración segura son verificadas; su activación efectiva no fue
   observada.
   En fixture sintética, la `0.0.21` Recrinó el apuntamiento global después de
   su
   remoción. Con el apuntamiento ausente, el sync directo de la candidata generó
   una
   referencia explícita; la actualización rechazó dos catálogos en conflicto.
   Con el
   El apuntamiento global aún presente en otra fixture, el sync directo de
   la candidata lo eliminó y creó una referencia explícita; la actualización
   también
   Se negó los catálogos. Estos ensayos no prueban la migración en el router.
   En otra matriz sintética, el sync ha conservado un apuntamento global editado
   y
   También creó una referencia explícita; la activación global no fue observada.
   Tres updates rechazaron catálogos. La matriz paró en una colisión humana cuyo
   archivo ha recibido un bloque adicional; el texto anterior se ha observado
   como
   prefijo, pero no hubo comparación independiente de los demás bytes. El último
   update no se ha ejecutado. El código cero del controlador no indica
   aprobación.
   En una sesión con `criar-comando` la `0.0.21`, el comando creado describió
   Solo la línea JSON, omitiendo mensajes anteriores del ejecutor. La candidata
   Ha pasado a pedir una conferencia de salida completa. En otra sesión, la
   salida estándar
   se describió, pero se prohibieron opciones válidas antes del objetivo; la
   orientación
   Fue aclarada nuevamente. En una sesión posterior, la orden describió las
   posiciones y efectos observados sin esa prohibición, pero exigió npm para una
   llamada directa que no lo exige. La skill pasó a distinguir el selector del
   bootstrap y el blanco. En otra sesión, el comando distinguió correctamente
   los
   prerrequisitos y opciones; el controlador ejecutó el selector con Node y sin
   npm en el PATH. La consistencia entre sesiones todavía no se ha demostrado.
   La suíte del executor pasó con 29 pruebas
   en cada sistema observado, macOS y Linux. El primer intento Linux, con
   volumen solamente de lectura, falló por exigir directorio temporal y fue
   repetida con tmpfs.
   En una sesión de skill `executar-script` la `0.0.21`, el cliente consultó
   el plan y ejecutó un script sintético con dos argumentos literales; el
   resultado JSON Estaba correcto y el índice y las alteraciones observadas
   fueron
   preservados. La respuesta resumió la salida sin las líneas de metadados,
   aunque
   la solicitud no exigiera salida completa. No hubo bootstrap observado; a
   sesión no comprueba la instalación de runtime ni otros clientes.
   Una sesión de skill `git-diff` la `0.0.21` consultó y distinguió alteraciones
   staged y unstaged y un archivo no rastreado, preservando los archivos y el
   índice observado. La primera instalación de la fixture falló con diagnóstico
   Git localizado; la segunda pasó con locale `C`Dos consultas exitosas
   exhibieron advertencia del sandbox sobre ignore global; la prueba cubre una
   sesión.
   snapshot excluyó una carpeta de fixture y los eventos detallados no fueron
   archivados para revisión independiente. En una repetición con eventos
   privados
   archivados y snapshot sin exclusión de carpetas, el índice permaneció igual
   Durante la sesión, pero su hash difirió entre el inicio de los controles y el
   fin.
   La causa no fue comprobada; la preservación en toda la ventana sigue no
   verificada. En una fixture separada, `git diff --binary` Alteró la caché
   metadados en el índice mismo con `GIT_OPTIONAL_LOCKS=0`. Un índice temporal
   preservó los bytes del índice principal, pero una consulta con split-index
   cambió el mtime de `sharedindex`; no se comprobó preservación integral. Los
   Dos comportamientos fueron reproducidos en macOS y Linux en fixtures propias.
   Una sesión de skill `git-log` la `0.0.21` leyó el historial de dos commits
   sintéticos. Cliente y controlador usaron índice temporal, y el índice real
   De la fixture se mantuvo igual entre los hashes de inicio y fin. La prueba
   cubre una
   sesión macOS; no comprueba el método para split-index o linked worktrees.
   Una sesión `git-status` distinguió branch, upstream, staged, unstaged y
   Archivo no rastreado; índice y árbol observados permanecieron iguales. O
   aislamiento de shell permitió también consultas Git benignas en órdenes
   compuestos, además del `status` La sesión no prueba split-index o
   worktrees vinculadas.
   Otra sesión nativa leyó la skill extraída de la `0.0.21` y ejecutó status en
   fixture con staged, unstaged, archivo no rastreado y upstream un commit a
   frente. El controlador confirmó la respuesta y los snapshots persistentes;
   Las advertencias de acceso al ignore global fueron producidas por el sandbox.
   No hubo
   instalación del paquete, prueba de efectos transitorios u otros clientes.
   En otra fixture, `copilot skill list --json` skill `git-status`
   extraída de `0.0.21` como recurso del proyecto; un directorio vacío no a
   Ha preparado. La orden ha rodo sin autenticación, red o acceso a datos
   personales y
   preservó árbol y Git observados. La skill fue copiada directamente, sin
   instalar el adaptador; el listado no comprueba invocación o obediencia.
   Una segunda fixture confirmó el descubrimiento de `git-fetch` por el mismo
   comando, también con control vacío y skill copiada directamente de `0.0.21`.
   El árbol y Git observados permanecieron iguales; la prueba no ejecutó fetch.
   Otra fixture ha instalado una copia local extraída de la `0.0.21` con el
   cliente
   Copilot seleccionado. El listado nativo, en sandbox sin red y sin escritura
   en la fixture, presentó 41 nombres únicos de proyecto, iguales a los 41
   nombres de los
   apuntamientos y de las fuentes en el índice de skills; el control vacío
   presentó
   cero skills de proyecto. Índice, configuración, exclude y gitignore
   Durante la lista de reproducción, la prueba no compara la lista.
   camino retornado de cada ítem, ni comprueba invocación, lectura del origen,
   activación o ejecución de los flujos; la instalación ocurrió antes del
   sandbox.
   Una repetición verificó los 41 caminos retornados, las referencias hasta las
   fuentes, sus bytes contra la copia extraída y los hashes del estado
   instalado.
   El árbol de archivos y modos observados y los cuatro archivos Git comparados
   permanecieron iguales durante el listado. No se verificaron la integridad
   integral de la copia extraída en esta repetición; el descubrimiento no
   demuestra
   lectura de las fuentes por el cliente o ejecución de las skills.
   No `talquee-ai-router`, un listado nativo aislado y sin red encontró
   los 41 caminos y apuntamientos esperados del índice instalado. También listou
   15 entradas de `.claude/commands` como skills de proyecto; no fueron
   modificadas o clasificadas en cuanto a la autoría. El sandbox negó escritura
   en
   proyecto, e índice, configuración, exclude y gitignore comparados quedaron
   iguales. La verificación no ejecutó skills ni comparó todo el árbol.
   Una inspección posterior encontró 18 archivos Markdown en `.claude/commands`,
   todos con nombre y referencia compatibles con el catálogo y hash igual al
   estado instalado. Tres comparten nombres con skills; el listado nativo
   mostró cada nombre una vez, en el camino de la skill, y los tres comandos
   orientan
   usar las skills correspondientes. Los demás 15 fueron listados a partir del
   directorio de órdenes. El estado no comprueba autoría ni comportamiento de
   invocación; no se concluye que los tres comandos sean accesibles en el
   cliente.
   Una consulta `git-worktree` la `0.0.21` ha preparado la única worktree
   sintética;
   el controlador confirmó el resultado y preservación del árbol e índice
   observados. La prueba no ejecutó la creación o la remoción de worktree.
   En aplicación manual posterior, una worktree y branch sintéticas fueron
   creadas en el commit esperado, con prueba Node aprobado. Índice, HEAD, config
   y
   diffs observados del árbol principal quedaron iguales; refs y metadados Git
   cambiaron por la creación. Git y Node rodaron en sandbox macOS sin red; no
   Hubo instalación, activación nativa, remoción o prueba de split-index.
   En una sesión `git-branch` la `0.0.21`, el cliente creó una branch sintética
   en el commit actual sin checkout. El control confirmó el índice, HEAD,
   cambios
   y archivos observados conservados fuera de la nueva referencia y su reflog. A
   prueba no cobre intercambio de branch, split-index o worktrees vinculados; o
   init
   anterior alteró el exclude de la fixture.
10. [-] **Sincronización:** reconocer referencias legadas estrictas sin asumir
    propiedad ni sobrescribirlas, manteniendo la alerta de alcance no
    verificado. En el checkout del kit, el check pasó de nueve a cuatro
    conflictos; los cuatro restantes y los archivos desactualizados todavía
    necesitan revisión. En la fixture de migración de la `0.0.21`, sync antiguo
    regneró catálogos sin actualizar los hashes históricos; el update candidato
    rechazó la divergencia. En otra fixture macOS, un campo humano extra en el
    catálogo causó rechazo y fue preservado junto a los archivos Git y humanos
    comparados. El control sin ese campo concluyó la actualización, preservó
    Git, README y regla humana y actualizó el catálogo y el estado. Los
    snapshots comenzaron después del init/sync antiguos; no comprueban su
    preservación, el árbol completo, metadados, sync posterior u otras
    plataformas. Una variante en laboratorio preservó el campo literal y la
    regla propia en una fixture, sin registrar el catálogo mixto como
    gestionado. Sync y nuevo update retornaron cero, pero los checks
    permanecieron no saludables por el marcador legado en exclude y avisos de
    cobertura. La variante depende de
    origem histórica externa ao pacote e não comprova inventário completo ou
    autoria; permanece fora do produto.
    Uma cópia posterior incluiu a compatibilidade histórica no pacote e foi
    exercitada em fixtures no macOS e Linux; os checks continuaram com status 1.
    A instrumentação encontrou numa fixture mínima uma consulta da raiz que o
    inventário não registrava. Uma guarda experimental restrita passou controles
    locais, sem comprovar cobertura completa, metadados ou Windows. Não foi
    integrada, e não houve perda de dados demonstrada por essa omissão.
    Um classificador experimental aceita casos ambíguos e permanece fora do
    produto; não há ainda reconciliação comprovada de dados humanos e mudanças
    concorrentes.
    A revisão de um protótipo também reproduziu perda de precisão em números
    humanos e falha na detecção de remoção staged; variantes posteriores seguem
    em laboratório e não substituem as verificações reais do instalador.
    Um modelo posterior preservou bytes fora do campo alterado nos controles,
    mas ainda depende de propriedade e staged informados pelo chamador; não
    foi integrado ao sync ou ao instalador.
    Um protótipo para campos humanos extras na raiz funcionou em sync da mesma
    versão, mas uma fixture de atualização da `0.0.21` apresentou diferenças
    nos grupos gerados de regras e scripts. O planner conservou dois conflitos;
    esse protótipo não resolve a migração e permanece fora do produto.
    Em outra fixture da `0.0.21`, o planner recusou um catálogo com versões
    staged e unstaged distintas; os arquivos e o índice observados permaneceram
    iguais. O teste não aplicou a atualização nem cobriu concorrência.
    Um protótipo posterior aplicou a migração em fixture sintética preservando
    dados humanos e Git observados; após ajuste adicional, o check da CLI ainda
    ficou não saudável pelo marcador legado no `info/exclude`. A cobertura de
    artefatos também gerou aviso não bloqueante. Os controles de
    staged divergente, campo gerado alterado, estado derivado divergente e
    alteração após o plano foram recusados. Falta revisão independente, prova
    de metadados e concorrência; o protótipo usa origem temporária e não é
    distribuível nem foi integrado ao produto.
    Uma revisão independente reproduziu no protótipo uma dependência de
    catálogo omitida do plano: um asset já coincidente foi editado após o
    planejamento e a aplicação prosseguiu. A edição humana foi preservada,
    mas o catálogo passou a referenciar o asset sem revalidá-lo. A guarda
    experimental passou a incluir esse asset como dependência: uma repetição
    independente recusou a edição posterior com `E_CHANGED`, preservando seus
    bytes e o índice observados. Outros insumos, atomicidade e metadados ainda
    não estão comprovados; a solução permanece fora do produto.
    Outro controle editou uma regra humana após o plano: a aplicação preservou o
    arquivo, mas publicou no catálogo sua descrição anterior. Assim, a guarda
    experimental ainda não cobre todas as fontes do catálogo.
    Um inventário experimental mais amplo detectou alterações sequenciais, mas
    não incluiu uma regra staged ausente do working tree: o plano continuou
    aplicável. O teste preservou o índice e não aplicou o plano. A revisão
    também identificou leitura de pastas irrelevantes e possíveis bloqueios por
    arquivos grandes; o inventário precisa de escopo e cobertura mais precisos.
    Uma guarda staged ampla demais também bloqueou uma fixture por arquivo em
    pasta humana irrelevante ao catálogo; índice e blob foram preservados.
    Mesmo após reduzir o escopo, um arquivo grande ignorado pelo builder na
    raiz de ferramentas continuou provocando bloqueio no protótipo.
    Uma revisão posterior evitou esses dois bloqueios nas fixtures anteriores e
    recusou a fonte staged ausente; os controles passaram no macOS e no Linux.
    Outra fixture ainda mostrou falso `E_STAGED` para arquivo regular irrelevante
    na raiz de ferramentas. A captura não comprova atomicidade nem Windows;
    a variante continua isolada.
    Em variante posterior, os controles recusaram fontes catalogáveis staged e
    ausentes e permitiram o arquivo irrelevante; seis testes passaram em cada
    sistema, macOS e Linux. O update sintético preservou os dados observados,
    mas o check continuou não saudável pelos avisos Git. A leitura de assets
    ainda é mais ampla que a necessária, e propriedade, metadados, concorrência
    e cobertura completa das fontes permanecem sem prova suficiente.
    Outra variante inventariou um asset grande sem ler seu conteúdo nos
    controles, mas o plano de update dessa fixture permaneceu bloqueado por
    conflitos de catálogos. Índice e arquivos comparados ficaram iguais; a
    prova positiva cobre somente o inventário, não a migração. Alguns assets
    podem ser lidos por outras etapas mesmo quando o catálogo só lista o nome;
    essas dependências também precisam ser comprovadas antes da integração.
    Em variante posterior, um update sintético com asset grande já registrado
    e staged preservou índice, blob e bytes comparados; a instrumentação observou
    duas leituras do asset pelo planejamento. Um asset novo ainda gerou conflito,
    e o check continuou não saudável por avisos Git. A solução segue isolada.
    Uma nova cópia completou update, sync, check e novo update sem alterações
    na fixture preparada; também recusou a alteração de um sidecar após o plano.
    Os ignores dessa fixture foram preparados antes dos snapshots, e um aviso
    geral permaneceu. A captura de leituras ainda é parcial; não comprova todos
    os consumidores, concorrência ou metadados e não foi integrada ao produto.
    Revisão independente encontrou regressão no diff experimental: sua cópia
    reverte a correção recente de diagnóstico de limpeza. Também observou que
    o asset lido não consta como dependência verificada no ciclo positivo;
    portanto o diff não pode ser aplicado integralmente.
    Em outro controle da cópia experimental, um template alterado após o plano
    de update repetido permaneceu intacto, mas o catálogo reteve a descrição
    anterior. A dependência desse fluxo ainda precisa ser revalidada.
    Uma variante posterior passou em 16 controles no macOS e 16 no Linux,
    incluindo recusa da edição posterior do template e um ciclo positivo de
    update e sync com asset novo em fixture preparada. A coleta de leituras
    ainda é incompleta, o inventário é conservador e não há prova de Windows,
    concorrência ou preservação de ACL e xattr. Continua fora do produto.
    No teste de staged igual ao working tree e diferente de HEAD, em macOS e
    Linux, a aplicação experimental preservou índice, refs, diff staged, blobs
    staged e trechos humanos observados;
    a inclusão de conteúdo do kit alterou o catálogo no working tree, criando
    uma diferença unstaged. O check da CLI continuou com aviso bloqueante.
    Na cópia diagnóstica, o identificador do bloco legado não correspondia ao
    caminho atual. Retirar o marcador apenas naquela cópia eliminou o aviso,
    mas não demonstrou propriedade nem autorizou remover regras existentes.
    Em uma fixture com estado fabricado, registrar como gerenciado o hash de um
    catálogo com campo humano permitiu ao sync removê-lo. Isso demonstra o risco
    de adotar o arquivo inteiro, não que a migração atual faça essa adoção.
    Em fixture sintética, o gerador e as fontes `0.0.21` reconstruíram os dois
    hashes históricos de `catalog.json` e `rules.json`. Isso não comprovou a
    propriedade das alterações posteriores. Uma variante de planejamento
    evitou adotar `rules.json` idêntico, inclusive com staged divergente, mas
    manteve o conflito do catálogo principal. Em outra fixture preparada para
    igualdade dos catálogos, update e sync foram aplicados preservando os
    arquivos e o índice observados; uma edição após o plano foi recusada. A
    variante não reconcilia catálogos divergentes nem prova metadados ou
    atomicidade e permanece fora do produto. A revisão independente identificou
    que a classificação precisa considerar também a propriedade registrada em
    `derived.catalogs` e o estado anterior divergente; a prova não cobre toda
    a árvore, `sync --check` ou sync direto. Controles adicionais confirmaram
    que registros derivados podem continuar presentes e que o protótipo pode
    descartar hashes históricos do estado principal. Nenhum catálogo foi
    apagado nesses controles, mas a perda de referência impede a integração.

En la revisión de la pipeline, tres suítes ausentes fueron clasificadas. La
validación de la clasificación y los 32 tests de la pipeline pasaron en macOS.
En Linux con `attr` e `acl`, diez pruebas de metadados pasaron; el escenario sin
`getfattr` se ejecuta en un entorno separado. En la matriz completa Linux, la
ausencia de estas herramientas ahora reproba las pruebas obligatorias.
Permanecen pendientes la actualización de referencia CRLF con registro anterior
divergente y la protección completa de atributos que no puedan ser
inspeccionados. Una ejecución posterior encontró una prueba de workflow
incompatible con la variable de metadatos añadida al paso de CI. La prueba fue
corregida para verificar `NODE_OPTIONS`, activación estricta en Linux y
instalación de `attr` e `acl`Las tres suítes de release pasaron con 99 pruebas
en macOS y Linux ARM64; la verificación adicional del paso también pasó en los
dos sistemas. Esto no comprueba la ejecución en Windows o el resultado remoto de
la pipeline. Una fixture adicional confirmó en macOS y Linux que convertir CRLF
antes o después del `git add` produce los mismos bytes del archivo, blob
normalizado en
índice y hash derivado. Esos datos aislados no prueban el origen de la
alteración; la actualización automática continúa bloqueada hasta que haya una
solución que preserve ediciones humanas y metadados. La revisión independiente
no fue ejecutada porque el ambiente rechazó la creación del subagente. En una
fixture Git aislada con la versión npm `0.0.21`, un cliente Codex real leyó el
apuntamiento de la skill `git-status` y su origen; identificó correctamente un
archivo preparado y modificado nuevamente y un archivo no rastreado. El índice,
la configuración y las exclusiones Git conservaron sus hashes. Es una prueba de
una skill y un cliente, no de los demás recursos o de la compatibilidad
integral. En una fixture Claude aislada, una consulta en modo de planificación y
con herramientas de escritura y shell desabilitadas recibió el camino de la
skill `criar-prd` e identificó preparación y datos de producto pendientes. La
fuente indicada coincide en hash con la `0.0.21`; índice, configuración,
exclusiones, ignore y código humano observados mantuvieron sus hashes. La salida
registra la lectura declarada, pero no proporciona aquí una ruta independiente
de herramientas;
Ella no comprueba el descubrimiento automático ni la creación completa del PRD.
En una segunda consulta, el cliente acionó `criar-prd` por el nombre. La ruta
registró la carga del apuntamento en `.claude/skills` y la lectura del origen
compartido; el estado de configuración estaba ausente y la respuesta indicó la
preparación como próxima etapa. Escritura y shell estaban desabilitados, y los
mismos archivos Git y humanos observados mantuvieron sus hashes. Esa prueba
cubre una skill y una selección, no los demás recursos o creación de PRD. En
instalación nueva `0.0.21` con Gemini CLI 0.67.0, `gemini skills list --all` en
perfil aislado no preparó las skills locales sin confianza en la carpeta. Con
confianza sólo para el proceso de la fixture, preparó los 41 apuntamientos en
`.gemini/skills` como habilitados; los 426 archivos observados del proyecto
mantuvieron sus hashes. El listado comprueba el descubrimiento, no ejecución de
las skills o persistencia de confianza. El requisito y la inspección de la
ubicación fueron documentados con referencia oficial. En OpenCode 2.2.6 aislado,
sin red y con el proyecto montado solamente para lectura, el cliente preparó los
11 perfiles del kit. La configuración retornada para
el revisor negó `edit`, `shell` e `subagent`; esto no prueba la aplicación de
estos permisos. Después de inicializar un servidor privado, la API listoó los 41
apuntamientos de skills de la fixture. Tres consultas aisladas inmediatas
volvieron vacías; un control propio también quedó ausente en la consulta
inmediata, pero fue encontrado en el servidor ya inicializado. Ese contraste no
determina solo la causa. Los 425 archivos observados permanecieron iguales, sin
carpeta de loop en la fixture; ningún contenedor de prueba permaneció activo. No
hubo ejecución de las skills, conexión al servicio compartido o validación del
cliente instalado en la máquina del usuario. En otra fixture, el cliente acionó
por el nombre `revisar-autorizacao`, `revisar-seguranca` e `planejar-qa` la
`0.0.21`. Las tres respuestas apuntaron una falla sintética de acceso entre
usuarios; un control externo reprodujo el comportamiento. Las sesiones de
revisión no ejecutaron pruebas, conforme solicitado. La respuesta de
autorización salió en inglés y clasificó el caso como crítico sin comprobar
exposición real. La candidata pasó a orientar idioma y distinción entre impacto
comprobado y potencial; en una repetición, la respuesta salió en portugués y
informó ausencia de ruta comprobada, pero todavía atribuyó gravedad alta al
código. Los hashes Git y humanos observados no cambiaron; ese resultado no
prueba calibración determinística ni auditoría completa de una aplicación. En la
misma fixture, el cliente también acionó `avaliar-arquitetura`,
`avaliar-performance` e `validar-adversarial` la `0.0.21`. Las respuestas
identificaron la divergencia del contrato; performance quedó no verificada, pero
la respuesta todavía calificó el costo sin medirlo. La revisión adversarial
atribuyó impacto crítico antes de comprobar uso o exposición. En las fuentes
candidatas, las dos orientaciones fueron reforzadas; una repetición no calificó
el costo sin medir y presentó el impacto de seguridad como condicional. Los
archivos observados mantuvieron sus hashes. Es una muestra puntual, no una
medición de performance o una auditoría completa. En una fixture sintética, la
skill `corrigir-vulnerabilidade` la `0.0.21` corrigió una falla de acceso:
antes, dos de tres pruebas fallaban; después, los tres pasaron y los archivos
Git y humanos observados mantuvieron sus hashes. La sesión registró una revisión
independiente y gate final pendientes; una prueba
adicional de propiedades que lanzan excepciones quedó fuera del código de
prueba. La candidata pasó a exigir una prueba versionable para escenarios
adicionales corregidos. En otra fixture con el escenario explicitado en la
solicitud, la sesión incluyó la prueba: falló contra el código original y los
cuatro test pasaron después de la corrección. Índice y archivos observados
permanecieron iguales; revisión independiente y gate siguieron pendientes. Las
fixtures son híbridas y no prueban una instalación íntegramente publicada o un
flujo completo de producción. En la misma fixture, el cliente descubrió por el
nombre las skills de diseño y spec de la `0.0.21`, pero ambas sugirieron PRD
antes de la preparación no comprobada. La sesión de roadmap alcanzó el límite de
turnos. En una copia con sólo las tres fuentes candidatas, las tres consultas
indicaron `configurar-projeto` primero; esto no prueba una actualización
completa o comportamiento determinístico. En la consulta de roadmap, el cliente
intentó escribir un plan, pero la herramienta estaba desabilitada; los archivos
Git y humanos observados mantuvieron sus hashes. Una repetición después de
orientar el uso de la selección salva identificó `claude`, pero
También pidió confirmación de clientes y idioma; la instrucción fue reforzada y
en otra consulta identificó los valores salvados sin pedir confirmación. Los
mismos datos Git y humanos observados permanecieron iguales. Es una prueba
puntual, sin garantizar que respuestas futuras sean idénticas. Tres sesiones
independientes también consultaron explícitamente `git-log`, `git-branch` e
`git-worktree` la `0.0.21` en una fixture con branch `trunk` y cambio staged.
Los resultados coincidieron con las consultas Git de conferencia; los hashes del
índice, configuración, exclusiones, HEAD y dos archivos observados permanecieron
iguales. Las consultas no comprueban la creación o el intercambio de
branch/worktree, descubrimiento automático de skills, ni ausencia de cambios
transitorios en otros archivos. En dos copias desechables con alteración staged,
sesiones `workspace-write` Intentaron crear una branch y una worktree usando las
skills de `0.0.21`. Ambas fueron impedidas por el sandbox de crear el lock
obligatorio en `.git`; ninguna branch o worktree fue creada. Índice,
configuración, exclusiones y los dos archivos observados mantuvieron sus hashes.
Estos intentos no comprueban el
El flujo de creación exitoso no justifican eludir la protección del medio
ambiente. En tres sesiones adicionales, `criar-agente`, `criar-comando` e
`criar-regra` la `0.0.21` recibieron solicitudes sin contrato definido y
solicitaron decisiones antes de la creación. Los mismos hashes observados
permanecieron iguales. La prueba cubre sólo la consulta inicial, no la creación,
sincronización o descubrimiento. En otra fixture, una sesión creó una regla
`model_decision` y actualizó el índice. La sesión usó Node 22 y no consiguió
sincronizar: el kit exige Node 24+. En una copia de la fixture, la
sincronización directa con Node 26 generó apuntamientos para `.agents` e
`.codex`, e `--check` y la validación nativa de fuentes pasaron. Índice,
configuración, exclusiones y archivos humanos observados mantuvieron sus hashes
en la copia; no se comprobó activación nativa ni sincronización por el agente.
En la repetición con Node 26 explícito, el agente creó el origen e intentó la
sincronización, pero el sandbox rechazó escrita en `.agents` com `EPERM`. O
`--check` registró dos derivaciones y cuatro índices pendientes. Los hashes de
los datos Git y archivos humanos observados permanecieron iguales; catálogos y
estado comparados también permanecieron iguales. La prueba permanece incompleta.
La candidata pasó a orientar la selección de Node 24+ ya instalada antes de
solicitar instalación. Una prueba con Node 22 confirmó el mensaje revisado; las
pruebas de requisito pasaron en macOS y Linux ARM64. La orientación no busca
automáticamente otras versiones en PATH y no elimina los límites del sandbox. En
la candidata, las skills de comando y regla fueron ajustadas para indicar que el
manifiesto es generado y no debe ser editado manualmente. La suíte de
adaptadores pasó en macOS y Linux; no ejecuta las skills en clientes nativos. La
verificación de fuentes también pasó en Linux ARM64 con Node 24
`markdownlint-cli2` instalado en áreas temporales de contêiner: 252 archivos,
sin errores. El checkout fue montado solamente para lectura; no es prueba en
Windows o Linux x64. La suíte de distribución de la candidata local pasó en
macOS y Linux ARM64: empacó una copia filtrada, instaló el tarball offline y
exercitou `npx`, proyecto nuevo, proyecto existente, actualización y denegación
de destino simbólico. Ella no comprueba el paquete publicado, todos los
proyectos existentes o Windows.
Una matriz adicional en Linux ARM64 usó el tarball de la candidata `0.0.30` en
80 proyectos sintéticos, con cuatro procesos y sin red. Registroó 60 casos
verificados, ninguno con falla y 20 no verificados: 12 por alcance Claude y ocho
por metadados Cursor. En los 80, los archivos humanos y datos Git observados
permanecieron preservados; la procedencia observada permaneció estable. El
resultado general fue `not-verified`, sin comprobar la ejecución de clientes o
skills, metadatos del sistema, todos los cambios transitorios o paquete
publicado. Otra matriz en Linux ARM64 y Node 24 usó un nuevo tarball local de la
candidata `0.0.30`, SHA-256
`c0b79afaf619ce62c97aaa4de04f8f4790c9d80ca336d84bbe49b993489ee5c0`, en 1.000
proyectos sintéticos: 500 nuevos y 500 existentes. Registro 676 casos
verificados, 324 no verificados y ninguna falla clasificada. Los 1.000 Los
informes indicaron preservación de los archivos humanos, referencias y datos Git
observados. La procedencia monitorizada permaneció estable y los archivos del
tarball conferidos al final coincidieron con la copia extraída. Los no
verificados incluyen 208 casos con alcance Claude y 132 con metadados Cursor,
con 16 casos
en ambos grupos. La prueba no ejecuta skills o clientes nativos, no cubre
Windows, metadatos completos ni cambios transitorios, y no valida el paquete
publicado. Los informes individuales permanecen en almacenamiento temporal. Una
matriz adicional en Linux ARM64 y Node 24 testó las rondas 26 a 38 con otro
tarball local de la candidata `0.0.30`, SHA-256
`87762b5741e8938c70a08b9947fc4d233cff45f9fd8f9f3bba0d70d7f127ab53`, sin red
externa. Fueron 520 proyectos sintéticos, mitad nuevos y mitad existentes: 376
verificados estructuralmente, 144 no verificados y ninguna falla clasificada.
Los 520 informes registraron preservación de los caminos humanos y Git
observados. Entre los inconclusivos, 84 incluyeron alcance Cursor y 68 alcance
Claude, con ocho en ambos. La procedencia monitorizada pasó; 687 entradas del
paquete extraído coincidieron en tipo, modo y contenido con el tarball antes y
después de la matriz. El tarball precede ajustes posteriores en las skills de
roadmap y backend. La prueba no valida el paquete publicado, ejecución nativa de
skills o clientes, Windows, todos los metadatos o alteraciones transitorias. Los
informes
individuales y sus fixtures permanecen en almacenamiento temporal. En la misma
fixture, dos sesiones independientes en paralelo ejecutaron la skill `git-diff`
y la lectura explícita del perfil `revisor`. La primera distinguió las líneas
preparadas de las no preparadas; la segunda identificó una subtración que
contrariaba el contrato de suma, con archivos, línea y ejemplo. Los hashes de
los archivos de la fixture, índice y configuración Git permanecieron iguales. La
llamada explícita del perfil no comprueba su descubrimiento o delegación nativa.
Otras dos sesiones probaron `criar-prd` sin datos de producto y
`implementar-spec` con formato e autorización indefinidos. Ambas solicitaron
informaciones e indicaron prerrequisitos ausentes sin escribir en la fixture;
los hashes observados del índice, configuración y spec permanecieron iguales. La
prueba cubre solamente la etapa inicial, sin aprobación o implementación
completa. En otra fixture sintética con el paquete publicado `0.0.21`, el
cliente de la ruta `.claude` Descubrió e invocó `criar-prd`, leyó la fuente, el
modelo y el estado y creó un PRD en borrador. Los requisitos informados y nueve
dudas aparecieron;
o README recibió un aumento manteniendo el texto humano. Índice, configuración,
exclusiones, `.gitignore` y estado observados después de la instalación no
cambiaron. Controles con archivos sintéticos fuera de la fixture confirmaron la
negativa de las herramientas de lectura y escritura; shell y MCP No estaban
disponibles. Sesiones posteriores respondieron a las dudas y mantuvieron el PRD
en borrador hasta una aprobación explícita simulada. Después de ella, el PRD se
ha marcado como aprobado, README actualizado y un roadmap creado en borrador.
Otras dudas surgieron en rondas posteriores, y un criterio de aceptación
necesitó ser añadido. Los mismos archivos Git y el estado observados
permanecieron iguales en esas sesiones. No hubo revisión independiente,
ejecución de scripts de inventario y sincronización ni pruebas de aplicación. La
prueba no comparó el `info/exclude` Antes y después de la instalación y no
demuestra la ausencia de cambios transitorios. En una nueva fixture sintética,
la skill candidata añadió la orientación de agrupar dudas y criterios de
aceptación. Una sesión nativa presentó 17 grupos de preguntas en una ronda y
mantuvo el PRD en borrador; README observado
continuó con el texto humano. La fixture combinó la instalación publicada con
esa única skill candidata. No hubo control comparativo equivalente, nuevas
respuestas, aprobación, revisión independiente o ejecución de los scripts; el
resultado no garantiza que todas las dudas aparezcan en la primera ronda. En la
misma fixture sintética con PRD aprobado por solicitud simulada, una sesión
nativa invocó `criar-spec` la `0.0.21` y rechazó crear la spec por ausencia de
UX/UI y diseño aprobados. Los hashes observados de Git, README, PRD, roadmap y
estado permanecieron iguales; ninguna escritura fue registrada en la sesión. La
respuesta trató la preparación como terminada con base en el estado declarado,
sin demostrar sus evidencias, y propuso preguntas de etapas futuras. No hubo
inventario por script ni prueba de la creación de una spec válida. En copia de
la fixture, la fuente candidata de `criar-spec` Fue activada entivamente: trató
la preparación como no comprobada, informó que no podía ejecutar la verificación
obligatoria, no anticipó preguntas de producto y no escribió la spec. Los hashes
observados de los mismos archivos y de la fuente candidata coincidieron
antes y después. La solicitud mencionó la falta de evidencias adicionales y no
fue idéntica al de la sesión anterior; la prueba no demuestra que el script
funcionaría ni el comportamiento de la skill con preparación válida. En otra
copia de la fixture con PRD aprobado por solicitud simulada, skill `criar-ux-ui`
la `0.0.21` Fue invocada entivamente y creó un documento en borrador con 14
dudas agrupadas. El archivo distingue propuestas de decisiones aprobadas. Git,
PRD, roadmap, estado y fuente observados mantuvieron los hashes; el README
observado permaneció igual. La sesión no tenía shell o revisor y apuntó que
README, roadmap y estado todavía no reflejaron el nuevo documento. No hubo
respuestas, aprobación de UX/UI o flujo completo; la preparación fue declarada
en la fixture, pero no comprobada por script. Una sesión posterior respondió a
las 14 dudas sintéticas, actualizó apenas el borrador de UX/UI y agrupoó nueve
preguntas adicionales, incluso posibles conflictos con el PRD. Los hashes
observados de Git, README, PRD, roadmap y estado permanecieron iguales. La
aprobación y la revisión independiente continúan pendientes; la sesión no
demuestra ejecución de herramientas o flujo completo.
En copia anterior a la creación de UX/UI, la fuente candidata de esta skill
identificó la preparación declarada sin evidencias, suspendió el trabajo y no
hizo preguntas de UX. Los archivos y el índice observados mantuvieron los
hashes, y no surgió el documento de UX/UI. La solicitud explicitó la ausencia de
evidencias adicionales; sin shell o revisión independiente, la prueba no
comprueba el flujo positivo de la candidata ni su actuación en otros contextos.
En una fixture de autorización con defecto intencional, tres sesiones en
paralelo consultaron `revisar-autorizacao`, `revisar-seguranca` e `planejar-qa`.
Las dos revisiones identificaron acceso de no propietario; la revisión de
seguridad también observó igualdad indebida entre identificadores ausentes. QA
propuso casos negativos. Los hashes observados del archivo y de datos Git no
cambiaron. Son pruebas puntuales, sin demostrar escáneres, correcciones o flujos
completos. En tres copias sintéticas con fuentes idénticas a las de la `0.0.21`,
sesiones nativas activaron `avaliar-arquitetura`, `planejar-qa` e
`avaliar-performance` sin herramientas de escritura. Los hashes observados de
archivos y datos Git no
cambiaron. Arquitectura apuntó conflicto entre escenario y PRD; performance
informó que p95 no estaba medido. QA propuso pruebas sin alegar ejecución, pero
no registró el conflicto. La fuente candidata de QA pasó a pedir esa
conferencia; en otra sesión nativa con el mismo pedido y fixture, ella
identificó el conflicto y distinguió criterios derivados de decisiones
aprobadas. Los hashes observados permanecieron iguales. Una repetición no prueba
determinismo; los tres flujos completos continúan pendientes. Las sesiones
fueron procesos independientes, no subagentes. En una fixture positiva con
documentos, spec y plan aprobados por solicitante sintético,
`implementar-backend` la `0.0.21` criou uma API en memoria y pruebas HTTP Sin
alterar los caminos Git y documentos observados. Nueve pruebas generadas pasaron
en contenedores Linux sin red externa. Una prueba adicional con título no vacío
por encima de 64 KiB falló: la API regresó 413, aunque la spec sintética no
hubiera definido ese límite. La implementación informó la decisión adicional,
pero no la aclaró antes de escribir. La skill candidata pasó a pedir la decisión
sobre límites ausentes; esa alteración todavía no fue probada en flujo
positivo de spec y la sesión original no ejecutó pruebas ni revisión
independiente. En otra fixture de proyecto existente sin spec, la skill
candidata identificó el límite sin contrato y pidió una decisión antes de
escribir. Después de la autorización sintética para limitar el cuerpo a 1 MiB,
alteró el servidor y las pruebas. HTTP Han pasado en contêiner Linux sin red
externa, incluyendo título de 70 KiB y las fronteras del límite; los archivos
ejecutados coincidieron por hash con los generados. Git, README y demás caminos
observados permanecieron iguales. Las sesiones no tenían shell, no ejecutaron
verificación de configuración ni revisión independiente; la prueba cobre
corrección avulsa, no el flujo de spec. En otra fixture con documentos y plan
aprobados por solicitante sintético, `implementar-frontend` la `0.0.21` criolla
HTML, CSS y JavaScript locales. En navegador headless, una verificación separada
recorrió estado vacío, error para entrada vacía o solo espacios, inclusión por
Enter y botón y remoción por teclado. No viewport 375 × 812, un título largo no
produjo un rodaje horizontal medida; la consola consultado no registró errores y
las tres requisiciones observadas
Fueron locales. Los 11 caminos Git y documentos monitorizados mantuvieron sus
hashes. La sesión de implementación no tenía shell o navegador y no generó
pruebas automatizadas; no hubo revisión independiente, prueba de recarga, lector
de pantalla, dispositivo móvil físico o prueba en otros navegadores. La fixture
no comprueba el producto real. En dos copias sintéticas de la `0.0.21`, sesiones
nativas invocaron `criar-design-doc` e `gerenciar-roadmap`. Design rechazó
escribir sin UX/UI aprobado. La consulta de roadmap no escribió, pero marcó
preparación como terminada con base solamente en el estado declarado. Los hashes
observados de Git y documentos permanecieron iguales. Con una orientación
candidata para no concluir preparación sin prueba, una repetición presentó
ressalva pero todavía usó `[x]`; una segunda orientación marcó la etapa como
pendiente e indicó `configurar-projeto`. Ambos test fueron puntuales, sin shell;
la alteración fue aplicada a la fuente candidata después de esa prueba y no
garantiza determinismo. En tres otras copias sintéticas, las fuentes publicadas
de `implementar-backend`, `implementar-frontend` e `revisar-codigo` Se activaron
en sesiones independientes. Las implementaciones pararon por falta de spec y
diseño aprobados; la revisión identificó una subtración en el lugar de suma. Las
sesiones no registraron escritas y los hashes observados permanecieron iguales.
La revisión generalizó el defecto para cualquier segundo operando diferente de
cero, sin considerar valores especiales y redondeo; la skill candidata pasó a
pedir límites de las afirmaciones. No hubo implementación completa o revisión
independiente, y los controles cubren solamente los caminos observados. En una
repetición con la fuente candidata, la revisión continuó generalizando el error
para todos los números finitos con segundo operando no cero. Un control Node con
`a = 1e20` e `b = 1` produjo el mismo resultado para suma y subtración por
redondeo. Así, la alteración no corrigió el problema en esa prueba; los hashes
observados permanecieron iguales. Incluso después explicitar la exigencia de
prueba y redondeo, una segunda repetición con la candidata volvió a hacer la
generalización falsa. La validación continúa pendiente; la instrucción no
garantiza la corrección del análisis. Con una instrucción adicional para limitar
el impacto a los
ejemplos cuando falta prueba general, tres sesiones independientes repetiron el
escenario: una volvió a afirmar que todos los segundos operandos finitos no cero
divergen, una calificó el alcance como general y otra limitó el impacto a los
ejemplos. Las tres identificaron el defecto y los hashes observados
permanecieron iguales. No hay garantía de precisión universal o ejecución de la
función en esas sesiones; el contraexemplo fue ejecutado separadamente. En dos
copias sintéticas, sesiones nativas de la `0.0.21` invocaron
`validar-adversarial` e `verificar-trabalho` sobre ese defecto y un informe que
describía el contraexemplo. Ambas distinguiron el defecto de la generalización
refutada y informaron que no reproduciron la ejecución. Los hashes observados
permanecieron iguales. La evidencia del contraexemplo fue suministrada en la
solicitud de la fixture; eso no prueba descubrimiento autónomo ni revisión
independiente. Cuatro sesiones adicionales consultaron `avaliar-arquitetura`,
`avaliar-performance`, `validar-adversarial` e `modelar-ameacas` en fixtures
sintéticas. El rendimiento fue correctamente registrado como no medida; los
demás análisis identificaron límites o violaciones del contrato sintético.
Los hashes observados de archivos y datos Git permanecieron iguales. No hubo
prueba de carga, aplicación real o flujo completo de estas skills. Cuatro
sesiones independientes leyeron explícitamente los perfiles `arquiteto`,
`engenheiro-qa`, `auditor-seguranca` e `analista-performance` la `0.0.21`.
Arquitectura y seguridad identificaron la divergencia del contrato sintético; QA
ejecutó ocho casos locales, de los cuales cuatro fallaron en la fixture
defeituosa; performance permaneció no verificada sin carga y mediciones. Los
archivos y datos Git observados mantuvieron sus hashes. La lectura explícita no
comprueba el descubrimiento o delegación nativa de los perfiles. Otras cuatro
sesiones leeron explícitamente `documentador`, `planejador`,
`especialista-backend` e `especialista-frontend` delante de una spec incompleta.
Identificaron decisiones y prerrequisitos pendientes; índice, configuración y
spec observados no cambiaron. Esto prueba la consulta inicial de los perfiles,
no una implementación o delegación nativa. Por último, `implementador` e
`validador` Se consultó explícitamente a la misma spec: ambos identificaron que
no estaba lista. El implementador de la
`0.0.21` También mencionó el flujo Git prescritivo tratado en la candidata.
Índice, configuración y spec observados permanecieron iguales. Con la prueba
anterior de `revisor`, había consulta explícita de los 11 perfiles. En sesiones
sintéticas posteriores, cada uno de los 11 perfiles de `0.0.21` fue seleccionado
directamente por la opción nativa `--agent` y leyó su fuente, cuyos hashes
coincidieron con los del paquete. Un nombre inexistente fue rechazado. Los
hashes observados de los archivos y datos Git permanecieron iguales; las
sesiones sólo tenían herramientas de lectura. El analista de performance informó
ausencia de medición; el implementador paró por falta de spec. Revisor,
especialista backend y validador identificaron el defecto sintético, pero
generalizaron incorrectamente su alcance numérico. Las pruebas no demuestran
delegación por otro agente, flujos completos, herramientas de escritura,
ejecución de pruebas o determinismo. `0.0.21`, consultas reales a
`criar-design-doc`, `criar-ux-ui`, `gerenciar-roadmap` e `criar-spec`
identificaron lagunas en una spec sintética. En solicitudes con preparación no
comprobada, las tres primeras recomendaron PRD
antes de `configurar-projeto`; `criar-spec` indicó la preparación primero. Con
otra solicitud que explicitó la ausencia de preparación, tanto a `0.0.21` En
cuanto a las skills candidatas de diseño y UX indicaron `configurar-projeto`. La
candidata de roadmap recibió instrucción explícita para ese orden y, en una
consulta en la fixture, indicó la preparación. Las fixtures y solicitudes
varían; los resultados no prueban comportamiento determinístico ni migración
integral. En la preparación de la fixture, la `0.0.21` interpretó una consulta
Docker bloqueada por el sandbox como daemon inactivo, aunque una consulta fuera
de él pudiera necesitarlo. La candidata distingue una consulta exitosa,
inconclusiva, no solicitada y ejecutable ausente del PATH. La opción
`--no-docker-probe` evita llamadas al contexto potencialmente remoto; los
booleanos antiguos permanecen. Pruebas dirigidas pasaron en macOS y Linux, sin
prueba de Windows. El cambio todavía no se publicó ni migrada. A CLI rechaza
opciones desconocidas antes de la sonda; la prueba también recorre el selector y
usa un ejecutable sintético para verificar que no se llama.
Con el catálogo real, otra prueba interceptó APIs seleccionadas de procesos y
red durante el diagnóstico sin sondaje; controles confirmaron específicamente
`spawnSync` e `https.request`. Pasó en macOS y Linux, sin comprobar las demás
interceptaciones, todas las formas de acceso al sistema o ejecución en Windows.
Después de la revisión, la orientación candidata distingue inicio de producto de
preparación de ejecución de proyecto existente. En una consulta sintética, la
primera acción para ejecución local fue `preparar-dev`, con índice y archivos
observados intactos. La revisión textual posterior no encontró conflicto en esos
criterios; los flujos completos no fueron ejecutados. La prueba de
`implementar-spec` También expuso un flujo Git prescritivo en `0.0.21`. En la
candidata, la skill pasó a respetar la branch existente, permitir trabajo sin
remoto, condicionar commits y push a la autorización y proteger staged
preexistente. Una fixture en `trunk` sin remoto ha conservado el índice y el
archivo; la ejecución ha dejado por ausencia de los documentos obligatorios, sin
probar la implementación integral. Una revisión encontró riesgo en checkpoints y
ambigüedad en la secuencia de configuración; las instrucciones fueron ajustadas.
Esa fixture en `trunk` estado `0.0.21`, pero seis fuentes de skill fueron
sustituidas por la candidata: diseño doc, UX/UI, preparar-dev, próximos pasos,
roadmap e implementar spec. El estado de versión no comprueba que todas las
skills utilizadas en ella sean del paquete publicado. Las fuentes de Git y de
creación de agente, comando y regla usadas en las consultas anteriores coinciden
con el paquete `0.0.21`. En una fixture sintética con spec y plan aprobados en
la solicitud, la fuente de skill `implementar-spec` fue restaurada a `0.0.21` e
implementó suma local; dos pruebas pasaron e índice, configuración, exclusiones,
HEAD y un archivo humano observado mantuvieron sus hashes. La fixture todavía
tenía dos fuentes de la candidata (`INSTRUCTIONS.md` y diagnóstico de ambiente),
por lo tanto, no prueba un flujo con instalación integralmente `0.0.21`. El
registro de la sesión contiene un fallo al crear subagente; su afirmación de
revisión independiente no pudo ser comprobada por ese registro. Una sesión
independiente posterior ejecutó las pruebas, apuntó un vacío de especificación
para overflow y combinaciones ausentes en la
Suíte, sin invalidar los ejemplos verificados. El snapshot externo comprueba la
igualdad de los archivos observados, no todos los efectos transitorios. La
candidata ahora orienta mantener la revisión pendiente cuando no haya respuesta
verificable del revisor y aclara que el sello valida consistencia de los datos,
sin comprobar la ocurrencia de la revisión. Esto es una instrucción, no una
garantía técnica contra llenado falso del informe. Las salidas estructuradas del
gate también incluyen `reviewVerification: "not-verified"` en `seal`, `check`,
`check-commit` e `check-merge`. El campo es aditivo; no autentica la revisión ni
cambia la compatibilidad de los informes. Mezclar la skill candidata con
`proximos-passos` la `0.0.21` mostró orden divergente, que exige atención en la
migración de versiones, aún no comprobada. Después de alinear las dos skills
candidatas, una nueva revisión estática no encontró conflictos en esos
criterios; ella no sustituye una actualización o implementación real. En más 40
proyectos sintéticos macOS, usando la candidata local y combinaciones diferentes
de clientes, todos los comandos previstos retornaron éxito y los
Los archivos humanos y datos Git monitorizados permanecieron preservados. La
matriz clasificó 36 casos como estructuralmente verificados y cuatro como no
verificados por metadados de alcance del Cursor. No hubo falla clasificada, pero
el resultado general permaneció no verificado. La prueba no ejecuta los clientes
nativos ni cubre todas las alteraciones transitorias o metadados del sistema. La
matriz ahora detecta frontmatter Cursor divergente del sidecar instalado cuando
ambos pertenecen al subconjunto de bytes reconocido y el sidecar coincide con el
paquete y el estado. Igualdad no promueve el alcance a verificado; YAML fuera de
ese subconjunto continúa no verificado. La repetición de 40 proyectos, anterior
a la nueva medición, mantuvo 36 verificados estructuralmente y cuatro no
verificados, con datos humanos y Git observados preservados. La matriz ahora
mide presencia y hash de los sidecars Cursor al inicio y fin; pruebas detectaron
alteración, inclusión, remoción y enlace simbólico. Eso no detecta alteraciones
transitorias revertidas, no autentica el paquete y no comprueba el alcance o la
activación en el cliente. La lectura de procedencia exige una política Cursor
válida, rechazo links en los
caminos observados y confiere nuevamente los directorios durante la lectura. Las
pruebas específicas pasaron en macOS y Linux; la protección no elimina todas las
carreras de cambio de directorio y todavía necesita validación en Windows. Una
revisión independiente identificó una ventana específica en la enumeración de
los sidecars: el intercambio competidor de un directorio puede alcanzar un árbol
externo antes de la negativa. La comparación de nombres sin distinguir caja
también puede incluir archivos adicionales en sistemas que distinguen caja.
Estos límites siguen pendientes; la matriz no debe ser tratada como prueba de
aislamiento. Las pruebas de integración usan copia temporal filtrada. Casos
sintéticos confirmaron exclusión de datos locales en variaciones de caja,
preservación del README de estado y rechazo de un directorio que use ese nombre.
No se afirma que la copia reproduce completamente el paquete publicado. Una
prueba adicional confirmó que enlaces sintéticos a archivo y directorio externo
no se copian; no cubre carreras entre inspección y copia o junctions Windows. La
investigación encontró que el sidecar Cursor de la regla Git la marcaba como
Siempre activa, mientras que el origen usa decisión del agente. La candidata
alquiró el sidecar a ese gatillo, conforme a la [documentación del
Cursor](https://cursor.com/docs/rules), y reforzó la regla para interrumpir
consultas sin método comprobadamente seguro. Una prueba de generación preservó
los bytes del índice principal de la fixture; no comprueba activación en el
cliente ni los metadatos de todos los sidecars. En el router con `0.0.21`, el
apuntamento Cursor, la regla Git y su sidecar coincidieron en SHA-256 con una
instalación sintética del paquete publicado. El apuntamiento y el sidecar usan
aplicación global, mientras que el origen indica decisión por relevancia. La
configuración fue observada; su activación nativa en el cliente del usuario no
fue comprobada ni alterada. Un intento aislado con el CLI Cursor, proyecto
solamente de lectura y endpoint local sin credenciales reales dejó en la
autenticación antes de evaluar reglas; por lo tanto no comprueba activación
nativa ni usa configuraciones del usuario. El apuntamiento Cursor existente en
el checkout permanece desactualizado porque el `sync --check` presenta otros
conflictos; él no fue sobrescrito. La prueba de
fixture también confiere la referencia canónica, las instrucciones de autoría y
la interrupción de consultas sin método seguro. En el router real con `0.0.21`,
o `doctor` la candidata `0.0.30` identificó ocho conflictos en reglas existentes
de cliente y un marcador de exclusión compartida; también indicó 52 ítems
desactualizados. La consulta terminó con status pendiente. Antes y después de
ella, los hashes del índice, `.gitignore`, `.git/config` e `.git/info/exclude`
coincidieron. Ningún conflicto se resolvió o se modificó en esta verificación.
`doctor` del paquete publicado `0.0.21` Volvió éxito en el mismo proyecto y
preservó los mismos hashes; ese resultado no comprueba la ejecución individual
de los recursos ni una actualización completa. La candidata también pasó a
reconocer el marcador legado cuando el archivo de exclusiones comienza con BOM
UTF-8. En fixtures, el diagnóstico preserva exclusiones e índice; esa corrección
no elimina el marcador ni resuelve el conflicto del router. Una nueva ejecución
de la migración a partir del tarball publicado `0.0.21` cubrió nueve fixtures:
ocho actualizaciones terminaron, la selección Claude presentó ocho
conflictos y los nueve `sync --check` permanecieron bloqueados por el marcador
legado. Las verificaciones de preservación observadas pasaron; el `init`
histórico alteró `.git/info/exclude` en las nueve fixtures antes de la
actualización. El informe no comprueba la preservación de todos los metadatos ni
migración exitosa. Las nueve pruebas de exclusión legada pasaron de nuevo en
macOS y Linux ARM64, incluyendo una worktree vinculada con índices distintos y
bloques truncados o alterados. La protección permanece conservadora: reconocer
el marcador no prueba autoría ni autoriza eliminar sus reglas. En el mismo
router, `sync --check` e `update --dry-run` la `0.0.21` retornaron éxito sin
cambios planificados o conflictos; `agents` e `next` También volvieron éxito.
Después de las consultas, los mismos hashes Git permanecieron iguales. Los 41
archivos de skills y 11 de agentes instalados coincidieron en SHA-256 con los
del paquete publicado; comparación de bytes no prueba ejecución. La
planificación asoció a los ocho archivos del router el motivo de metadatos no
verificados y mantuvo los hashes Git anteriores. Un intento de llevar ese
motivo de la lista de conflictos fue retirada: revisión independiente identificó
que una barrera estructural puede tener su motivo sustituido en la
planificación. La versión actual muestra el registro de preservación asociado al
mismo camino como observación, sin afirmar que es la única causa del conflicto.
Los ocho conflictos del router y la verificación de otras barreras continúan
pendientes. Una fixture adicional en macOS y Linux comprobó que un enlace
simbólico en la regla es identificado y preservado, incluyendo su destino
externo; ese caso aislado no elimina la hipótesis para otras barreras y caminos
de planificación. Con registros previos de archivo o bloque, pruebas de `doctor`
e `update --dry-run` También regresaron `E_SYMLINK`, preservando el objetivo, el
estado y los datos Git observados en macOS y Linux. La negativa antecede al
diagnóstico de preservación; no demuestra el comportamiento de otras barreras
estructurales.

Resultados, capturas y proyectos temporales quedan fuera de Git. Registra aquí o
en roadmap las evidencias, pendencias y límites reales de cada etapa.

[reading-pt]: ../../../tasks/evolucao-plataforma/TASKS.md
[reading-en]: ../../../en/tasks/evolucao-plataforma/TASKS.md
[reading-es]: TASKS.md
