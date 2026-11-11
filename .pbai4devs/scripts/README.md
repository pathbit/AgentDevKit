---
description: Seleção e uso das automações compartilhadas.
---

# Scripts

Pré-requisito: [Node.js 24+ com npm](https://nodejs.org/en/download),
preferencialmente uma versão LTS. Automações próprias usam `.mjs` e o mesmo
comando em macOS, Linux e Windows. Bun não faz parte do contrato validado.
Versione scripts e testes; salve somente resultados em `.agent-tests/`.
Prepare ferramentas locais com `preparar-ferramentas`, sem instalações globais.
O runtime da aplicação será decidido no design doc; este requisito é dos agentes.
Sem Node/npm, use o [bootstrap nativo](preparar-ferramentas/BOOTSTRAP.md) com
`--runtime-only` no shell ou `-RuntimeOnly` no PowerShell para preparar apenas
o runtime e continuar a operação. O modo padrão também prepara as ferramentas.
Esses inicializadores são a única exceção ao uso de `.mjs`.

Na raiz do repositório, use o seletor (adicione `--plan` antes do nome para
consultar sem executar):

```sh
node .pbai4devs/scripts/executar-script/SCRIPT.mjs diagnosticar-ambiente
```

| Nome | Finalidade |
| --- | --- |
| `diagnosticar-ambiente` | Runtimes, pacotes e navegadores disponíveis |
| `inspecionar-projeto` | Detecta manifests, comandos e estrutura |
| `preparar-ferramentas` | Instala/atualiza ferramentas locais |
| `gerenciar-skills-externas` | Instala/check/read de skills curadas locais |
| `revisar-entrega` | Confere documentação, revisão e provas da mudança |
| `sincronizar-agentes` | Repara com `--force`; `--check` só confere |
| `verificar-recursos` | Estrutura Markdown, links e espelhos |
| `testar-infraestrutura` | Executa `tests/TEST.mjs` com Node |
| `testar-maturidade` | Gera e executa cenários em `tmp/examples/` |
| `testar-navegador` | Cenários via conector Playwright; veja a [referência](testar-navegador/REFERENCE.md) |

Cada [ferramenta](../tools/README.md) tem `TOOL.json` e um `SCRIPT.mjs`,
com ações `install`, `update`, `check`, `info` e `run`.
Esses scripts delegam ao mesmo instalador; downloads ficam em `.local/`.
`preparar-ferramentas setup` instala e verifica todos os CLIs compatíveis.
Para um grupo, use `setup base`, `install base` ou `update base`;
`check base` não instala nem consulta novas versões.

O teste `preparar-ferramentas/tests/SMOKE_VERCEL.mjs` verifica CLIs opcionais
instaladas com fixtures locais. Execute com Node; resultados ficam em
`.agent-tests/vercel-labs/`. A suíte comum permanece independente desses downloads.

O seletor aceita nome ou caminho JavaScript, repassa os argumentos e preserva
o código de saída. Ele não procura outros interpretadores após uma falha.
`playwright-mcp` exige o conector: seu `SCRIPT.js` é código para uma página,
não um programa Node. Novas automações usam `.mjs`; `.bun` não é necessário.
Os testes de cada script ficam em `<nome>/tests/`; resultados e capturas em
`.agent-tests/`. Scripts, modelos e ferramentas não têm cópias nos agentes.

No [espelhos.conf](../espelhos.conf), use `agente|pasta|plano` ou
`nativo|destino|origem|metadados.yaml`; o último campo é opcional. Os metadados
ficam ao lado da origem, com frontmatter YAML sem corpo. Sem `plano`, mantém
o agrupamento. Caminhos são relativos à raiz; não use `|` ou quebras de linha.
Somente os quatro arquivos principais são fontes; não registre documentos.
Use `gitignore|pasta` para gerar apenas o `.gitignore`, como em `.vscode`.

`sincronizar-agentes --force` reconstrói os destinos e limpa auxiliares,
preservando configurações e workflows fora do escopo gerenciado. Conteúdo
próprio substituído recebe backup em `.agent-tests/`; `--check` não altera nada.
O sincronizador também gera o catálogo completo e os índices auxiliares a partir
das fontes. Helpers e testes constam como suporte, sem fingir comandos próprios.
Ele mantém os blocos gerenciados nos `.gitignore` locais e preserva regras
próprias externas ao bloco. As listas permitidas vêm dos modelos de gitignore.
Os exemplos de maturidade usam cópias locais, sem downloads ou estado pessoal.
