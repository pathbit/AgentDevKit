---
description: "Verificación de los recursos compartidos y de sus apuntamientos."
language: es
---

# Comprobar recursos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs --source-only
node --test .pbai4devs/scripts/verificar-recursos/tests/TEST.mjs
```

Exige Node 24+. Confiere espejos, frontmatter/H1, enlaces locales y guías de
herramientas. Ignora paquetes descargados y resultados temporales, incluso
Playwright en cualquier caja. Fixtures comunes siguen verificadas. Incluye
Markdown de la raíz, de `docs/`, `src/`, `bin/`, `tests/`, `scripts/`,
`examples/` y plantillas de contribución de GitHub. Excluidas
`examples/generated/`. Esta recolección utiliza solamente el directorio
informado, sin buscar otro repositorio Git. Usa Markdown lint local cuando
instalado e informa su ausencia. No instala ni sincroniza recursos. Pruebas y
fixtures son versionados; temporales quedan en `.agent-tests/`.

`--source-only` valida las fuentes sin exigir catálogos, manifiesto o clientes
generados. Referencias a los índices derivados son conferidas por el catálogo en
memoria; enlaces a fuentes inexistentes siguen siendo errores.

[reading-pt]: ../../../../../.pbai4devs/scripts/verificar-recursos/README.md
[reading-en]: ../../../../en/kit/scripts/verificar-recursos/README.md
[reading-es]: README.md
