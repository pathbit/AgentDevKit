---
description: "Herramientas y skills de seguridad locales y open source."
language: es
---

# Referencias de seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Las verificaciones del kit ejecutan en el ordenador del proyecto. No requieren
cuenta, firma o envío de código a un servicio. Descargas de herramientas y bases
públicas son etapas explícitas; el análisis utiliza los archivos locales.

## Herramientas seleccionadas

| Herramienta | Origen y licencia | Función |
| --- | --- | --- |
| [Gitleaks][gitleaks] | Comunidad, MIT | Secretos en archivos y Git. |
| [OSV-Scanner][osv] | Google, Apache-2.0 | Dependencias, con base OSV local. |
| [Opengrep][opengrep] | Consórcio LGPL-2.1 | Código, con reglas locales. |

El catálogo fija versiones y hashes revisados. `install` comprueba la descarga;
`check` confiere el binario local; `update` aplica el pin revisado en el
catálogo. Ninguno de los tres requiere Python instalado. El upstream de Gitleaks
se centra en el mantenimiento y las correcciones; se debe considerar en las
próximas revisiones.

OSV debe usar `--offline`, no solamente `--offline-vulnerabilities`. La base
debe prepararse antes: ausencia de datos no es resultado limpio. Opengrep
utiliza configuración local y verificación de versión desactivada; no use
`--config auto`. La orden de auditoría normaliza los resultados y elimina
secretos y extractos de código de los informes.

## Complementos por necesidad

| Herramienta | Licencia | Cuando se considere |
| --- | --- | --- |
| [Trivy][trivy] | Apache-2.0 | Imágenes, IaC y SBOM. |
| [ZAP][zap] | Apache-2.0 | Aplicación en ejecución; exige Java. |
| [DevSkim][devskim] | MIT | Proyectos .NET; exige runtime local. |

Estos complementos no están instalados por el grupo `security`. Una adopción
exige probar su modo local, dependencias, versión y licencia. ZAP, instalación
no inicia proxy, daemon o ataque; configure identidades de prueba y objetivo
local. No Trivy, `--offline-scan` Solo no bloquea toda actualización de base.

Servicios de análisis que requieren cuenta están fuera de ese flujo. CodeQL CLI
no cumple con el requisito de código abierto; Bandit y rutinas Python se quedan
fuera del runtime adoptado. Una opción gratuita no es automáticamente open
source.

## Skills de mercado

| Fuente | Recurso | Tratamiento |
| --- | --- | --- |
| [OpenAI][openai] | Prácticas y amenazas | Apache-2.0 por carpeta. |
| [GitHub][copilot] | Revisión de seguridad | MIT. |
| [Trail of Bits][tob] | Contexto y diffs | CC-BY-SA-4.0; candidata. |

Los [pins y licencias del catálogo][catalog] evita importar un origen móvil. Las
cuatro skills propias de seguridad ya acompañan el kit; referencias externas son
opcionales y leídas por tarea, sin copiar texto a los clientes. Preserve
atribución y share-alike de los recursos de Trail of Bits. Una lista estática de
CVEs en una skill no sustituye una base actualizada.

## El artículo como punto de partida

O [artículo compartido][article] orientó cinco temas: acceso a los datos,
autorización en el servidor, acceso por ID, secretos y entradas no confiables.
El kit trata estas preguntas con verificaciones específicas:

- PostgreSQL/Supabase usa RLS Las políticas y las políticas; las que se usan
  Security Rules. Los roles privilegiados y los SDK de servidor necesitan
  controles propios.
- Ocultar un botón no permite una operación. Prueba sin sesión y con dos
  usuarios o tenants, incluyendo acceso al objeto de otra identidad.
- Variables enviadas al bundle son públicas; las variables del servidor no se
  muestran automáticamente. Un secreto confirmado requiere remoción y rotación.
- Validación de entrada, consultas parametrizadas, codificación de salida,
  controles de carga y límites de uso resuelven riesgos diferentes.

Las referencias técnicas son [RLS][rls], [Keller Rules][firebase],
[autorización][authz], [secretos][secrets] e [Cargas][uploads]. El kit no
utiliza las estadísticas del artículo como comprobación de seguridad del
proyecto.

[Seguridad en el flujo](security.md) · [Recursos](resources.md)

[gitleaks]: https://github.com/gitleaks/gitleaks/tree/v8.30.1
[osv]: https://github.com/google/osv-scanner/tree/v2.7.1
[opengrep]: https://github.com/opengrep/opengrep/tree/v1.33.1
[trivy]: https://github.com/aquasecurity/trivy
[zap]: https://www.zaproxy.org/docs/desktop/start/features/
[devskim]: https://github.com/microsoft/DevSkim
[openai]: https://github.com/openai/skills
[copilot]: https://github.com/github/awesome-copilot
[tob]: https://github.com/trailofbits/skills
[catalog]: ../../../.pbai4devs/external-skills/CATALOG.json
[article]: https://manodeyvin.com.br/p/5-vacilacoes-de-seguranca-que-a-ia
[rls]: https://supabase.com/docs/guides/database/postgres/row-level-security
[firebase]: https://firebase.google.com/docs/rules
[authz]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[secrets]: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
[uploads]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

[reading-pt]: ../../guides/security-references.md
[reading-en]: ../../en/guides/security-references.md
[reading-es]: security-references.md
