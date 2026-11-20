---
description: Preservação do escopo de regras geradas para Claude Code.
status: rascunho
---

# Escopo de regras no Claude Code

## Objetivo

Evitar que regras condicionais do hub sejam carregadas globalmente no Claude e
manter regras humanas, índice Git e configurações existentes intactos.

## Requisitos funcionais

- `always_on` pode ser gerada para `.claude/rules` como regra global.
- `glob` exige escopo Claude `paths` explícito e sintaticamente suportado para
  gerar regra por caminhos. Sem esse metadado, mantenha leitura explícita.
  Mesmo com ele, não presuma equivalência do glob entre clientes.
- `manual` e `model_decision` não têm equivalente automático comprovado no
  Claude. Mantenha acesso explícito sem criá-las como regras globais.
- A mesma decisão vale para gerações automáticas e entradas nativas explícitas.
  Metadados inválidos ou ambíguos não devem resultar em uma regra global.
- Preserve regras humanas e frontmatter incompatível ou ambíguo, inclusive com
  `--force`. Identidade de conteúdo não comprova propriedade.
- Ao migrar uma referência antiga, preserve caminhos sem propriedade ou
  integridade comprovadas e bloqueie remoção de conteúdo rastreado ou staged.
  Hash de bytes, isoladamente, não comprova propriedade nem preservação de
  metadados: substitutos idênticos e alterações de modo ou atributos podem ser
  humanos. Sem prova suficiente, preserve e solicite revisão.
  Uma referência antiga humana, modificada ou sem propriedade que ainda possa
  carregar globalmente deve gerar conflito: `--check` e JSON não devem indicar
  sucesso, nem a operação aplicar alterações parciais inseguras.
  A desmarcação de Claude pode preservar essas regras e concluir a seleção,
  desde que avise que elas ainda podem estar ativas e mantenha os diagnósticos
  de verificação não aprovados até que a situação seja resolvida.
- `init`, `update`, seleção de agentes, `sync` e `--check` devem aplicar o mesmo
  contrato, sem alterar configuração Git, índice ou ignores do projeto. Isso
  inclui a execução direta do script de sincronização: um `--check` não deve
  declarar sucesso se regras Claude preservadas ainda puderem estar ativas.
  Uma fronteira que impeça inspecionar `.claude/rules` também deve ser
  sinalizada quando o catálogo contiver apenas regras globais.
  A inspeção deve considerar subpastas que o Claude carrega mesmo quando seus
  nomes normalmente indicam cache; não descarte registros de regras legadas
  sem resolver sua preservação e seu possível carregamento.

## Requisitos não funcionais

Mantenha apontamentos pequenos e sem links simbólicos. `--check` é somente
leitura. Erros devem identificar o caminho e a ação necessária, sem expor
conteúdo privado. Os testes e fixtures são versionados; suas saídas não são.

## Escopo e limites

A mudança cobre destino, frontmatter, manifesto, estado, catálogo e migração de
regras Claude. A política Copilot deve ser preservada e testada. Não presume
equivalência de globs entre Claude e Antigravity nem que um link Markdown seja
carregado automaticamente. Não promete atomicidade sob edição concorrente:
essa limitação é tratada na [recuperação conservadora](../recuperacao-conservadora/SPEC.md).

## Restrições técnicas

O Claude interpreta `paths` e pode carregar uma regra sem escopo quando o YAML
é inválido. Use serialização validada e falhe antes de alterar o destino em
casos não suportados. O planejador em
`.pbai4devs/scripts/lib/claude-rule-scope.mjs` aceita um subconjunto de YAML e
está integrado ao sync local. A implementação e sua migração ainda dependem
das verificações pendentes abaixo, incluindo concorrência e Windows.

## Critérios de aceite e verificação

As evidências propostas ficam em `.agent-tests/escopo-regras-claude/`; todos os
critérios estão pendentes e exigem execução e revisão independentes.

