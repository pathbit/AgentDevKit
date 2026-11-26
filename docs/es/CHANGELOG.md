---
description: "Cambios verificables por versión de AgentDevKit."
language: es
---

# Changelog

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## 0.0.41

- Los archivos README en portugués, inglés y español usan esta versión en
  los ejemplos de npmjs y GitHub Release.
- El verificador de publicación acepta la respuesta de metadatos de npm 12
  y comprueba el tarball con la integridad aprobada por CI.
- La documentación presenta npmjs como la vía principal de instalación y
  explica las opciones de GitHub.

## 0.0.40

- La integración y la publicación pasan por la rama `main`.

## 0.0.39

- El asistente de instalación muestra una lista marcable de agentes. Use `agents
  --select` para editar la selección en un terminal interactivo.
- El comienzo rápido muestra cómo simular la instalación, seleccionar un cliente
  y hacer la primera consulta en proyectos nuevos o existentes.
- `next --intent run` indica archivos de referencia para elegir la orden del
  equipo. El inventario reconoce más formas de proyecto y orienta la preparación
  por Compose sin ejecutar órdenes de la aplicación.
- `init --local` ignora archivos aún no rastreados en `.pbai4devs` con una regla
  en el propio hub. Actualizaciones y sincronizaciones mantienen la elección.
- El CI prueba la preservación de archivos y del índice Git en proyectos de
  varios lenguajes, documentación, carpetas vacías y monorepos.
- Cancelar el asistente conserva los archivos y devuelve el código 130. El
  menú sigue visible cuando se redirige la salida de error.
- La instalación rechaza un archivo en la ruta de destino y detecta si otro
  proceso sustituyó el directorio después de planificar la operación.
- El diagnóstico acepta excepciones comprobadas para directorios de
  compilación y avisa de archivos privados que puedan quedar visibles en Git.

## 0.0.38

- En macOS, la vista previa informa de bloqueos de metadatos antes de aplicar
  la instalación, actualización o sincronización.

## 0.0.37

- Genera subagentes nativos del ZCode con herramientas explícitas por función y
  preserva perfiles propios del proyecto cuando ocupan el mismo camino.
- Distingui los recursos de proyecto y personales de Copilot, ajusta su modelo
  de ignore y excluye carpetas de agentes de detección de la aplicación.
- Centraliza la orientación para migrar desde Gemini CLI y corrige los ejemplos
  de carpetas generadas. Preserva las entradas que Antigravity continúa usando.

## 0.0.36

- Retira Gemini CLI de la selección y generación de recursos. En la
  actualización, elimina referencias comprobadamente administradas y preserva
  archivos propios del proyecto. Antigravity continúa usando `GEMINI.md`.
- Pregunta qué clientes usarán el kit y salvan la elección por proyecto. Sin
  selección explícita o salva, prepara la estructura compartida. `agents add` e
  `agents remove` ajustan la selección existente.
- Muestra una matriz de características y reúne licencias y créditos en la guía
  de complementos. OpenSpec y dotcontext MCP Son integraciones opcionales.
- Organiza instalación, sincronización y CLI en módulos con responsabilidades
  específicas. Conserva los puntos de entrada y el formato del estado local.
- Enxuga las skills de entrega, validación, sincronización y herramientas.
  Comandos y manuales concentran procedimientos y decisiones por caso.
- Revisa la documentación de primer uso y la referencia de mantenimiento para
  conectar instalación, configuración, validación y actualización.

## 0.0.35

- El primer uso identifica si el equipo quiere configurar agentes, planificar,
  ejecutar o documentar un sistema existente.
- `document` reúne evidencias locales y genera un borrador Markdown o JSON.
- El flujo de documentación por módulo conecta fuentes, pruebas y lagunas a los
  documentos que el proyecto ya mantiene.

## 0.0.34

- Guía la verificación en el terminal de la instalación hasta la próxima etapa
  del proyecto.
- Indica un plan sólo lectura cuando la sincronización necesita revisión.
- El `next --integrations` antes y después de la instalación para localizar
  dónde consultar BMad, OpenSpec, GitHub Spec Kit, TLC y Dotcontext.
- Explica en GitHub y npm cuando use el kit y cuando aproveche referencias de
  otro método, con ejemplos para proyectos nuevos y existentes.

## 0.0.33

- Migra referencias antiguas de Claude cuyo origen y contenido son comprobados.
- Retira adaptadores jubilados de la selección estándar y limpia sus
  apuntamientos generados. Antigravity usa `.agents` Kimi usa `.kimi-code`.
- Migra el bloque conocido de AgentDevKit 0.0.21 en `.git/info/exclude` Cuando
  hay una sola obra. Preserva el orden de las reglas activas y registra una
  copia local del archivo original.
