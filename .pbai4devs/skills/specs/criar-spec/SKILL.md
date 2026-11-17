---
name: criar-spec
description: Cria uma spec de incremento, esclarecendo requisitos e dúvidas com o usuário.
---

# Criar spec

Antes de escrever, aplique o inventário e plano de `atualizar-documentacao`.
Leia os caminhos em `.pbai4devs/state/configuracao/ESTADO.md` e exija
preparação concluída e comprovada. Exija PRD/design aprovados e UX/UI aprovado
ou não aplicável com justificativa aprovada.
Execute `node .pbai4devs/scripts/executar-script/SCRIPT.mjs --raw
verificar-configuracao --preparacao`. Se falhar ou não puder executá-lo, pare;
sucesso exige conferir as evidências e aprovações, pois o script não as valida.
Confira evidências, atualidade e decisões essenciais ao incremento; se faltar
algo, encaminhe à etapa correspondente antes de escrever a spec.
Rascunho, ausência ou estado não verificável dos pré-requisitos não comprovam
aprovação: não crie nem atualize a spec, mesmo em rascunho. Informe a etapa
pendente e pergunte apenas o necessário para retomá-la; não invente decisões ou
dispensas.
Se a preparação não estiver comprovada, indique `configurar-projeto` primeiro,
sem antecipar perguntas de produto.

1. Reúna as dúvidas no início e aproveite respostas existentes. Obtenha nome
   (até 50 caracteres), descrição, requisitos, limites e dependências; registre
   predecessoras e estado ou “Nenhuma”. Não invente decisões ou métricas.
2. Confira o incremento no roadmap; planeje-o com `gerenciar-roadmap` se faltar.
   Forme um slug em minúsculas sem acentos, números e hífens; nome vazio exige
   outra escolha. Se a spec já existir, combine atualização ou novo nome.
3. Preencha `.pbai4devs/templates/spec/TEMPLATE.md` em
   `<documentos.specs>/<slug>/SPEC.md`. Spec nova ou alterada materialmente fica
   em `status: rascunho`; sem mudança material, preserve aprovação e evidência.
   Use o nome como H1; vincule PRD, UX/UI, design e roadmap. Marque pendências
   e não aplicáveis.
   Calcule links a partir da pasta da spec e confira os destinos. Identifique
   comandos futuros como propostos, sem apresentá-los como disponíveis.
   Para cada ID AC-001, defina método/comando, pré-requisito, assertiva, dados
   e caminho da prova em `.agent-tests/<spec>/<execucao>/` antes de aprovar.
   Indique quais documentos a entrega pode afetar e as referências externas.
4. Revise requisitos, dependências e critérios de aceite; para spec nova ou
   reaberta, apresente ao usuário, ajuste e aguarde aprovação explícita. Registre
   `status: aprovado` e evidência somente após aprovação; mudanças materiais
   voltam a rascunho. Respeite aprovações já dadas pelo usuário.
5. Após aprovar, combine a release se indefinida. Atualize-a no diretório
   acordado, pelo modelo de release, com links, dependências e estado da spec;
   preserve outros itens e não invente a decisão.

Atualize README/índices afetados com `atualizar-documentacao`. Siga a regra de
qualidade; sincronize apenas recursos agênticos alterados. Não implemente.
