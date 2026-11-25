---
description: "Run reusable scenarios on the Playwright connector."
language: en
---

# Test in browser

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use it when the agent has `browser_run_code_unsafe` with `code` e `filename`.
The script uses the connector page, does not require installing Playwright in
the project. If the tool does not exist or does not share the page between
calls, use the project Playwright tests or report the limitation.

1. Open the URL real and observe the controls by the tool snapshot.
2. In `browser_run_code_unsafe`, pass a function like this on `code`, with the
   controls and results observed; do not place credentials in the scenario.

   ```js
   async (page) => {
     page.__agentsRequest = {
       url: 'http://localhost:3000',
       steps: [{ action: 'visible', role: 'heading', name: 'Título real' }]
     };
     return { ready: true };
   }
   ```

3. Run `filename: '.pbai4devs/scripts/testar-navegador/SCRIPT.js'` in the same
   tool. Check out `passed`, each viewport and errors; save the result in
   `.agent-tests/<tarefa>/resultado.json`.
4. Capture the screen with the tool in `.agent-tests/<tarefa>/tela.png` and
   inspect it. Close only the page or session opened for this task.

By default, 1280×800 and 390×844 are used. `viewports`, `timeout` (maximum 30
seconds) and `title`. Each step uses `testId`, `label` or `role` e `name` exact,
with one of the actions:

| Action | Data |
| --- | --- |
| `visible`, `click` | Observed control |
| `text`, `fill`, `select` | `value` |
| `press` | `key` |
| `check` | `checked` (default: `true`) |

An assertion is required `visible` or `text`. Console, page and network with
errors fail the scenario; investigate the origin without suppressing faults to
approve. Destructive flows require appropriate data and testing environment,
with cleaning.

To only prove the infrastructure, run `tests/SUCCESS.js` from this folder and
then the executable; wait `passed: true`. Repeat with `tests/FAIL.js`; wait
`passed: false` by console error. These fixtures do not check the product.

[reading-pt]: ../../../../../.pbai4devs/scripts/testar-navegador/REFERENCE.md
[reading-en]: REFERENCE.md
[reading-es]: ../../../../es/kit/scripts/testar-navegador/REFERENCE.md
