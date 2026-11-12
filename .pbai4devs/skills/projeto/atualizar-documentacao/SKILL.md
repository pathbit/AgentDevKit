---
name: atualizar-documentacao
description: Atualiza documentos afetados e sua coerência com a entrega.
---

# Atualizar documentação

Antes de escrever, execute `inspecionar-projeto` por `executar-script` e consulte
`documentation`. Abra os documentos relevantes: o inventário não substitui a
leitura nem comprova aprovação. Confira também o diff e os critérios da tarefa.
Reúna no início somente dúvidas que os arquivos não respondem.

Proponha por caminho: manter, complementar uma seção ou criar arquivo ausente.
Reutilize nomes, formatos, decisões, links e estrutura existentes; um documento
como `ARCHITECTURE.md` pode cumprir o papel de design sem ser renomeado.
Organize primeiro por índices e links. Não apague, mova ou substitua arquivos
para padronizá-los. Acrescente apenas fatos comprovados e preserve o conteúdo
anterior; trate contradições com o usuário antes de editar.

Use o [catálogo](../../../templates/README.md) como lista de lacunas, nunca como
substituto de um documento existente. Crie somente o que a fase e o pedido
exigem; ausência de respostas não autoriza inventar PRD, design ou aprovação.

Confira README da raiz/pastas, AGENTS/CLAUDE/GEMINI, contribuição, notas de versão,
produto/design/specs, ADRs, configuração/exemplos e comentários/docstrings
relevantes. Atualize só o que a mudança afeta; documente comportamento real,
pré-requisitos, comandos, compatibilidade e limites. Evite repetir instruções.
Segurança pública depende de suporte e canal confirmado, sem dados fictícios.

Registre por caminho a decisão `updated`, `no-impact` ou `not-applicable`, com
justificativa, no relatório da entrega ou no resultado da tarefa. Verifique
links e exemplos; compare o conteúdo anterior e confirme que arquivos fora
do plano permanecem intactos. Repetir a tarefa não deve duplicar seções.
Código de teste é versionado, evidências ficam ignoradas.

Acione o [revisor](../../../agents/revisor/AGENT.md) em leitura com o diff,
documentos, critérios e provas. Aplique os achados pertinentes e peça nova
revisão após correções. Informe impedimentos; não declare aprovação se essa
revisão não ocorreu. Na entrega, o agente principal registra a decisão do
revisor no JSON de `revisar-entrega`, após conferir o estado final.
