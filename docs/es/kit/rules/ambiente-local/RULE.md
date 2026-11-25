---
trigger: always_on
description: "Estructura mínima y ambiente local de los proyectos con Docker Compose."
language: es
---

# Ambiente local

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

En la configuración técnica de proyectos nuevos, mantenga `.pbai4devs/` y
gestiona solo los clientes seleccionados. Configure `.vscode/` Cuando este
editor sea adoptado. Para la aplicación, cree `src/`, `tests/` e
`infra/compose/compose.local.yml`. Son obligatorios `.gitignore`,
`.gitattributes`, `.editorconfig`, `.dockerignore`, `Makefile` e `README.md`;
`scripts/` Es opcional para automaciones de la aplicación. En proyectos
existentes, preserve la organización hasta una estandarización autorizada y siga
las órdenes de la stack en uso.

Use Docker Compose en proyectos nuevos y en los existentes que ya lo adoptan.
Esclareza servicios y versiones, bancos, caché, filas, integraciones, recursos,
secretos, puertas y datos existentes. Pregunte la puerta de entrada; si el
usuario no sabe, elija una libre y registre. Publique solamente lo necesario en
localhost, con healthchecks y persistencia explícita. Preserve volúmenes; no
ejecute `down -v` Como rutina.

Traefik es opcional para compartir la puerta de entrada entre aplicaciones con
hosts diferentes. Use configuración de archivo o proxy restringido para el
descubrimiento; no exponga de lashboard ni acceso irrestrito al socket Docker.

Cuando Makefile forma parte de la configuración técnica, debe ofrecer `help`,
`doctor`, `setup`, `up`, `down`, `logs`, `test`, `lint` e `build`, con órdenes
reales de stack. Etapas aún indefinidas deben fallar con mensaje útil; no simule
éxito. Documente las órdenes, dependencias y URL/porta el README; valide la
salud y la configuración de Compose cuando sea aplicable. Antes de existir
aplicación, valide runtime, Compose y los servicios de infraestructura
necesarios. Build, salud y flujo de la aplicación inexistente permanecen
pendientes; no cree código de negocio para simular esas pruebas. Si una
dependencia obligatoria no está disponible, mantenga la configuración pendiente
y registre el impedimento. Después de la implementación, pruebe la aplicación.

Use el [modelo de entorno](../../templates/ambiente-local/TEMPLATE.md) para
preguntas y archivos-base. Versiones de la aplicación siguen las decisiones del
proyecto; actualización de herramientas locales no actualiza bancos o
dependencias de la stack.

[reading-pt]: ../../../../../.pbai4devs/rules/ambiente-local/RULE.md
[reading-en]: ../../../../en/kit/rules/ambiente-local/RULE.md
[reading-es]: RULE.md
