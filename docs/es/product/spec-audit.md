---
description: "Control de la revisión de las especificaciones y de sus evidencias."
status: em-andamento
language: es
---

# Control de las especificaciones

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Este índice registra el trabajo necesario para saber el estado de cada criterio.
**Pendiente** significa que la auditoría individual aún no ha sido completada;
no significa que la funcionalidad esté ausente. Releases, pruebas antiguas y
specs aprobadas ayudan a localizar evidencias, pero no reemplazan esa
conferencia.

Para cada spec, revisar sus criterios, asociar pruebas y evidencias a la versión
y al ambiente, registrar pendencias o bloqueos y distinguir decisiones
posteriores que reemplazaron criterios históricos. Archivos privados y
resultados locales permanecen fuera de Git; registrar una referencia segura o
explicar el bloqueo.

| Spec | Tema | Auditoría de los criterios |
| --- | --- | --- |
| [v0.0.1](../specs/v0.0.1/SPEC.md) | Distribución | Pendiente |
| [v0.0.2](../specs/v0.0.2/SPEC.md) | Selección de agentes | Pendiente |
| [v0.0.3](../specs/v0.0.3/SPEC.md) | Fuentes y generación local | Pendiente; revisar política Git |
| [GitHub Packages](../specs/github-packages/SPEC.md) | Paquete en GitHub | Pendiente |
| [v0.0.4](../specs/v0.0.4/SPEC.md) | Estructura y ejemplos | Pendiente |
| [v0.0.5](../specs/v0.0.5/SPEC.md) | Instalación por registro | Pendiente |
| [v0.0.6](../specs/v0.0.6/SPEC.md) | Presentación y licencia | Pendiente |
| [v0.0.7](../specs/v0.0.7/SPEC.md) | Proyectos existentes | Pendiente; revisar política Git |
| [v0.0.8](../specs/v0.0.8/SPEC.md) | Preservación y validación | Pendiente; revisar política Git y reconciliar rollback y competencia |
| [v0.0.9](../specs/v0.0.9/SPEC.md) | Agentes y documentos existentes | Pendiente |
| [Dos registros](../specs/dual-registry/SPEC.md) | Publicación sincronizada | Pendiente |
| [v0.0.10](../specs/v0.0.10/SPEC.md) | Instalación por los dos registros | Pendiente |
| [Seguridad](../specs/security-ecosystem/SPEC.md) | Ecosistema de seguridad local | Pendiente |
| [Integración aditiva](../specs/additive-integration/SPEC.md) | Integración sin sustitución | Pendiente; revisar política Git |
| [Proyectos reales](../specs/real-projects/SPEC.md) | Proyectos reales y ejemplos | Pendiente; revisar política Git |
| [Ignore del proyecto](../specs/project-ignore/SPEC.md) | Ignore raíz | Pendiente; revisar política Git |
| [Desarrollo](../specs/development-ecosystem/SPEC.md) | Ecosistema de desarrollo | Pendiente |
| [CI](../specs/ci-resilience/SPEC.md) | Confiabilidad de la pipeline | Pendiente |
| [Estado](../specs/state-directory/SPEC.md) | Carpeta de estado | Pendiente; revisar política Git |
| [Sincronización](../specs/safe-synchronization/SPEC.md) | Sincronización segura | Pendiente |
| [Ignore de clientes](../specs/client-ignore/SPEC.md) | Ignores locales | Pendiente; revisar política Git |
| [Herramienta](../specs/tool-release/SPEC.md) | Herramienta y versiones | Pendiente |
| [Etiquetas](../specs/automatic-release-tags/SPEC.md) | Etiquetas automáticas | Pendiente |
| [Descubrimiento](../specs/discovery-preservation/SPEC.md) | Descubrimiento y preservación | Pendiente |
| [Destinos](../specs/target-paths/SPEC.md) | Destinos de instalación | Pendiente |
| [Orden](../specs/preimplementation-order/SPEC.md) | Orden antes de la implementación | Pendiente |
| [Recuperación conservadora](../specs/recuperacao-conservadora/SPEC.md) | Recuperación después de fallo | Borrador; decisiones y pruebas pendientes |
| [Registro de recuperación](../specs/registro-recuperacao/SPEC.md) | Registros y transiciones | Revisión por criterio pendiente |
| [Diario en disco](../specs/diario-disco/SPEC.md) | Persistencia y publicación de registros | Revisión por criterio pendiente |
| [Manifiesto de recuperación](../specs/manifesto-recuperacao/SPEC.md) | Integridad de snapshot | Revisión por criterio pendiente |
| [Backup privado](../specs/backup-privado/SPEC.md) | Protección de las copias locales | Revisión por criterio pendiente |
| [Permisos temporales](../specs/sync-permissoes/SPEC.md) | Metadados de archivos | Revisión por criterio pendiente |
| [Escopo de reglas Claude](../specs/escopo-regras-claude/SPEC.md) | Descubrimiento y reglas legadas | Revisión por criterio pendiente |
| [Preservación TOML](../specs/toml-preservacao/SPEC.md) | Órdenes legados | Revisión por criterio pendiente |
| [Experiencia guiada](../specs/experiencia-guiada/SPEC.md) | Primeros pasos | Publicada en 0.0.34; revisión por criterio pendiente |
| [Documentación de legado](../specs/documentacao-legado/SPEC.md) | Inventario y evidencia | Publicada en 0.0.35; revisión por criterio pendiente |

Al concluir una auditoría, añade una referencia rastreable por criterio, con
estado y evidencia, y actualice la línea correspondiente. Vea
[roadmap](roadmap.md) para prioridades y dependencias.

[reading-pt]: ../../product/spec-audit.md
[reading-en]: ../../en/product/spec-audit.md
[reading-es]: spec-audit.md
