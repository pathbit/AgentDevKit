---
name: implementar-spec
description: Planeja e implementa uma spec aprovada, acompanhando tarefas e critérios de aceite.
---

# Implementar spec

Leia `.pbai4devs/estado/configuracao/ESTADO.md`. Exija spec, PRD e design aprovados;
UX/UI aprovado ou não aplicável com justificativa aprovada. Confira evidências,
atualidade, decisões essenciais e vínculos com o roadmap; resolva pendências
antes de implementar.

1. Em planejamento ou leitura, examine spec, projeto, dependências e Git local
   e remoto. Reúna as dúvidas no início e aguarde respostas necessárias.
2. Proponha escopo, componentes, decisões, riscos, tarefas e verificação de cada
   critério. Aguarde aprovação do plano antes de alterar arquivos ou ambiente.
   Consulte `usar-skills-externas` para as referências aplicáveis e registre
   seus IDs/revisões. Não invente uma solução já atendida por elas.
3. Depois da aprovação, crie ou retome `feature/<slug-da-spec>` de `develop`.
   Se faltar `develop`, use `main` quando seguro; sem base/remoto, combine como
   proceder. Preserve alterações. Registre a aprovação no roadmap e confira a
   configuração real; complete-a com `configurar-projeto` antes de codificar.
4. Use o modelo de tarefas em `<documentos.tarefas>/<slug-da-spec>/TASKS.md`.
   Vincule spec/release e registre tarefas, dependências, critérios e evidências.
   Atualize `[ ]`, `[-]` e `[x]` ao avançar; conclusão exige prova. Ao retomar,
   confira arquivo, branch, código e remoto, além dos marcadores.
5. Implemente só a spec. Em trabalho delegado, use worktrees e branches próprias;
   integre somente trabalho completo e verificado, sem sobrescrever alterações.
   Esclareça novos impedimentos antes de avançar na parte afetada.
   Quando disponíveis e autorizados, divida tarefas independentes entre
   especialistas com arquivos atribuídos e provas esperadas. Use as skills de
   [backend](../../desenvolvimento/implementar-backend/SKILL.md) e
   [frontend](../../desenvolvimento/implementar-frontend/SKILL.md) conforme o
   escopo. Se não houver delegação, prossiga em sequência e informe o limite.
6. Por tarefa concluída, atualize tarefas/release e a documentação afetada com
   `atualizar-documentacao`. Execute o comando `revisar-entrega`, incluindo
   provas e revisão independente. Só então crie o commit do checkpoint conforme
   a regra Git e sincronize a feature com o remoto.
   Nunca publique trabalho parcial, falho, alheio ou com autoria de agente.
   `[-]` é trabalho local: outro desenvolvedor retoma do último checkpoint
   publicado. Resolva divergências e falhas sem push forçado ou perda de trabalho.
7. Use `verificar-trabalho` para provar cada aceite, respeitando cobertura e a
   regra de qualidade. Alterações web exigem navegador real; desktop exige
   abrir a aplicação. Relate passou, falhou ou não verificado com evidência e
   motivo; atualize tarefas, roadmap e release.
8. Com aceites, testes, documentação e revisão da entrega atendidos no estado
   final, integre em `develop` e sincronize.
   Promova a release a `main` só com todas as entregas e revisões concluídas.
   Se `develop` tiver atividades incompletas, selecione apenas entregas prontas
   por fluxo de release. Respeite proteções e informe impedimentos.

Preserve o relatório final e as evidências em `.agent-tests/`. Sincronize
apontamentos somente se recursos dos agentes mudarem; documentos não são espelhos.
