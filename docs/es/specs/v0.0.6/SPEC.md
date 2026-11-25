---
description: "Presentación pública, licencia y actualización verificada del kit."
status: aprovado
version: 0.0.6
language: es
---

# Presentación pública y licencia

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo y autorización

Publicar una versión estable de AgentDevKit con identificación clara en el npm,
README legible y licencia incluida en el hub instalado. Después de la
publicación, actualizar el `talquee-ai-router` preservando sus archivos y datos.

Escopo autorizado por la solicitud del usuario. La aprobación permite ejecutar
el trabajo; pruebas, publicación y actualización exigen sus propias pruebas.
Dependencias: [PRD](../../product/prd.md), [diseño](../../product/design.md) e
[instalación por el registro](../v0.0.5/SPEC.md).

## Contrato

- Declarar autor PathBit, palabras clave relevantes y licencia MIT en el
  paquete.
- Derivar README publicado de la fuente sin alterar el archivo versionado:
  eliminar YAML y convertir enlaces locales a URLs absolutas de GitHub.
- Usar el `LICENSE` la raíz del paquete como fuente de `.pbai4devs/LICENSE`.
  Preservar la licencia de la raíz del consumidor y proteger conflictos en el
  hub.
- Mantener Node 18+ en el launcher y Node 24+ en el núcleo; aislar credenciales
  y caché en las pruebas de consumo público, sin instalar herramientas
  implícitamente.
- Confirmar `latest`, integridad y descarga antes de las pruebas anónimas.
- Simular la actualización del router, conferir propiedad y preservar datos,
  configuraciones, herramientas locales y commits humanos existentes.

No crear documentos de producto en el router, redefinir su licencia ni cambiar
versiones publicadas. La entrega no promete la ausencia total de bugs.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Paquete identifica PathBit, palabras clave y licencia MIT. |
| AC-002 | README del TGZ no tiene YAML; enlaces locales se vuelven absolutos. |
| AC-003 | Hub recibe la licencia canónica sin alterar la del consumidor. |
| AC-004 | Runtime y consumo público mantienen los contratos de medio ambiente. |
| AC-005 | Versión estable en `latest` instala y opera sin autenticación. |
| AC-006 | Router actualizado preserva archivos, datos y commits anteriores. |

## Plan de verificación

Los resultados se encuentran en `.agent-tests/public-package/`, separados de
esta spec. El código de las pruebas es versionado. Cada prueba registra comando,
versión, prerrequisitos, asertiva y camino de la evidencia en el informe de
revisión.

- **AC-001:** inspeccionar el `package.json` del TGZ exacto y metadados del npm;
  comparar autoría palabras clave, MIT y versión con la fuente aprobada.
- **AC-002:** probar empaquetado y extraer el TGZ; verificar la primera línea,
  enlaces de arquivos/imagens y preservación de los bytes README fuente.
- **AC-003:** realizar pruebas de instalación y distribución en proyectos nuevos
  y existentes; comparar las licencias, probar conflicto, backup y diagnóstico.
- **AC-004:** realizar pruebas de launcher, publicación y distribución; probar
  compatibilidad de runtime, caché aislado y ausencia de tokens en el
  consumidor.
- **AC-005:** publicar el artefacto aprobado; consultar `latest` y descarga;
  ejecutar `--version`, `init`, `doctor` e `sync --check` En destino y caché
  nuevos.
- **AC-006:** salvar hashes y estado Git del router, revisar `--dry-run`,
  aplicar la versión fijada y repetir diagnóstico/sincronização; comparar
  archivos propios, ocho recibos de herramientas e histórico con el estado
  anterior.

La revisión independiente confiere el informe y los hallazgos antes de la
conclusión. Este cambio exige terminal y registro npm; no altera la interfaz
web/desktop.

## Documentación afectada

Actualizar README público, guías de instalação/publicação, PRD, diseño, roadmap,
índice de specs, changelog y descripción de la licencia en el hub. Revisar
solamente los tramos del README del router afectado por la actualización,
preservando su contexto.

[Specs](../README.md) · [Paquete npm](../../maintainers/packages.md)

[reading-pt]: ../../../specs/v0.0.6/SPEC.md
[reading-en]: ../../../en/specs/v0.0.6/SPEC.md
[reading-es]: SPEC.md
