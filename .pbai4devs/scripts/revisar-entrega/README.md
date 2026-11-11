---
description: Verificação dos documentos, da revisão e das evidências da entrega.
---

# Revisar entrega

Após implementar, atualizar a documentação afetada e testar, gere o registro:

```sh
node .pbai4devs/scripts/revisar-entrega/SCRIPT.mjs prepare --id minha-mudanca
```

Use `--spec caminho/SPEC.md` para extrair os critérios `AC-001` da spec.
`--scope arquivo` limita uma revisão; sem ele, o snapshot reúne alterações Git.
Use `--document arquivo` para incluir PRD, design e outros documentos.
README, AGENTS, CLAUDE e GEMINI versionáveis na raiz entram automaticamente na
revisão, mesmo sem alterações. Saídas locais ignoradas fora do índice não são
documentos obrigatórios; documentos rastreados continuam cobertos mesmo quando
uma regra de ignore corresponde ao nome.
Preencha decisões, resultados e evidências no JSON retornado; peça revisão
independente, execute `seal <caminho/revisao.json>` e depois
`check <caminho/revisao.json>` antes de concluir.

O check recusa resultados pendentes, evidências ausentes/versionadas e arquivos
alterados depois da revisão. Relatórios ficam em
`.agent-tests/<id>/<execução>/`.
O preparo preserva o escopo em `baseline.json`; o selo registra hashes do
relatório e das provas em `seal.json`. Preserve esses metadados no fluxo.
Mudanças posteriores exigem nova execução, preservando as evidências anteriores.
Uma deleção staged com arquivo ainda presente e ignorado é registrada como
`indexAction: untrack`. O snapshot preserva seu hash físico; alterações no
arquivo, no ignore ou nessa ação do índice invalidam a revisão. Diferenças
entre índice e conteúdo testado continuam bloqueadas, inclusive com `--scope`.
O script confere o registro; a revisão semântica continua sendo responsabilidade
do agente revisor. Veja a skill
[atualizar-documentacao](../../skills/projeto/atualizar-documentacao/SKILL.md).
