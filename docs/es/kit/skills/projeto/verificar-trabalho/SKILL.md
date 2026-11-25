---
name: verificar-trabalho
description: "Valida una enmienda lista por criterio de aceptación con pruebas, ejecución real y evidencia."
language: es
---

# Comprobar trabajo

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Mapeie criterios, riesgos y pruebas disponibles. Reaproveite evidencias del
mismo estado y ambiente que cubran el criterio. Use [planificar-qa][qa] para
elegir casos y [validar-adversarial][adversarial] Para investigar un fallo
específico. [ejecutarscript][execucao] identifica las órdenes reales del
proyecto.

- **Comportamiento.** Gire las pruebas del proyecto que cubran los aceptados.
  Consulte lint, tipos y build cuando sean aplicables.
- **Recursos agénticos.** Rodeo [comprobar cursos][recursos]. En divergencias,
  [revisar el plan][sync] y aplique solo si la corrección está en el alcance.
- **Automaciones del kit.** Rodeo [prueba de infraestructura][infra]. Para
  catálogo, sync, instalación o copia, rode también [`testar-maturidade
  run`][maturidade].
- **Interfaz web.** [Abra la aplicación real][navegador], recorriendo los flujos
  afectados y vea pantalla, consola y red en la matriz del proyecto.
- **Desktop o artefacto.** Abra o renderice e inspecione el resultado. Ejecute
  el flujo afectado cuando haya aplicación.
- **Catálogo Vercel.** Gire el [prueba funcional y comprueba sus
  límites][vercel].

Compruebe resultados y códigos de salida. Marque cada criterio como **Pasó**,
**Fallo** o **no verificado**. Un aceptador de comportamiento requiere una
ejecución que cubra el criterio entero. Regístra ambiente, orden, evidencia y
vacíos. Cuando falta una herramienta o acceso, indique el prerrequisito y siga
con las pruebas viables.

Archive las salidas en `.agent-tests/<referencia>/<execucao>/` y vincularlas a
IDs como AC-001. Pruebas y fixtures pueden ser versionados. Devolva fallas al
implementador y encaminhe las pruebas al flujo que pidió la verificación.
Criterio pendiente o revisión independiente abierto impide concluir la entrega.

[execucao]: ../executar-script/SKILL.md
[qa]: ../../qualidade/planejar-qa/SKILL.md
[adversarial]: ../../qualidade/validar-adversarial/SKILL.md
[recursos]: ../../../scripts/verificar-recursos/README.md
[sync]: ../../../commands/sincronizar/COMMAND.md
[infra]: ../../../scripts/README.md#script-de-infraestructura
[maturidade]: ../../../scripts/testar-maturidade/README.md
[navegador]: ../../../commands/testar-navegador/COMMAND.md
[vercel]: ../../../scripts/preparar-ferramentas/README.md#operaciones-individuales

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/verificar-trabalho/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/verificar-trabalho/SKILL.md
[reading-es]: SKILL.md
