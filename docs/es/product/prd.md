---
description: "Requisitos de distribución portátil AgentDevKit."
status: aprovado
version: 0.0.12
language: es
---

# PRD AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Problema y público

Los desarrolladores necesitan reutilizar instrucciones de agentes entre
proyectos y clientes sin copiar procedimientos divergentes, perder
configuraciones locales o iniciar código antes de definir el producto.

AgentDevKit atiende a personas y equipos que utilizan agentes de desarrollo en
proyectos nuevos o existentes. La primera entrega distribuye el kit ya extraído
del proyecto de origen como producto independiente.

## Requisitos

| ID | Resultado esperado |
| --- | --- |
| FR-001 | Instalar y actualizar un origen único `.pbai4devs`. |
| FR-002 | Generar entradas según el descubrimiento nativo de cada cliente. |
| FR-003 | Preservar código, documentos, configuraciones y datos existentes. |
| FR-004 | Ofrecer CLI Node 24+ con idioma persistido: PT estándar, EN y ES. |
| FR-005 | Indicar estado, esperas y próximos pasos en cada resultado. |
| FR-006 | Seguir preparación, producto, diseño, configuración, specs y revisión. |
| FR-007 | Distribuir testes/modelos Sin resultados, secretos o descargas. |
| FR-008 | Validar el paquete local y preparar la release v0.0.1. |
| FR-009 | Seleccionar agentes y crear solo sus apuntes necesarios. |
| FR-010 | Reutilizar la selección y modificarla sin perder archivos propios. |
| FR-011 | Versionar las fuentes; mantener derivaciones y preferencias locales. |
| FR-012 | Generar diseños nativos a partir de configuraciones y plantillas. |
| FR-013 | Usar JavaScript/Node en las automaciones y mantener la distribución vía npx. |
| FR-014 | Reutilizar en el release el paquete verificado sin duplicar el CI. |
| FR-015 | Publicar en el npm público, instalable vía npx sin autenticación. |
| FR-016 | Organizar código y pruebas en `src/` e `tests/`, en la raíz. |
| FR-017 | Generar ejemplos aislados y accesibles por órdenes documentadas. |
| FR-018 | Publicar autoría PathBit, palabras clave y licencia MIT el npm. |
| FR-019 | Ver README legible en el npm sin alterar la fuente Markdown. |
| FR-020 | Llevar la licencia del kit al hub sin alterar la licencia del proyecto. |
| FR-021 | Inventaría documentos existentes antes de proponer modificaciones. |
| FR-022 | Complementar documentación sin reemplazar archivos por plantillas. |
| FR-023 | Prueba el flujo documental en proyectos reales y en proyecto vacío. |
| FR-024 | Incluir procedimientos de seguridad en las instalaciones del kit. |
| FR-025 | Componer entregas con agentes, skills, órdenes, scripts y reglas. |
| FR-026 | Auditar localmente con herramientas OSS y informes sin secretos. |
| FR-027 | Complementar instrucciones existentes sin reemplazar contenido humano. |

Execuciones repetidas deben ser idempotentes; a CLI Ofrece simulación y JSON.
Las instrucciones permanecen concisas, con detalles opcionales en referencias.
En la configuración interactiva, el usuario elige a sus agentes. En
automaciones, la opción explícita o la elección salva orientan el instalador. En
la versión de este PRD, la ausencia de elección seleccionaba a todos los
clientes por compatibilidad. O [guía de instalación][install] documenta los
patrones actuales y de migración.

## Límites y éxito

El kit no define el stack de los proyectos, no publica automáticamente, no crea
PRD/specs Sin descubrimiento y no comprueba la carga del cliente sólo por
generar archivos. No copia documentos reales de producto para el proyecto
objetivo.

La entrega exige pruebas de proyecto vacío y existente, preservación de
archivos, actualización, idiomas, catálogos y distribución sin artefactos
locales. Los aceptados de la distribución se encuentran en la [spec
inicial](../specs/v0.0.1/SPEC.md); a [spec de
selección](../specs/v0.0.2/SPEC.md) detalla la instalación por agente. A [spec
v0.0.6](../specs/v0.0.6/SPEC.md) trata la presentación pública, la licencia
distribuida y la actualización verificada del proyecto de origen.

## Autorización

Escopo autorizado por la solicitud explícita de creación del AgentDevKit. Este
estado registra requisitos aceptados; pruebas y publicación tienen validación
propia y no son considerados concluidos por esta aprobación.

[Wiki](../README.md) · [Diseño](design.md) · [Flujo de
uso](../guides/workflow.md)

[install]: ../guides/installation.md#opciones-y-verificaci%C3%B3n

[reading-pt]: ../../product/prd.md
[reading-en]: ../../en/product/prd.md
[reading-es]: prd.md
