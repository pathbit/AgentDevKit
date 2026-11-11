---
name: proximos-passos
description: Identifica o estado atual e orienta a próxima ação útil do projeto.
---

# Próximos passos

Leia o pedido, o estado salvo e os documentos existentes. Use o idioma de
`.pbai4devs/estado/agentdevkit.json` ou português quando ainda não houver escolha.
Se a CLI estiver disponível, consulte `agentdevkit next --target . --json`;
caso contrário, use os arquivos e a inspeção local do projeto.

Ao finalizar uma etapa, destaque: resultado, pendências/bloqueios e próxima
ação com comando ou skill, no formato da
[regra de próximos passos](../../../rules/proximos-passos/RULE.md).
Faça apenas as perguntas que impedem avançar.
Continue o trabalho já autorizado; não reinicie fases concluídas nem apresente
suposições como aprovações.

Projeto novo segue preparação → PRD → UX/design → configuração → specs →
implementação → revisão. Projeto existente parte de suas evidências atuais;
instalar o kit não autoriza recriar documentos ou substituir decisões.
Se não houver pendências no escopo, diga isso claramente.
