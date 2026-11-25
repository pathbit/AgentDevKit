---
description: "Incrementos verificables de AgentDevKit."
language: es
---

# Specs

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

- [v0.0.1](v0.0.1/SPEC.md): primera distribución independiente.
- [v0.0.2](v0.0.2/SPEC.md): selección persistente de agentes por proyecto.
- [v0.0.3](v0.0.3/SPEC.md): fuentes, salidas locales y automaciones Node.
- [GitHub Packages](github-packages/SPEC.md): paquete npm instalable vía npx.
- [v0.0.4](v0.0.4/SPEC.md): estructura estándar y ejemplos en la raíz.
- [v0.0.5](v0.0.5/SPEC.md): instalación por el registro en todos los flujos.
- [v0.0.6](v0.0.6/SPEC.md): presentación pública, licencia y actualización
  segura.
- [v0.0.7](v0.0.7/SPEC.md): proyectos reales y protección local de artefactos.
- [v0.0.8](v0.0.8/SPEC.md): preservación, transacciones y validación profunda.
- [v0.0.9](v0.0.9/SPEC.md): coexistencia y evolución documental sin pérdidas.
- [Dos registries](dual-registry/SPEC.md): versión y bytes iguales en npm y
  GitHub.
- [v0.0.10](v0.0.10/SPEC.md): release con instalación por los dos registries y
  prerrequisitos.
- [Ecosistema de seguridad](security-ecosystem/SPEC.md): flujos y escáneres
  locales.
- [Ecosistema de desarrollo](development-ecosystem/SPEC.md): especialistas,
  colaboración y pruebas.
- [Confiabilidad de la pipeline](ci-resilience/SPEC.md): pruebas y releases.
- [Carpeta de estado](state-directory/SPEC.md): migración segura a `state`.
- [Sincronización segura](safe-synchronization/SPEC.md): preservar recursos
  propios.
- [Escopo de reglas Claude](escopo-regras-claude/SPEC.md): evitar activación
  global indebida e migrar apuntamientos con preservación.
- [Integración sin sustitución][additive]: añadidos en archivos existentes.
- [Compatibilidad con proyectos reales][oss]: proyectos públicos y ejemplos
  reproducibles.
- [Ignore del proyecto](project-ignore/SPEC.md): preservar el archivo raíz.
- [Ignore de clientes](client-ignore/SPEC.md): patrón local y excepciones del
  proyecto.
- [Herramienta y versiones](tool-release/SPEC.md): Actualización segura y
  etiquetas de release.
- [Etiquetas automáticas](automatic-release-tags/SPEC.md): publicación tras CI
  aprobada.
- [Destinos temporales](target-paths/SPEC.md): caminos correctos y enlaces
  seguros.
- [Orden antes de la implementación](preimplementation-order/SPEC.md): producto,
  spec y configuración antes del código.
- [Descubrimiento y preservación](discovery-preservation/SPEC.md): rutas de
  skills, sincronización segura y validación en proyectos reales.
- [Recuperación conservadora](recuperacao-conservadora/SPEC.md): borrador para
  preservar contenido humano y orientar recuperación después de fallas.
- [Registro de recuperación](registro-recuperacao/SPEC.md): contrato de los
  registros y pruebas del componente.
- [Diario en disco](diario-disco/SPEC.md): publicación exclusiva de registros.
  La integración al instalador y al sync está en el changelog de 0.0.31.
- [Manifiesto de recuperación](manifesto-recuperacao/SPEC.md): copias privadas
  verificables del snapshot informado al mecanismo de recuperación.
- [Permisos temporales](sync-permissoes/SPEC.md): protección del modo de
  archivos existentes durante la sincronización.
- [Backup privado](backup-privado/SPEC.md): aislamiento de la carpeta de copias
  del instalador, con límites explícitos por plataforma.
- [Preservación TOML](toml-preservacao/SPEC.md): borrador histórico con pruebas
  de edición y retirada selectiva en instalaciones legadas.
- [Experiencia guiada](experiencia-guiada/SPEC.md): primer uso y próximos pasos
  conforme el estado del proyecto.
- [Documentación de legado](documentacao-legado/SPEC.md): inventario,
  documentación por módulo y evidencia en el código y en las pruebas.

Cada incremento vincula requisitos, criterios, pruebas y evidencias locales.
[roadmap](../product/roadmap.md) distingue releases publicadas de trabajo
pendiente. Las specs registran el contrato de la época, incluyendo los
estándares históricos de selección de clientes y exclusión de Git. Los guías de
trabajo pendientes. [instalación](../guides/installation.md) e
[CLI](../guides/cli.md) documentan el comportamiento actual. O [control de las
specs](../product/spec-audit.md) registra los criterios cuya revisión y
validación están pendientes.

Estos son los incrementos del propio AgentDevKit. Para crear una spec de su
proyecto, siga el [flujo](../guides/workflow.md) y use los [modelos
compartidos](../kit/templates/README.md).

[Wiki](../README.md) · [Roadmap](../product/roadmap.md)

[additive]: additive-integration/SPEC.md
[oss]: real-projects/SPEC.md

[reading-pt]: ../../specs/README.md
[reading-en]: ../../en/specs/README.md
[reading-es]: README.md
