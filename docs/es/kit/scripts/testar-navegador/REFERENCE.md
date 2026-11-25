---
description: "Ejecución de escenarios reutilizables en el conector Playwright."
language: es
---

# Prueba en el navegador

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use cuando el agente tenga `browser_run_code_unsafe` com `code` e `filename`. El
script usa la página del conector, no requiere instalar Playwright en el
proyecto. Si la herramienta no existe o no comparte la página entre llamadas,
utilice las pruebas Playwright del proyecto o informe a la limitación.

1. Abra a URL real y observe los controles por el snapshot de la herramienta.
2. Em `browser_run_code_unsafe`, pase una función como esta en `code`, con los
   controles y resultados observados; no coloque credenciales en el escenario.

   ```js
   async (page) => {
     page.__agentsRequest = {
       url: 'http://localhost:3000',
       steps: [{ action: 'visible', role: 'heading', name: 'Título real' }]
     };
     return { ready: true };
   }
   ```

3. Ejecute `filename: '.pbai4devs/scripts/testar-navegador/SCRIPT.js'` En la
   misma herramienta. Consulte `passed`, cada viewport y los errores; salve el
   resultado en `.agent-tests/<tarefa>/resultado.json`.
4. Captura de pantalla con la herramienta en `.agent-tests/<tarefa>/tela.png` e
   inspecione. Encerre solamente la página o sesión abierta para esta tarea.

Por defecto, se usan 1280×800 y 390×844. El escenario acepta `viewports`,
`timeout` (máximo 30 segundos) y `title`. Cada paso usa `testId`, `label` o
`role` e `name` exactos, con una de las acciones:

| Acción | Datos |
| --- | --- |
| `visible`, `click` | Control observado |
| `text`, `fill`, `select` | `value` |
| `press` | `key` |
| `check` | `checked` (estándar: `true`) |

Es obligatorio una aserción `visible` o `text`. Console, página y red con
errores reprueban el escenario; investigar el origen sin suprimir fallas para
aprobar. Flujos destructivos requieren datos y ambiente de prueba apropiados,
con limpieza.

Para probar solo la infraestructura, ejecute `tests/SUCCESS.js` de esta carpeta
y luego el ejecutador; espere `passed: true`. Repita con `tests/FAIL.js`; espere
`passed: false` por error de consola. Estas fixtures no verifican el producto.

[reading-pt]: ../../../../../.pbai4devs/scripts/testar-navegador/REFERENCE.md
[reading-en]: ../../../../en/kit/scripts/testar-navegador/REFERENCE.md
[reading-es]: REFERENCE.md
