---
name: preparar-dev
description: "Hace un proyecto existente rotar en la máquina o reparar su entorno, siguiendo el stack y las órdenes actuales."
language: es
---

# Preparación del desarrollo

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Inspecione solamente este repositorio. Reutilice el resultado actual de
[diagnosticar](../../../commands/diagnosticar/COMMAND.md) o ejecute la consulta.
Consulte README, archivos ocultos, manifests, lockfiles, Makefile, Compose,
Dockerfiles, ejemplos de configuración, CI y conectores. Identifique el comando
real y lo que es obligatorio para el flujo. Si la consulta a Docker falla,
relate **no verificado**. Sin red permitida y sin contexto Docker probadamente
local, ejecute el script de diagnóstico con `--no-docker-probe`, conforme el
comando arriba. El bootstrap hace su propio diagnóstico antes de encaminar.

Solo trate la selección de clientes si la solicitud implica la instalación o
configuración del kit. Reúna dudas sobre el error, el objetivo, los servicios,
las credenciales, las versiones, la puerta y los datos que se deben preservar.
Utilice [modelo de entorno](../../../templates/ambiente-local/TEMPLATE.md) para
as lacunas.

Ejecute reparaciones autorizadas en el entorno. Preserve producto, stack y
documentos. Cambios funcionales, arquitectura, versiones de stack o datos
requieren decisión propia. Para herramientas del kit necesarias para la tarea,
use `setup <seleção>` el [preparación de
herramientas](../../../commands/instalar-ferramentas/COMMAND.md). Siga los
lockfiles y las órdenes de stack para preparar los servicios. Si el proyecto ya
usa Compose, siga [regla de entorno](../../../rules/ambiente-local/RULE.md).
Adapte modelos cuando la reparación autorizada exija y preserve bancos,
volúmenes y secretos.

Valide configuración, build, salud, migraciones acordadas y pruebas relevantes.
Use `verificar-trabalho` para el flujo real, cuando hay aplicación. Relate
órdenes para subir y parar, URL o puerta, evidencias y esperas. Guarde
resultados en `.agent-tests/`. Actualice documentación afectada y sincronía si
los recursos agênticos cambian. Nuevas características siguen el flujo de specs.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/preparar-dev/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/preparar-dev/SKILL.md
[reading-es]: SKILL.md
