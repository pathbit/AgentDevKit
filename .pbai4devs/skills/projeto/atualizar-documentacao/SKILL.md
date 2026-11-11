---
name: atualizar-documentacao
description: Atualiza documentos afetados e sua coerência com a entrega.
---

# Atualizar documentação

Leia o diff, os critérios e o comportamento comprovado. Reúna no início as
dúvidas que mudam contratos; use o [catálogo](../../../templates/README.md) para
escolher modelos da fase atual, sem criar documentos de produto antecipados.

Confira README da raiz/pastas, AGENTS/CLAUDE/GEMINI, contribuição, notas de versão,
produto/design/specs, ADRs, configuração/exemplos e comentários/docstrings
relevantes. Atualize só o que a mudança afeta; documente comportamento real,
pré-requisitos, comandos, compatibilidade e limites. Evite repetir instruções.
Segurança pública depende de suporte e canal confirmado, sem dados fictícios.

Registre por caminho a decisão `updated`, `no-impact` ou `not-applicable`, com
justificativa, no relatório da entrega ou no resultado da tarefa. Verifique
links e exemplos; código de teste é versionado, evidências ficam ignoradas.

Acione o [revisor](../../../agents/revisor/AGENT.md) em leitura com o diff,
documentos, critérios e provas. Aplique os achados pertinentes e peça nova
revisão após correções. Informe impedimentos; não declare aprovação se essa
revisão não ocorreu. Na entrega, o agente principal registra a decisão do
revisor no JSON de `revisar-entrega`, após conferir o estado final.
