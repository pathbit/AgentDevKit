---
description: "Solicitudes agrupadas y prioridades para la evolución de AgentDevKit."
status: em andamento
language: es
---

# Grupos de tareas y mejoras

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Esta lista consolida las peticiones de la conversación por resultado esperado.
Los detalles, las pruebas y los límites están en [la evolución y la
evidencia](TASKS.md); o [roadmap](../../product/roadmap.md) acompaña la
evolución del producto. Una tarea sólo se completa después de la validación
correspondiente.

## 1. Protección de los proyectos y sincronización — prioridad

- [ ] Preservar archivos y configuraciones humanas, cambios staged y unstaged,
  índice, ignores y configuración Git en instalaciones, actualizaciones y sync.
- [ ] Resolver colisiones y migraciones de recursos antiguos sin presumir
      propiedad,
  Eliminando solo contenido cuya eliminación sea comprobadamente segura.
- [ ] Investigar la actualización de referencia generada con
      `core.autocrlf=true`:
  la prueba actual encuentra divergencia en el registro de contenido y bloquea
  el sync.
  Preservar la protección contra ediciones humanas y el índice al corregir y
  validar.
- [ ] Corregir recuperación concurrente y preservar ACLs y atributos extendidos;
  repetir las pruebas estrictas en los sistemas aplicables.
- [ ] Documentar los efectos, conflictos y límites de `init`, `update`, `sync`
  y otras órdenes, incluso proyectos que ya poseen agentes y skills.
- [ ] Validar la versión publicada y la candidata en el router sin alterar su
  `.gitignore`, su índice o configuración; solo actualizar después de pruebas
  suficientes.

## 2. Flujo de desarrollo y especialistas

- [ ] Guíar preparación, producto, UX/design, arquitectura, roadmap, specs y
  implementación en el orden acordado, recolectando dudas antes de proponer el
  plan.
- [ ] Comprobar prerrequisitos, aprobaciones y criterios de aceptación;
      investigar
  protección efectiva contra escritura anticipada, además de instrucciones
  textuales.
- [ ] Evoluir orientaciones de arquitectura, backend, frontend, QA, seguridad,
  revisión, performance y validación adversarial, con subagentes cuando sea
  posible.
- [ ] Aplicar las prácticas pertinentes del material de rendimiento y evaluar
      ECC
  y Superpowers, respetando licencias y sin copiar contenido innecesario.

## 3. Clientes, recursos y herramientas

- [ ] Mantener `.pbai4devs` como origen compartido y sincronizar solamente los
  clientes seleccionados, preservando sus archivos nativos y recursos propios.
- [ ] Validar individualmente skills y agentes, inclusive integraciones nativas;
  acompañar la cobertura en [inventario](VALIDACAO-RECURSOS.md).
- [ ] Investigar el loop de OpenCode y documentar la eliminación manual cuando
      la
  origen es identificado; no crear agendamientos sin solicitud.
- [ ] Comprobar bootstrap de Node e instalación, actualización y validación de
      las
  herramientas en Windows, macOS y Linux con una entrada sencilla.
- [ ] Versionar código y fixtures de pruebas; mantener resultados, capturas,
  `.playwright*` y proyectos temporales fuera de Git.

## 4. Paquete, CI y publicación

- [ ] Validar metadatos, licencia, contenido e instalación por npm, Yarn, pnpm y
  Bun; documentar prerrequisitos y opciones npm público y GitHub Packages.
- [ ] Ejecutar los gates completos y las pruebas multiplataforma; corregir
      fallos
  Antes de publicar. Releases y paquetes deben coincidir con la misma etiqueta.
- [ ] Distinguir pruebas aprobadas, ignoradas y no ejecutadas en los informes;
  No tratar una ejecución parcial como prueba completa.
- [ ] Conferir publicación e instalaciones reales en los registries después de
      la release.

## 5. Documentación, ejemplos y entrega

- [ ] Organizar README, guías, wiki, roadmap e issues con texto simple y
  profundo; validar frontmatter, lint y destinos y pertinencia de los enlaces.
- [ ] Mantener ejemplos sintéticos de proyectos nuevos y existentes; evaluar
      material
  visual sin capturar información o ventanas privadas.
- [ ] Revisar autoría humana y datos sensibles en código, documentación y
  metadados; mantener reglas explícitas de autoría en las skills Git.
- [ ] Revisar el conjunto final, ejecutar las pruebas necesarias y entonces
      hacer
  Commit y push autorizados, acompañando CI y publicación.

Los ítems anteriores son agrupamientos de trabajo, no una afirmación de que
todas las solicitudes anteriores permanecen abiertas o de que ya fueron
implementados. Consulte las evidencias para distinguir resultados parciales de
pendencias.

[reading-pt]: ../../../tasks/evolucao-plataforma/GRUPOS.md
[reading-en]: ../../../en/tasks/evolucao-plataforma/GRUPOS.md
[reading-es]: GRUPOS.md
