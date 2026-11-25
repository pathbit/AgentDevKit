---
description: "Finalidad y creación de skills compartidas."
language: es
---

# Skills

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Elija la skill por el resultado que necesita. La fuente está en
`<grupo>/<nome>/SKILL.md`. O [guía compartida](../INSTRUCTIONS.md) muestra el
orden de trabajo y el catálogo local `../catalog.json` reúne todos los recursos.

| Quiero... | Por dónde empezar |
| --- | --- |
| Descubrir en qué punto el proyecto está | [proximospasos](projeto/proximos-passos/SKILL.md) |
| Preparar un producto o configurar la tecnología aprobada | [configurar proyecto](projeto/configurar-projeto/SKILL.md) |
| Rotar o reparar un proyecto existente en la máquina | [preparar dev](projeto/preparar-dev/SKILL.md) |
| Definir el producto, la experiencia o la arquitectura | [crear-prd](produto/criar-prd/SKILL.md), [crear-ux-ui](produto/criar-ux-ui/SKILL.md) o [crear diseñodoc](produto/criar-design-doc/SKILL.md) |
| Especificar un incremento para la aprobación o entregar un incremento aprobado | [crearspec](specs/criar-spec/SKILL.md) o [implementar-spec](specs/implementar-spec/SKILL.md) |
| Elegir casos de prueba o comprobar un cambio preparado | [planificar-qa](qualidade/planejar-qa/SKILL.md) o [verificar trabajo](projeto/verificar-trabalho/SKILL.md) |
| Revisar diff o investigar una hipótesis específica de fallo | [revisar-codigo](qualidade/revisar-codigo/SKILL.md) o [validar-adversarial](qualidade/validar-adversarial/SKILL.md) |
| Diagnosticar riesgos de seguridad y priorizar correcciones | [revisar seguros](seguranca/revisar-seguranca/SKILL.md) |
| Conferir acceso, mapear amenazas o corregir un hallazgo | [revisar-autorizacion](seguranca/revisar-autorizacao/SKILL.md), [modelar-ameacas](seguranca/modelar-ameacas/SKILL.md) o [corregirvulnerabilidad](seguranca/corrigir-vulnerabilidade/SKILL.md) |

Para tareas específicas, consulte también las skills de `git`,
[backend](desenvolvimento/implementar-backend/SKILL.md),
[frontend](desenvolvimento/implementar-frontend/SKILL.md),
[arquitectura](arquitetura/avaliar-arquitetura/SKILL.md) e
[rendimiento](qualidade/avaliar-performance/SKILL.md).

Use `criar-skill` Cuando una tarea recurrente necesite decisiones propias. Para
crear otro tipo de recurso, comience por `criar-recurso`. Mantenga instrucciones
esenciales en el archivo y detalles opcionales en referencias. Use
`usar-skills-externas` para referencias curadas, `atualizar-documentacao` para
mantener los documentos y `revisar-entrega` Para concluir implementaciones.

Las skills de seguridad integran la instalación del kit. Los escáneres requieren
[preparación explícita](../commands/preparar-seguranca/COMMAND.md). Al cambiar
el inventario, sincronía los índices y apuntamientos locales.

[reading-pt]: ../../../../.pbai4devs/skills/README.md
[reading-en]: ../../../en/kit/skills/README.md
[reading-es]: README.md
