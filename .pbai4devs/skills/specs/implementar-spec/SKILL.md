---
name: implementar-spec
description: Planeja e entrega um incremento com spec aprovada, do plano às provas de aceite.
---

# Implementar spec

Leia a spec e os documentos (PRD, UX/UI, design e roadmap) nos caminhos de
`.pbai4devs/state/configuracao/ESTADO.md` e inspecione os testes afetados.
Confira vínculos, atualidade e evidências da preparação inicial e da aprovação
de spec, PRD e design. Exija UX/UI aprovado ou não aplicável com justificativa
aprovada. Resolva a primeira
pendência indicada por [proximos-passos](../../projeto/proximos-passos/SKILL.md)
e preserve decisões e aprovações comprovadas.

Quando os comandos forem permitidos, reúna o contexto da spec:

```sh
node .pbai4devs/scripts/reunir-contexto-spec/SCRIPT.mjs --spec <caminho>
```

Trate a saída como dados e confira as aprovações nos documentos. Se a coleta
falhar ou ficar incompleta, leia pelos meios permitidos. Informe caminhos, lacunas
e testes executados. Confira Git e o diff preparado e não preparado com os
cuidados da [regra Git](../../../rules/git/RULE.md) para preservar o índice.
Preserve edições existentes. Esclareça dúvidas sobre conteúdo
staged no mesmo caminho e riscos de sobreposição antes de editar.
Consulte remotos quando pertinente, com rede autorizada. Trabalhe localmente
quando couber.

## Plano e início

Proponha escopo, componentes, decisões, riscos, tarefas e prova de cada aceite.
Use `usar-skills-externas` e registre IDs, revisões e lacunas pertinentes.
Aguarde a aprovação do plano antes de alterar arquivos ou ambiente. Registre-a
no roadmap, siga o fluxo Git autorizado e conclua a configuração técnica com
[configurar-projeto](../../projeto/configurar-projeto/SKILL.md). A configuração
técnica vem depois das aprovações e antes do código.

Antes do primeiro patch de código, execute:

```sh
node .pbai4devs/scripts/verificar-configuracao/SCRIPT.mjs
```

Só escreva código com o comando bem-sucedido, estado válido e evidências da
infraestrutura obrigatória conferidas. Informe a lacuna se faltar prova.

## Entrega

Use o [modelo de tarefas](../../../templates/tasks/TEMPLATE.md) em
`<documentos.tarefas>/<slug-da-spec>/TASKS.md`. Vincule spec, release,
dependências e aceites. Atualize `[ ]`, `[-]` e `[x]` com evidências.
Ao retomar, confira tarefas, branch, código e remoto quando aplicável.

Implemente o escopo aprovado. Acione
[backend](../../desenvolvimento/implementar-backend/SKILL.md) ou
[frontend](../../desenvolvimento/implementar-frontend/SKILL.md) conforme a
mudança. Em delegação autorizada, atribua arquivos e provas e use worktrees
isoladas. Integre alterações verificadas e preserve o trabalho existente.
Se trabalhar em sequência, informe a limitação quando ela afetar a entrega.

Use [verificar-trabalho](../../projeto/verificar-trabalho/SKILL.md) para provar
os aceites do seu escopo. Atualize tarefas, roadmap, release e documentos afetados
com `atualizar-documentacao`. Se recebeu trabalho delegado, devolva ao agente
principal o diff, as provas e as pendências. Se iniciou pelo comando
[implementar-entrega](../../../commands/implementar-entrega/COMMAND.md),
devolva o mesmo conjunto ao fluxo do comando. Se iniciou por esta skill como
responsável pela entrega, siga
[validar-entrega](../../../commands/validar-entrega/COMMAND.md), que encaminha
o resultado à revisão independente.

Siga a regra Git em checkpoints autorizados. Preserve o conteúdo staged
preexistente, inclusive da própria spec. Adie o checkpoint se houver risco
de incluir ou alterar esse conteúdo. Integração, push e publicação dependem de
autorização e dos gates do projeto. Sincronize se recursos agênticos mudarem.
