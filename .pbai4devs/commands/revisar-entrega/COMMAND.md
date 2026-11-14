---
description: Revisa documentação, critérios e provas antes de commit ou merge.
---

# Revisar entrega

Entrada: referência da mudança, spec quando houver e arquivos do escopo.
Pré-requisitos: implementação pronta e Node.js 24+. Sem spec em uma correção
urgente, defina critérios próprios AC-001 e registre o motivo.

A coleta automática recusa submódulos, sparse-index, flags que ocultam mudanças
e filtros Git aplicados; nesses casos, use `--scope` para caminhos comprováveis.
Split-index e clones parciais são recusados em todos os modos. As consultas Git
desativam fsmonitor somente no subprocesso; nenhuma configuração é alterada.

1. Siga [atualizar-documentacao][documentacao]
   e [verificar-trabalho](../../skills/projeto/verificar-trabalho/SKILL.md).
2. Use `executar-script` para `revisar-entrega prepare --id <referencia>`, com
   `--spec`, `--scope` e `--output` quando aplicáveis. Complete o JSON gerado
   conforme o [modelo](../../templates/revisao-entrega/TEMPLATE.md), com provas
   reais e decisões de documentação justificadas.
3. Acione o [revisor](../../agents/revisor/AGENT.md) independente, em leitura,
   para contestar premissas e procurar regressões, falhas e lacunas nas provas.
   Registre achados com evidências e localização. Aplique os pertinentes; se
   arquivos mudarem, gere novo snapshot, execute as verificações afetadas e
   revise novamente antes de registrar `review.status: approved`. Sem revisão
   independente disponível, informe a limitação e mantenha a revisão pendente.
4. Execute `revisar-entrega seal <relatorio>` para registrar os hashes após a
   revisão e `revisar-entrega check <relatorio>` pelo mesmo seletor. Falha,
   critério sem prova ou revisão pendente bloqueiam o commit/merge.

Antes do commit, execute `revisar-entrega check-commit <relatorio>
[outros-relatorios...]`. A união das revisões seladas deve cobrir todos os
arquivos preparados, inclusive ambas as pontas de renomeações. O check aceita
somente arquivos regulares com modo Git `100644` cujos blobs correspondam aos
bytes revisados. Filtros ou CRLF que mudem esses bytes são recusados.
Ele não é atômico: repita-o se o índice ou os arquivos mudarem antes do commit.

Antes de um merge fast-forward, na origem, execute `revisar-entrega check-merge
--destino refs/heads/<destino> <relatorio> [outros-relatorios...]`. A verificação
exige cobertura do diff e correspondência com o commit revisado. Ela bloqueia
históricos divergentes, links, submódulos, arquivos executáveis e operações Git
acima de 64 MiB. Confirme os hashes retornados antes de integrar.

Saída: resultado por critério, pendências e caminho do único `revisao.json` em
`.agent-tests/<referencia>/<execucao>/`. Esta etapa é obrigatória após qualquer
implementação; a ausência de spec não elimina a revisão.
`baseline.json` e `seal.json` são metadados gerados; não os edite manualmente.

[documentacao]: ../../skills/projeto/atualizar-documentacao/SKILL.md
