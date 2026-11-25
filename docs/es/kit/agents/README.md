---
description: "Finalidad y creación de perfiles de agentes."
language: es
---

# Agentes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El perfil compartido usa metadatos portátiles. YAMLs al lado del origen adaptan
campos y permisos por cliente. La integración utiliza `templates/clients/`,
fuera de las instrucciones distribuidas a los proyectos. Consulte a
[compatibilidad](../COMPATIBILIDADE.md) Antes de prometer el descubrimiento.

Perfis definen papel, entrada, resultado, herramientas y límites. Use
`criar-agente` Cuando una tarea justifique revisión o delegación especializada,
cada perfil usa `<nome>/AGENT.md`.

O [revisor](revisor/AGENT.md) examina los cambios sin editarlos. Cada cliente
recibe el formato previsto por su adaptador; cuando una entrada no sea
descubierta automáticamente, pida lectura explícita de la fuente compartida.

| Perfil | Entrega |
| --- | --- |
| [Planificador](planejador/AGENT.md) | Dudas, alcance y plan verificable. |
| [Implementador](implementador/AGENT.md) | Código, pruebas y documentación. |
| [Architeto de software](arquiteto/AGENT.md) | Decisiones, contratos y riesgos de arquitectura. |
| [Especialista backend](especialista-backend/AGENT.md) | Aplicación y contratos de servicios. |
| [Especialista frontend](especialista-frontend/AGENT.md) | Implementación y flujos de interfaz. |
| [Ingeniero de QA](engenheiro-qa/AGENT.md) | Estrategia y pruebas funcionales y adversarias. |
| [Analista de performance](analista-performance/AGENT.md) | Mediciones comparables e investigación de cuellos. |
| [Validador](validador/AGENT.md) | Resultado real por criterio de aceptación. |
| [Interventor de seguridad](auditor-seguranca/AGENT.md) | Triaje y pruebas de controles. |
| [Documentador](documentador/AGENT.md) | Documentos coherentes con la entrega. |
| [Revisor](revisor/AGENT.md) | Dictamen independiente del estado final. |

El agente principal distribuye el contexto, limita los archivos de cada tarea y
reúne los resultados. Un perfil no necesita llamar otro directamente: cuando el
cliente prohíbe la delegación aninhada, devuelve el siguiente paso al principal.
Vea [catálogo de órdenes](../commands/README.md) Para saber cuál flujo acciona
cada papel y qué resultados recibe.

Sidecars limitan herramientas donde el formato permite. El planificador utiliza
lectura; los validadores tienen terminal para producir evidencias, sin editar
fuentes. Permitir terminal no crea aislamiento por directorio. Respeta los
permisos del ambiente y no trate instrucciones como substitutas de sandbox.

[reading-pt]: ../../../../.pbai4devs/agents/README.md
[reading-en]: ../../../en/kit/agents/README.md
[reading-es]: README.md