- Preserva lanzadores locales y reaprovecha los que ya corresponden al
  generador.

## 0.0.32

- Conecta planificación, implementación, validación y revisión por criterios de
  aceptación, con instrucciones más cortas y puntos de entrada por intención.
- Reaprovecha planes aprobados, respeta el stack del proyecto existente e
  informa cómo preparar el destino local de las evidencias de la revisión.
- Permite verificar el kit instalado vía npm sin depender de un ejecutable
  global y exige las pruebas nativas de sincronizador en Linux.
- Repite una vez la verificación de la protección de archivos en Windows cuando
  excede el tiempo límite. Las cortes explícitas continúan interrumpiendo la
  operación.
- Valida instalación y actualización con el paquete candidato local y añade los
  recibos de recuperación y la procedencia de la matriz de proyectos.

## 0.0.31

- En Windows selecciona una versión de Node con la corrección de eliminación en
  caminos Unicode. El mínimo en la serie LTS 24 é 24.13.1.
- Registra operaciones de instalación y sync en un diario local. Después de un
  fallo, preserva el estado parcial, indica la copia anterior y requiere
  revisión para reanudar los cambios.
- Prepara sustituciones en la etapa privada de la operación y verifica si el
  volumen permite publicar los archivos. Las verificaciones de metadatos
  incluyen los atributos extendidos en Linux y los permisos de archivos en
  Windows.
- La revisión de seguridad prioriza las correcciones por la exposición y por el
  impacto, cita la evidencia de cada hallazgo y registra verificaciones
  pendientes.
- Confiere los blobs staged del archivo y de los atributos Git antes de aceptar
  una referencia administrada que difiere sólo por CRLF; no ejecuta filtros
  locales.
- Corrige la identificación de proyectos sin Git cuando los mensajes locales de
  Git están traducidos; errores e interrupciones continúan bloqueando la
  operación.
- Preserva órdenes Gemini existentes con bloque sin propiedad comprobada y
  permite instalar los demás recursos sin adoptar ese archivo.
- Evita repetir la referencia cuando un prompt Gemini existente corresponde
  íntegramente al generado, preservando el archivo sin reivindicar propiedad.
- Mantiene `{{args}}` coherente entre la CLI y sync directo en órdenes Gemini
  compartidos, sin duplicar el marcador presente en el texto humano.

## 0.0.30 — 2026-11-14

- Mejora la detección de Node y npm con preloads que escriben en la salida, sin
  alterar `NODE_OPTIONS`; las respuestas ambiguas bloquean la descarga.
- Añade una matriz reproducible de proyectos nuevos y existentes, con snapshots
  por etapa y resultados mantenidos en directorios temporales.

## 0.0.29 — 2026-11-14

- El `--raw` Para separar la salida del script de los metadatos del kit, con los
  límites de instrumentación del ambiente documentados.
- Eclarece la preservación del índice en consultas sin escritura de
  `git-commit`.

## 0.0.28 — 2026-11-14

- Encadena preparación del runtime, diagnóstico y ejecución por `--executar`,
  con un plan de lectura y opción de no instalar runtime.
- Rechaza objetivos no válidos antes de preparar el ambiente y reconoce el
  primer Node compatible en PATH; documenta los límites de salida y aislamiento.

## 0.0.27 — 2026-11-14

- Esclarece que desactivar locks opcionales no garantiza la preservación de los
  bytes del índice Git y orienta a interrumpir consultas sin método seguro
  comprobado.
- Delimita la garantía de la prueba de consultas a la fixture realmente
  ejercitada.

## 0.0.26 — 2026-11-14

- Preserva los bytes del índice en las consultas del gate para los casos
  soportados y rechaza configuraciones que no puede verificar con seguridad.
- Requiere cobertura y comparación de los archivos preparados en `check-commit`;
  bloquea flags, nombres, modos y transformaciones no comprobadas.
- Espera la decisión antes de editar documentos con contradicciones no
  resueltas.

## 0.0.25 — 2026-11-14

- Compruebe la cobertura y el contenido revisado antes de un merge fast-forward;
  bloquea situaciones que el gate no puede comprobar.
- Esclarece la validación en el origen y la interrupción del merge cuando el
  gate falla.
- Amplia las pruebas de preservación en proyectos existentes y explica los
  límites del campo `preserved`. Los proyectos de ejemplo generados continúan
  locales.

## 0.0.24 — 2026-11-14

- Preserva catálogos, configuración y bloques existentes sin comprobación de
  propiedad, incluso al usar `--force` o sincronización directa.
- Mantiene el estado coherente cuando la sincronización actualiza las salidas
  administradas.
- Añade pruebas de colisión, archivos idénticos y preservación del índice Git.

## 0.0.23 — 2026-11-13

