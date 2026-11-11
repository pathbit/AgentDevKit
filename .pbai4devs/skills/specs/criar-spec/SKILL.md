---
name: criar-spec
description: Cria uma spec de incremento, esclarecendo requisitos e dúvidas com o usuário.
---

# Criar spec

Leia os caminhos em `.pbai4devs/estado/configuracao/ESTADO.md`. Exija PRD/design
aprovados e UX/UI aprovado ou não aplicável com justificativa aprovada.
Confira evidências, atualidade e decisões essenciais ao incremento; se faltar
algo, encaminhe à etapa correspondente antes de escrever a spec.

1. Reúna as dúvidas no início e aproveite respostas existentes. Obtenha nome
   (até 50 caracteres), descrição, requisitos, limites e dependências; registre
   predecessoras e estado ou “Nenhuma”. Não invente decisões ou métricas.
2. Confira o incremento no roadmap; planeje-o com `gerenciar-roadmap` se faltar.
   Forme um slug em minúsculas sem acentos, números e hífens; nome vazio exige
   outra escolha. Se a spec já existir, combine atualização ou novo nome.
3. Preencha `.pbai4devs/templates/spec/TEMPLATE.md` em
   `<documentos.specs>/<slug>/SPEC.md`, com `status: rascunho`. Use o nome como
   H1; vincule PRD, UX/UI, design e roadmap. Marque pendências e não aplicáveis.
   Para cada ID AC-001, defina método/comando, pré-requisito, assertiva, dados
   e caminho da prova em `.agent-tests/<spec>/<execucao>/` antes de aprovar.
   Indique quais documentos a entrega pode afetar e as referências externas.
4. Revise requisitos, dependências e critérios de aceite; apresente ao usuário,
   ajuste e aguarde aprovação explícita. Registre `status: aprovado` e evidência
   somente após aprovação; mudanças materiais voltam a rascunho.
5. Após aprovar, combine a release se indefinida. Atualize-a no diretório
   acordado, pelo modelo de release, com links, dependências e estado da spec;
   preserve outros itens e não invente a decisão.

Atualize README/índices afetados com `atualizar-documentacao`. Siga a regra de
qualidade; sincronize apenas recursos agênticos alterados. Não implemente.
