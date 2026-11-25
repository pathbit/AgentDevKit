---
description: "CLI y recursos portátiles de la primera distribución AgentDevKit."
status: aprovado
version: 0.0.1
language: es
---

# Distribución v0.0.1

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo y alcance

Distribuir el kit independiente, instalarlo en proyectos nuevos y existentes,
conforme [PRD](../../product/prd.md), [UX](../../product/ux-ui.md) e
[diseño](../../product/design.md). Incluye CLI, recursos, adaptadores, idiomas y
pruebas. Publicación depende de la validación de la entrega; no incluye backend
ni interfaz gráfica.

## Criterios de aceptación

| Criterio | Resultado observable |
| --- | --- |
| AC-001 | Tarball contiene CLI/recursos Sin resultados, descargas o secretos. |
| AC-002 | `init` instala en directorio vacío y ofrece próximos pasos. |
| AC-003 | Instalación y actualización preservan contenido propio existente. |
| AC-004 | Repetición es idempotente; simulación no altera el objetivo. |
| AC-005 | PT estándar, EN/ES y el idioma persistido funcionan con JSON válido. |
| AC-006 | Adaptadores, catálogos y sincronización reflejan el origen único. |
| AC-007 | Proyecto recibe orientación sin creación indebida de producto. |
| AC-008 | Las pruebas de la infraestructura y los escenarios de madurez pasan. |

## Plan de verificación

Evidencias: `.agent-tests/agentdevkit-v0.0.1/<execucao>/` e informes del CI. La
tabla define las pruebas; resultados reales se encuentran en el informe ignorado
de cada ejecución, sin versionar aprobaciones o salidas de pruebas en esta spec.

| Criterio | Método | Solicitante | Assertiva | Evidencia |
| --- | --- | --- | --- | --- |
| AC-001 | pack | Node/npm | Sin extras | pack.json |
| AC-002 | init | Tarball | Recursos/next | empty.json |
| AC-003 | init/update | Centinelas | Hashes iguales | existing.json |
| AC-004 | repetir/simular | Alvo | Idempotente | repeat.json |
| AC-005 | PT/EN/ES | Alvos | Idioma/JSON | languages.json |
| AC-006 | sync/check | Fuentes | Índices iguales | sync.log |
| AC-007 | next/doctor | Fases | Acción aplicable | next.json |
| AC-008 | testes/matriz | Kit | Casos pasaron | matrix.json |

Ejecute `npm test` para distribución y CLI; `npm run test:infra` para las
automaciones; y script `testar-maturidade` para los ocho escenarios. La
distribución usa `npm pack` y npx offline sobre tarball real. Sentinelas son
archivos del usuario cuyo contenido debe permanecer idéntico después de instalar
y actualizar.

## Documentación y autorización

README PT/EN/ES, instalación, producto y guías compartidos acompañan a CLI.
Escopo autorizado por la solicitud actual de creación del AgentDevKit. Criterios
mantenidos exigen prueba aprobada en la revisión antes de concluir la release.

[Todas las specs](../README.md) · [Wiki](../../README.md)

[reading-pt]: ../../../specs/v0.0.1/SPEC.md
[reading-en]: ../../../en/specs/v0.0.1/SPEC.md
[reading-es]: SPEC.md
