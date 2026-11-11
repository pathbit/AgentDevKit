---
name: criar-prd
description: Define e revisa o documento de requisitos do produto com o usuário.
---

# Criar PRD

Siga `.pbai4devs/rules/qualidade/RULE.md` ao criar arquivos Markdown.

Confira a preparação em `.pbai4devs/estado/configuracao/ESTADO.md`. Se não estiver
concluída e comprovada, encaminhe a `configurar-projeto` para a fase
inicial antes de criar o PRD.

Leia o contexto existente e reúna no início as dúvidas sobre problema, público,
objetivos, escopo, requisitos, restrições, prioridades e critérios de sucesso.
Pergunte apenas o que ainda falta; não invente decisões ou métricas.

No caminho `documentos.prd` acordado no estado, crie ou atualize o PRD usando
`.pbai4devs/templates/prd/TEMPLATE.md`, com `status: rascunho`. Preserve o conteúdo
existente; identifique suposições e itens desconhecidos. Não crie documentos
reais enquanto o usuário estiver apenas configurando os agentes.

Apresente o documento para revisão, peça aprovação explícita e ajuste-o até o
usuário aprovar. Antes disso, resolva as decisões essenciais e registre itens
não aplicáveis; não invente respostas. Só então registre `status: aprovado` e
a evidência da aprovação no documento. Alterações materiais posteriores voltam
o PRD a `rascunho` até nova aprovação. Reavalie UX/UI, design e specs
dependentes: registre o impacto e retorne a `rascunho` os documentos afetados
para revisão e nova aprovação. Atualize o roadmap acordado usando
`gerenciar-roadmap`, sem inventar datas ou entregas. A próxima etapa é
`criar-ux-ui`.

Atualize o resumo e links do README pelo modelo da fase e use
`atualizar-documentacao` para impactos nos documentos relacionados.
Sincronize apontamentos somente se recursos dos agentes mudarem.