- Corrige la resolución de destinos inexistentes directamente bajo la raíz.
- Acepta aliases temporales confiables de macOS y rechaza destinos que
  atraviesan enlaces humanos, incluso los indicados por variables de entorno.
- Orienta roadmap y spec antes de la configuración técnica y añade una
  verificación del estado antes de la implementación.
- Aplica la verificación también a los especialistas y orienta consultas Git que
  preservan los bytes del índice.

## 0.0.22 — 2026-11-13

- Descubrimiento de skills del Codex sin duplicación, con una alternativa segura
  cuando la ruta principal está obstruida.
- Sincronización y actualización reconcilian el estado sin reemplazar recursos o
  metadados humanos.
- Scripts reconocen caminos por aliases y ejemplos de madurez usan salidas
  aisladas.
- Pruebas ampliadas para combinaciones de clientes, proyectos existentes y
  preservación de Git.

## 0.0.21 — 2026-11-13

- Creación automática de la etiqueta de la versión después de la aprobación de
  la matriz de CI.
- Publicación dirigida por la automatización con protección contra colisiones de
  etiquetas.

## 0.0.20 — 2026-11-13

- Actualización de la herramienta agent-browser compatible con su distribución
  actual.
- Orientaciones para consultar y recuperar versiones de etiquetas publicadas.

## 0.0.19 — 2026-11-13

- Las carpetas de los clientes se ignoran localmente por patrón, con excepciones
  del proyecto.
- El índice Git y los archivos ya rastreados permanecen intactos.

## 0.0.18 — 2026-11-13

- Sincronización preserva recursos propios, colisiones y alteraciones humanas.
- Limpieza de recursos obsoletos requiere comprobación de propiedad.
- Comandos y efectos sobre archivos, índice y copias de seguridad documentadas.

## 0.0.17 — 2026-11-13

- La carpeta de estado compartida se llama `.pbai4devs/state`.
- Las instalaciones existentes migran los datos sin alterar el índice o
  ignorarlo.

## 0.0.16 — 2026-11-13

- Pruebas portátiles distribuidas entre jobs para Windows y macOS.
- Diagnósticos de subprocesos y espera del CI mejorados para releases.
- Instrucciones para recuperar el artefacto del intento correcto del CI.

## 0.0.15 — 2026-11-13

- Especialistas y skills para arquitectura, backend, frontend, QA y performance.
- Revisión de código y validación adversarial orientadas por evidencias.
- Delegación de tareas independientes con responsabilidades y límites claros.
- Preservación de archivos y configuraciones existentes cubierta por
  integración.
- Permisos de solo lectura del revisor compatibles con OpenCode V2.
- Pruebas de competencia limitada y diagnóstico de fallas de la CLI.

## 0.0.14 — 2026-11-12

- O `.gitignore` De la raíz pertenece al proyecto y no es alterado por el kit.
- Las exclusiones locales están en Git y los conflictos se informan antes de la
  instalación.
- Proyectos sin Git reciben orientación para activar la protección después `git
  init`.
- Negación ambigua, bloques antiguos y artefactos rastreados reciben
  diagnóstico.

## 0.0.13 — 2026-11-12

- Protección de cachés de agentes incluso con negaciones genéricas en
  `.gitignore`.
- Matriz de compatibilidad ampliada para los siete proyectos públicos
  solicitados.
- Dos ejemplos reproducibles con producto, diseño y tres specs probadas.

## 0.0.12 — 2026-11-12

- Las entradas y recursos existentes reciben referencias en bloques propios del
  kit.
- Texto, metadatos y cambios humanos se conservan en las actualizaciones.
- Las órdenes Gemini reciben complementos dentro del prompt TOML.
- Los archivos mixtos no son desindexados ni ignorados como si fueran del kit.
- Título principal del README: Pathbit AI - AgentDevKit.

## 0.0.11 — 2026-11-12

- Skills de seguridad incluidas en las instalaciones, con revisión y corrección
  guiadas.
- Agentes, órdenes y reglas conectados en flujos de entrega y auditoría.
- Gitleaks, OSV-Scanner y Opengrep locales, con versiones y hashes revisados.
- Auditoría offline y preparación explícita de bases, sin cuenta de análisis
  externo.
- Informes redactados, pruebas reales de escáneres y preservación de recursos
  propios.
- Curadoría de herramientas y skills con licencias, fuentes y límites
  documentados.

## 0.0.10 — 2026-11-12

- Incluso el paquete publicado en npm y GitHub Packages, con versión y bytes
  iguales.
- Instalación vía npx en los dos registries, con credenciales aisladas por
  destino.
- Guías de prerrequisitos para Windows, macOS y Linux, incluyendo Node/npm.
- README, wiki y notas de release con los dos caminos de instalación.
- Diagnóstico de mapeos antiguos de registry sin borrar configuraciones.

