---
name: criar-prd
description: Define e revisa o documento de requisitos do produto com o usuário.
---

# Criar PRD

Siga `.pbai4devs/rules/qualidade/RULE.md` ao criar arquivos Markdown.
Antes de escrever, use `atualizar-documentacao` para ler e reaproveitar
documentos existentes; aplique o template somente às lacunas. Verifique os
caminhos antes de afirmar que documentos não existem; informe o que ainda não
foi verificado.

Confira a preparação em `.pbai4devs/state/configuracao/ESTADO.md`: status
declarado sem evidências verificáveis da preparação não comprova sua conclusão.
Se não estiver concluída e comprovada, encaminhe a `configurar-projeto` e
suspenda as perguntas de produto e o PRD. A ausência do estado não prova que
nunca ocorreu.
Informe o próximo passo de configuração e pergunte apenas o necessário para ele,
sem antecipar perguntas de produto.
A configuração técnica pode permanecer pendente nesta fase.
Consulte os clientes e o idioma em `.pbai4devs/state/agentdevkit.json`; use-os
como padrão sem perguntar novamente, salvo se o pedido indicar outra escolha.
Se a leitura for truncada, complete-a antes de considerar a informação ausente.

Leia o contexto existente e reúna no início as dúvidas sobre problema, público,
objetivos, escopo, requisitos, restrições, prioridades e critérios de sucesso.
Agrupe em uma rodada todas as dúvidas identificáveis, incluindo os critérios
de aceite das decisões propostas. Se respostas revelarem novas dúvidas,
agrupe-as antes de pedir aprovação. Pergunte apenas o que ainda falta; não
invente decisões ou métricas.

No caminho `documentos.prd` acordado, crie ou atualize o PRD usando
`.pbai4devs/templates/prd/TEMPLATE.md`. PRD novo ou materialmente alterado fica
em `status: rascunho`; sem mudança material, preserve a aprovação e sua
evidência. Preserve o conteúdo existente e identifique suposições e itens
desconhecidos. Não crie documentos reais enquanto o usuário configurar agentes.

Para PRD novo ou reaberto, apresente-o para revisão, peça aprovação explícita e
ajuste-o até o usuário aprovar. Antes disso, resolva as decisões essenciais e
registre itens não aplicáveis; não invente respostas. Só então registre
`status: aprovado` e a evidência no documento. Alterações materiais posteriores
voltam o PRD a `rascunho` até nova aprovação. Reavalie UX/UI, design e specs:
reabra somente documentos com impacto material comprovado e autoridade para
alterá-los; se houver dúvida, preserve-os e registre a revisão pendente.
Se a pessoa responsável pela aprovação não estiver clara, confirme; não presuma
que seja a anterior. Quando necessário e autorizado, atualize roadmap e README
com `gerenciar-roadmap` e `atualizar-documentacao`, sem inventar entregas.

Somente após aprovação comprovada do PRD, encaminhe à próxima etapa: confira
o estado da UX/UI. Se aprovada e válida ou não aplicável com justificativa
aprovada, preserve-a e indique a próxima etapa pendente. Se ausente ou reaberta,
use `criar-ux-ui`; se a validade for incerta, indique a verificação necessária.
Antes da aprovação do PRD, trate suas pendências sem encaminhar etapa posterior.
Sincronize apontamentos somente se recursos dos agentes mudarem.
