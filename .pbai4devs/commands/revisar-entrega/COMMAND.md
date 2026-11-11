---
description: Revisa documentação, critérios e provas antes de commit ou merge.
---

# Revisar entrega

Entrada: referência da mudança, spec quando houver e arquivos do escopo.
Pré-requisitos: implementação pronta e Node.js 24+. Sem spec em uma correção
urgente, defina critérios próprios AC-001 e registre o motivo.

1. Siga [atualizar-documentacao][documentacao]
   e [verificar-trabalho](../../skills/projeto/verificar-trabalho/SKILL.md).
2. Use `executar-script` para `revisar-entrega prepare --id <referencia>`, com
   `--spec`, `--scope` e `--output` quando aplicáveis. Complete o JSON gerado
   conforme o [modelo](../../templates/revisao-entrega/TEMPLATE.md), com provas
   reais e decisões de documentação justificadas.
3. Conclua a revisão independente em leitura prescrita pela skill. Aplique os
   achados; se arquivos mudarem, gere novo snapshot, execute as verificações
   afetadas e revise novamente antes de registrar `review.status: approved`.
4. Execute `revisar-entrega seal <relatorio>` para registrar os hashes após a
   revisão e `revisar-entrega check <relatorio>` pelo mesmo seletor. Falha,
   critério sem prova ou revisão pendente bloqueiam o commit/merge.

Saída: resultado por critério, pendências e caminho do único `revisao.json` em
`.agent-tests/<referencia>/<execucao>/`. Esta etapa é obrigatória após qualquer
implementação; a ausência de spec não elimina a revisão.
`baseline.json` e `seal.json` são metadados gerados; não os edite manualmente.

[documentacao]: ../../skills/projeto/atualizar-documentacao/SKILL.md
