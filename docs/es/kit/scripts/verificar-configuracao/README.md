---
description: "Confiere los indicadores registrados antes de la implementación."
language: es
---

# Comprobar configuración

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/verificar-configuracao/SCRIPT.mjs
```

Para consultar únicamente la preparación antes de la spec, añade `--preparacao`.
En ese modo, las preferencias técnicas pendientes no bloquean la consulta.

Sólo lectura: sin la opción, retorna `1` Si el estado está ausente, inaccesible,
ambiguo o con preparación o configuración pendiente. Devuelve `0` e
`verificar-evidencias` cuando ambos indicadores registran `concluido`. Com
`--preparacao`, el mismo resultado exige apenas el indicador de preparación.
Para evitar ambigüedades, rechazo claves complejas y etiquetas, anclas, aliases
o mezclajes en la parte superior de la cabecera. Links simbólicos detectados son
rechazados; la lectura no es un bloqueo atómico contra cambios simultáneos de
caminos. No valida el YAML entero, infraestructura o pruebas; los comprueba
antes de escribir. El comando no bloquea cambios de los que ignore su resultado.

El estado legado se reconoce sin migración; los estados en conflicto se niegan.
Los errores de uso retornan `2`.

[reading-pt]: ../../../../../.pbai4devs/scripts/verificar-configuracao/README.md
[reading-en]: ../../../../en/kit/scripts/verificar-configuracao/README.md
[reading-es]: README.md
