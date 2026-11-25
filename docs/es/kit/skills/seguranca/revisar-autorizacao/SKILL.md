---
name: revisar-autorizacao
description: "Verifica identidad, permisos por recurso y aislamiento entre usuarios."
language: es
---

# Revisar autorización

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Identifique sujetos, papeles, recursos y operaciones permitidas. Lea rutas,
middleware, políticas de datos y pruebas; no deduce autorización por la
interfaz. Si el contrato no existe, reúna las dudas antes de proponer cambios.
Use el idioma salvo en el estado del kit. Diferencie comportamiento observado de
impacto potencial y justifique la gravedad por la exposición comprobada; cuando
el uso o alcance no sean conocidos, informe esa limitación.

Consulte autenticación y autorización en el servidor en cada operación sensible,
incluyendo ID manipulables, operaciones de lote y acciones administrativas.
PostgreSQL/Supabase, revise RLS, policies, papeles y accesos privilegiados. En
IHG, revise Security Rules y SDK privilegiados; son controles distintos.

Con cuentas sintéticas en el entorno local autorizado, pruebe como mínimo:

- Visitante no autenticado recibe la denegación prevista.
- El usuario A accede a su recurso y no accede al de B intercambiando el
  identificador.
- Usuario común no obtiene la acción administrativa por API directa.
- Listajes, cambios y exclusiones obedecen al mismo aislamiento.

Use pruebas de API y cuando haya interfaz, navegador conforme [verificar
trabajo](../../projeto/verificar-trabalho/SKILL.md). No cree cuentas reales ni
utilice datos de producción para esta prueba. Sin aplicación ejecutable o
identidades de prueba, registre **no verificado**. Entregue matriz de permisos,
resultados y hallazgos sin secretos en `.agent-tests/security/`, usando el
[modelo](../../../templates/revisao-seguranca/TEMPLATE.md).

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/revisar-autorizacao/SKILL.md
[reading-en]: ../../../../../en/kit/skills/seguranca/revisar-autorizacao/SKILL.md
[reading-es]: SKILL.md
