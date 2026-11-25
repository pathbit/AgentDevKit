---
description: "Recursos agénticos integrados y verificaciones locales de seguridad."
status: aprovado
version: 0.0.11
language: es
---

# Ecosistema de seguridad local

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Instalar procedimientos de seguridad con el kit y conectar skills, órdenes,
agentes, reglas, scripts y herramientas en flujos completos. Documentar la
responsabilidad de cada recurso y utilizar análisis local open source, sin
cuenta o pago obligatorio. Actualizar el talquee-ai-router por npm para 0.0.10
preservando su contenido y configuración.

## Contrato

- Skills explican procedimientos; agentes asumen una tarea y su entrega.
- Comandos organizan entradas y etapas; scripts ejecutan acciones
  determinísticas.
- Reglas orientan contextos; herramientas proporcionan capacidades locales.
- La instalación incluye fuentes de seguridad y apuntamientos de los clientes
  elegidos.
- Scanners se instala explícitamente, sin iniciar servicios.
- Descargas públicas están separados del análisis offline, con pins e
  integridad.
- Ausencia de herramienta, base o prueba nunca equivale a una auditoría
  aprobada.
- Secretos, código e informes permanecen locales.
- Scanners no sustituyen pruebas de autorización, aislamiento y reglas de
  negocio.
- Preservar historial y personalizaciones en los dos repositorios.
- Distribuir los nuevos recursos en 0.0.11, manteniendo el router fijado en
  0.0.10.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Instalación incluye skills, reglas, órdenes y perfiles de seguridad. |
| AC-002 | Docs explican componentes y flujos conectados, con casos de uso. |
| AC-003 | Tres escáneres OSS instalan, actualizan y verifican los pins locales. |
| AC-004 | Auditoría offline detecta fixtures inseguras y diferencia fallas. |
| AC-005 | Los informes no exponen secretos y permanecen ignorados por Git. |
| AC-006 | Curadoría registra fuentes, licencias, límites y correcciones del artículo. |
| AC-007 | Router en 0.0.10 preserva archivos, índice, idioma y clientes. |
| AC-008 | Regreso, paquete real, espejos y revisión independiente pasan. |

## Validación

Comprobar creación y descubrimiento de recursos en instalaciones nuevas y
existentes. Ejecutar escáneres reales contra casos seguros e inseguros locales,
con bases controladas y sin llamadas a servicios de análisis. Testar downloads,
hashes, enlaces, rollback, datos ausentes, errores de escáner y salidas
redigidas. Comparar snapshots del router antes y después de la actualización por
npm.

Código de pruebas es versionado; bases, binarios, informes y snapshots se
encuentran en `.agent-tests/`, `.local/` o `tmp/`, ignorados por Git.

[reading-pt]: ../../../specs/security-ecosystem/SPEC.md
[reading-en]: ../../../en/specs/security-ecosystem/SPEC.md
[reading-es]: SPEC.md