- **AC-001 — pending:** Com Node 24+, execute os testes do planejador e de
  integração. Em regras e YAML sintéticos, gatilhos e metadados inválidos não
  ampliam escopo, inclusive em linhas `nativo` do manifesto. Referências
  manuais, por decisão ou sem `paths` não entram em `.claude/rules`.
  Evidência: `planejamento.log`.
- **AC-002 — pending:** Com Git e fixtures com conteúdo humano e staged,
  execute `init`, `update`, `agents` e `sync` e compare dados humanos, índice,
  configuração, `.git/info/exclude` e ignores byte a byte. Inclua conteúdo
  humano idêntico ou mesclado, alteração e exclusão staged, links e aliases.
  Evidência: `preservacao.log`.
- **AC-003 — pending:** Em fixtures com referências próprias, humanas, editadas
  e staged, os testes de migração removem apenas referências próprias, intactas
  e não rastreadas, com propriedade e metadados comprovados; demais casos são
  preservados e sinalizados, inclusive após desmarcar Claude. Inclua substituto
  de bytes idênticos e alterações de modo e atributos. Confira destinos, estado,
  catálogo e manifesto. Evidência: `migracao.log`.
- **AC-004 — pending:** Com Claude disponível e fixture isolada, registre
  `InstructionsLoaded` para referência gerada pelo instalador: ela carrega no
  arquivo correspondente, sem carregar no início ou fora do escopo. Verifique
  a leitura da origem separadamente. Evidência: `claude.json`.
- **AC-005 — pending:** Com seleções Claude, Copilot e Antigravity, os testes de
  adaptadores e fixtures mistas não ampliam escopo nem declaram equivalência não
  comprovada. Evidência: `clientes.log`.
- **AC-006 — pending:** Em macOS, Linux e Windows, execute testes de falhas e
  concorrência aplicáveis e registre limitações de plataforma. Assertiva: nenhuma
  pendência é contada como aprovada. Evidência: `plataformas.log`.

Os testes `tests/claude-rule-scope.test.mjs` e
`tests/claude-rule-scope-integration.test.mjs` cobrem o planejador e o sync
direto; `tests/claude-rule-cli.test.mjs` cobre entradas da CLI. Com Claude Code
2.1.322, uma regra `glob` gerada pelo sync integrado foi carregada apenas para
o arquivo correspondente; a leitura explícita da origem foi verificada em
sessão separada. Isso não comprova leitura automática da origem, a geração pelo
instalador, os demais critérios ou equivalência com Antigravity.
Em outra fixture, `InstructionsLoaded` registrou no início tanto uma referência
legada `always_on` quanto uma `model_decision`, ambas sem `paths`. Os eventos
de leitura das fontes apareceram apenas quando solicitados em sessão separada;
ausência de `Read` não descarta acesso interno. A prova usou sandbox no macOS,
com uma sessão por condição, e não demonstra obediência ou determinismo.

## Impacto na documentação

Atualizar compatibilidade, guias de recursos e CLI, índices e orientações de
migração conforme o comportamento final. Explicar referências de leitura
explícita e pendências de arquivos antigos sem propriedade comprovada.

## Dependências de outras specs

Conferir [sincronização segura](../safe-synchronization/SPEC.md),
[descoberta e preservação](../discovery-preservation/SPEC.md) e
[recuperação conservadora](../recuperacao-conservadora/SPEC.md).

## Referências e aprovação

[PRD](../../product/prd.md), [UX/UI](../../product/ux-ui.md),
[design](../../product/design.md), [roadmap](../../product/roadmap.md) e
o estado local em `.pbai4devs/state/configuracao/ESTADO.md`.

Fontes primárias: [regras do Claude](https://code.claude.com/docs/en/memory) e
[regras do Antigravity](https://antigravity.google/docs/rules/).
O usuário autorizou as melhorias; a revisão técnica, o destino exato do fallback
e os detalhes de migração ainda precisam ser concluídos antes da entrega.
