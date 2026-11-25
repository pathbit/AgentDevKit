---
description: "Modelos por fase y mantenimiento de los documentos del proyecto."
language: es
---

# Plantillas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Orden: preparación → PRD → UX/UI → diseño → roadmap → spec y plan aprobados →
configuración técnica → implementación y revisión → release. Use las skills
correspondientes para reunir respuestas y rellenar los modelos. Archivos en esta
carpeta son bases, no documentos aprobados. No cree `docs/` Mientras el usuario
está preparando solamente la estructura de los agentes.

| Modelo | Comenzar en | Evoluir cuando |
| --- | --- | --- |
| [README raíz][readme] | Preparación | Fase, uso o capacidad cambiar. |
| [README de carpeta][pasta] | Creación de la carpeta | Entradas o finalidad cambiar. |
| [AGENTS][agentes], [CLAUDE][claude] cuando se selecciona | Preparación | Estructura o cliente cambiar. |
| [Entradas raíz][entrypoints] | Instalación | Cliente cambiar. |
| [Preferencias][config] | Preparación | Producto y stack se definen. |
| [Archivos raíz][raiz] | Preferencias | Contratos cambiar. |
| [Gitignore][ignore] | Preparación | Los artefatos ignorados cambian. |
| [PRD][prd] | Producto | Escopo o criterios de éxito cambiar. |
| [UX/UI][ux], [diseño][design] | Después de PRD, en el orden de trabajo | Jornadas o arquitectura cambian. |
| [Roadmap][roadmap] | Después de diseño | Los aumentos o las prioridades cambian. |
| [ADR][adr] | Diseño | Decisión estructural for aceita/substituída. |
| [Ambiente local][ambiente] | Preferencias | Stack o setup cambiar. |
| [Levantamiento de legado][levantamento] | Documentar sistema en uso | Surgieron evidencias o dudas nuevas. |
| [Contribución][contrib] | Preferencias | Flujo de desarrollo cambiar. |
| [Spec][spec], [plano][plano] | Planificación de la entrega | Escopo, criterios o ejecución cambiar. |
| [Tareas][tasks] | Aplicación aprobada | Ejecución o evidencia cambiar. |
| [Revisión de entrega][revisao] | Implementación | Antes de commit/merge. |
| [Release][release], [CHANGELOG][changelog] | Primera entrega | Publicar. |
| [SECURITY][security] | Soporte público | Política/suporte cambiar. |
| [Revisión de seguridad][security-review] | Análisis autorizado | Amenazas y pruebas. |
| [Orden][comando] | Recurso agéntico | Entrada o flujo cambiar. |

Antes, inventare y lea los documentos existentes con `atualizar-documentacao`.
Utilice los modelos como lista de lagunas. Copie solamente artefactos aplicables
todavía ausentes; nunca reemplace documentos existentes. Remova placeholders y
confirme hechos en los nuevos archivos; preserve nombres, formatos, secciones y
decisiones anteriores. README acompaña el proyecto desde la preparación; los
documentos de producto surgen después del descubrimiento. Seguridad depende de
soporte y canal realmente definidos.

Criterios de spec usan IDs AC-001. El código de las pruebas se ve en el ensayo;
los resultados se encuentran en `.agent-tests/<referencia>/<execucao>/`. El
único informe de revisión es el JSON generado por el script; el modelo explica
el contrato, sin duplicarlo en MD. Baseline y silo se metan a generar para
detectar cambios posteriores. Modelos, configuraciones e informes no se reflejan
en las carpetas de los agentes.

[readme]: readme-projeto/TEMPLATE.md
[pasta]: readme-pasta/TEMPLATE.md
[agentes]: instrucoes-agentes/TEMPLATE.md
[claude]: claude/TEMPLATE.md
[entrypoints]: ../../../../.pbai4devs/templates/entrypoints/
[config]: configuracao/TEMPLATE.md
[raiz]: configuracao-raiz/TEMPLATE.md
[ignore]: gitignore/TEMPLATE.md
[prd]: prd/TEMPLATE.md
[roadmap]: roadmap/TEMPLATE.md
[ux]: ux-ui/TEMPLATE.md
[design]: design/TEMPLATE.md
[adr]: adr/TEMPLATE.md
[ambiente]: ambiente-local/TEMPLATE.md
[levantamento]: levantamento-legado/TEMPLATE.md
[contrib]: contribuicao/TEMPLATE.md
[spec]: spec/TEMPLATE.md
[plano]: plano-implementacao/TEMPLATE.md
[tasks]: tasks/TEMPLATE.md
[revisao]: revisao-entrega/TEMPLATE.md
[release]: release/TEMPLATE.md
[changelog]: changelog/TEMPLATE.md
[security]: seguranca/TEMPLATE.md
[security-review]: revisao-seguranca/TEMPLATE.md
[comando]: comando/TEMPLATE.md

[reading-pt]: ../../../../.pbai4devs/templates/README.md
[reading-en]: ../../../en/kit/templates/README.md
[reading-es]: README.md
