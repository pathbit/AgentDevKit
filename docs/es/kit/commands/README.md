---
description: "Casos de uso para accionar skills, scripts y herramientas compartidas."
language: es
---

# Comandos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Elija el primer comando por el resultado en [guía de uso](../INSTRUCTIONS.md).
Las etapas siguientes y lo que repasar quedan en el propio caso de uso.

Cada `<nome>/COMMAND.md` es la entrada de un caso de uso: informa entrada,
prerrequisitos, ejecución y salida. skill orienta las decisiones; el script
ejecuta la automatización; la herramienta proporciona la capacidad.
Referéncielos sin copiar sus instrucciones o implementación. Carpetas indican
dónde leer o salvar archivos.

- [diagnosticar](diagnosticar/COMMAND.md): identificar el entorno y el proyecto.
- [preparar dev](preparar-dev/COMMAND.md): preparar o reparar la máquina.
- [instalar herramienta](instalar-ferramentas/COMMAND.md): conferir Node/npm,
  instalar y validar herramientas en un flujo.
- [actualizar herramientas](atualizar-ferramentas/COMMAND.md): actualizar
  herramientas.
- [Sincronizar](sincronizar/COMMAND.md): mantener los apuntamientos de los
  agentes.
- [verificar agentes](verificar-agentes/COMMAND.md): conferir recursos y
  pruebas.
- [revisar entrega](revisar-entrega/COMMAND.md): cerrar documentación y pruebas.
- [probar-navegador](testar-navegador/COMMAND.md): probar un flujo web real.
- [status-roadmap](status-roadmap/COMMAND.md): consultar el curso.
- [proximospasos](proximos-passos/COMMAND.md): orientar la próxima acción útil.

## Flujos de entrega y seguridad

- [planificar entrega](planejar-entrega/COMMAND.md): reunir dudas y planificar.
- [implementar-entrega](implementar-entrega/COMMAND.md): ejecutar el plan
  aprobado.
- [validar entrega](validar-entrega/COMMAND.md): producir pruebas por criterio.
- [actualizar-documentacao](atualizar-documentacao/COMMAND.md): mantener las
  guías.
- [preparar seguros](preparar-seguranca/COMMAND.md): preparar escáneres y bases.
- [Auditar aseguranca](auditar-seguranca/COMMAND.md): ejecutar y triar análisis.
- [Segredos](verificar-segredos/COMMAND.md): limitar la búsqueda de secretos.
- [verificar-dependencias](verificar-dependencias/COMMAND.md): conferir
  paquetes.

Use `criar-comando` e o [modelo](../templates/comando/TEMPLATE.md) para nuevos
casos. Para automaciones, use
[ejecutarscript](../skills/projeto/executar-script/SKILL.md) con el nombre del
script y sus argumentos, según el [guía](../scripts/README.md). Argumentos
vienen del usuario; `$ARGUMENTS` Solo existe cuando la herramienta lo ofrece.

Markdown orienta al agente; no ejecuta scripts solo. Pida la lectura por el
camino o use el acceso rápido nativo cuando se descubre por la herramienta. Cada
comando tiene entrada y salida; no necesita corresponder a una skill nueva. Un
flujo puede combinar varios perfiles y procedimientos sin duplicar contenido.

[reading-pt]: ../../../../.pbai4devs/commands/README.md
[reading-en]: ../../../en/kit/commands/README.md
[reading-es]: README.md