## 0.0.9 — 2026-11-12

- Enlaces y configuraciones humanos preservados en la instalación de los
  agentes.
- Los colchones con recursos nativos propios no son sobrescritas por el kit.
- Sincronización mantiene recursos humanos, incluso con `--force`.
- Los caminos preservados son informados sin registrar propiedad indebida.
- Matriz OSS verifica agentes preexistentes y sincronización independiente.
- Inventario y flujo documental requieren lectura y complementos sin
  sustitución.
- Ejercicios documentales cubren proyectos reales y un proyecto vacío.

## 0.0.8 — 2026-11-11

- Preservación de archivos humanos que parecen apuntamientos generados.
- Conflictos de ignore rechazados antes de las grabaciones y rollback revisado.
- Permisos mantenidos en actualización, copia de seguridad y restauración de
  archivos.
- Caminos simbólicos de herramientas bloqueados antes de escritura externa.
- Argumentos de herramientas preservados después `--`; ayuda sin proyecto
  válido.
- Comprobación de artefactos con nombres propios, archivos y reglas aninhadas.

## 0.0.7 — 2026-11-11

- Artículos de pruebas y carpetas temporales protegidos en proyectos existentes.
- Las reglas locales respetan el alcance del proyecto y las excepciones del
  usuario.
- Prueba opt-in en clones reales, con commits fijos y comparación de archivos.
- Relato explícito de bloqueos por enlaces simbólicos preexistentes.

## 0.0.6 — 2026-11-11

- Metadados npm con autoría PathBit, palabras clave y licencia MIT.
- README público sin frontmatter, con enlaces absolutos a GitHub.
- Licencia canónica instalada en el hub, preservando la licencia del consumidor.
- Verificación de versión estable, consumo anónimo y actualización del router.

## 0.0.5 — 2026-11-11

- Documentación organizada en guías, producto y mantenimiento, con índices
  propios.
- Instalación y próximos pasos utilizan el paquete nombrado en el npm público,
  sin iniciar sesión.
- Notas y guías apuntan al registro y su página de versiones.
- Publicación verifica instalación, diagnóstico y sincronización sin
  autenticación.
- Publicación prioriza el secreto `NPMJS_TOKEN`; sin token, usa OIDC.

## 0.0.4 — 2026-11-11

- Código en `src/`, pruebas en `tests/` y publicación en `scripts/release/`.
- Ejemplos completos en `examples/generated/`, con guía versionado y órdenes.
- Preparación de los ejemplos sin depender de carpetas generadas en la raíz.
- Informes de ejemplos actualizados, sin reutilizar resultados antiguos.
- Guía rápida de desarrollo y automaciones npm para verificar y empaquetar.
- Compatibilidad de instalación, actualización y publicación mantenida.

## Distribución en GitHub Packages

- Paquete único `@pathbit/agentdevkit` instalable por el registro con npx.
- Publicación del artefacto verificado y retomada para etiquetas existentes.
- Documentación de autenticación y acceso a los paquetes.

## 0.0.3 — 2026-11-11

- Fuentes del producto, pruebas y automaciones concentradas en `.pbai4devs`.
- Salidas de agentes y preferencias locales fuera del vuelco.
- Layouts de clientes declarativos y entradas generadas con preservación humana.
- Bootstrap JavaScript y uso de npx mantenido, sin scripts shell propios.
- CI dividido por responsabilidad y release reutilizando artifact aprobado.

## 0.0.2 — 2026-11-11

- Selección persistente de agentes en la instalación y en la orden `agents`.
- Instalación y sincronización limitadas a los clientes elegidos y dependencias.
- Eliminación de las indicaciones desmarcadas con preservación de archivos
  propios.
- Paquetes verificados como artifacts del CI y generación manual por Actions.
- Los paquetes de registro se han reutilizado con verificación de checksum.
- Formularios de bugs y mejoras y modelo de pull request.
- Wiki organizada por tarea: instalación, CLI, flujo, recursos y recuperación.
- Guías de herramientas, pruebas, arquitectura, contribución y releases.

## 0.0.1 — 2026-11-11

- Extracción de las fuentes compartidas para el repositorio AgentDevKit.
- Origen `.pbai4devs` con skills, reglas, órdenes, modelos y pruebas.
- Documentación inicial en portugués, con entradas en inglés y español.
- CLI Para instalar, actualizar, diagnosticar e indicar próximos pasos.
- Pruebas de distribución para preservar proyectos y excluir artefactos locales.

Los resultados de validación se encuentran en informes ignorados y en el CI,
separados de este registro de las funcionalidades entregadas.

[reading-pt]: ../../CHANGELOG.md
[reading-en]: ../en/CHANGELOG.md
[reading-es]: CHANGELOG.md
