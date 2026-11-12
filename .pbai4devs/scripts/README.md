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
Com Node 18+, use o [bootstrap JavaScript](preparar-ferramentas/BOOTSTRAP.md)
com `--runtime-only` para preparar Node 24+ e continuar a operação.
Sem Node/npm, o agente instala primeiro pelo mecanismo do sistema operacional.
Não há inicializadores `.sh` ou `.ps1` no kit.

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
| `testar-maturidade` | Gera e executa cenários em `examples/generated/` |
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

Os layouts vêm de `templates/clients/ADAPTERS.json` no hub. O manifesto local
`espelhos.conf` é gerado dessa fonte. Os metadados nativos ficam ao lado dos
recursos, com frontmatter YAML sem corpo. Caminhos são relativos à raiz.
Somente os quatro arquivos principais são fontes; não registre documentos.
Use `gitignore|pasta` para gerar apenas o `.gitignore`, como em `.vscode`.

`sincronizar-agentes --force` repara os destinos gerenciados com backup em
`.agent-tests/`. Recursos e configurações humanos permanecem intactos, inclusive
quando ocupam o caminho de um apontamento. `--check` não altera arquivos.
O sincronizador também gera o catálogo completo e os índices auxiliares a partir
das fontes. Helpers e testes constam como suporte, sem fingir comandos próprios.
Ele protege os derivados contra versionamento e preserva regras humanas.
As políticas vêm dos modelos de gitignore; o estado e os índices são locais.
Os exemplos de maturidade usam cópias locais, sem downloads ou estado pessoal.
