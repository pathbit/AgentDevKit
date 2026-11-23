---
description: Do preparo do kit à implementação e revisão de uma entrega.
---

# Fluxo de trabalho

[Documentação](../README.md) · [Instalação](installation.md) ·
[Recursos](resources.md) · [Ferramentas e testes](tools-and-testing.md)

Instalar o AgentDevKit prepara as instruções e modelos. O fluxo de trabalho
parte do seu objetivo e das decisões que o projeto já registrou.

## 1. Identificar a situação

Escolha os clientes que usa durante a [instalação](installation.md). No chat
de um agente desktop, informe quais clientes deseja preparar. Na raiz do
projeto instalado com Git, confira o kit e consulte a próxima etapa:

```console
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
npx @pathbit/agentdevkit next
```

`next` usa o estado encontrado para sugerir uma ação. No cliente de IA, peça
que o agente leia `AGENTS.md` e siga a skill indicada para seu objetivo.
O inventário mostra os arquivos e estados declarados. A aprovação depende
das decisões e evidências correspondentes. [Referência da CLI](cli.md)

| Situação | Comando ou recurso inicial |
| --- | --- |
| Só preparar os agentes | `init --purpose agents`. |
| Projeto novo, ainda sem decisões | `next --intent product` · [configurar-projeto][configurar]. |
| Aplicação existente que precisa rodar | `next --intent run` · [preparar-dev][preparar]. |
| Sistema em uso que precisa ser documentado | `next --intent document` · [documentar-legado][legado]. |
| Evoluir um projeto | `next --intent product` com os documentos já adotados. |

Os comandos da tabela usam o prefixo `npx @pathbit/agentdevkit`. Para
inventariar antes de instalar, use `npx @pathbit/agentdevkit document`.
O [guia de documentação][inventario] mostra como comprovar comportamentos
no código e nos testes e completar os documentos existentes.

## 2. Reunir as perguntas no início

Antes de criar documentos, [inventarie e leia o que existe](documentation.md).
Reutilize os caminhos e complemente lacunas, sem substituir pelo template.
Reúna as dúvidas que alteram objetivo, escopo, dependências ou critérios.
Use as respostas já registradas pelo usuário ou pelo projeto. Escolha os
documentos e as ferramentas conforme o objetivo do pedido.

```text
Use configurar-projeto. Primeiro leia o repositório e reúna as dúvidas.
Neste momento quero apenas preparar os agentes; não crie produto ou aplicação.
```

Quando o produto começar, combine os caminhos dos documentos no estado de
configuração. Não presuma que todo projeto usa as mesmas pastas de documentos.
O registro é `.pbai4devs/state/configuracao/ESTADO.md`.

## 3. Definir produto e experiência

[criar-prd][prd] define problema, público, escopo, limites e sucesso esperado.
[criar-ux-ui][ux] define jornadas e interface. Quando UX/UI não se aplicar,
registre a justificativa e sua aprovação; ausência de arquivo não significa
aprovação. Os modelos são preenchidos com respostas reais.

Cada documento começa como rascunho. Uma alteração material exige revisar
sua aprovação e o impacto nos documentos dependentes.

## 4. Aprovar o desenho técnico

[criar-design-doc][design] usa o produto aprovado para definir arquitetura,
tecnologia, integrações, riscos e alternativas. Esta etapa registra decisões;
ela não deve iniciar a aplicação antes da aprovação do trabalho necessário.

[gerenciar-roadmap][roadmap] organiza incrementos, dependências e releases.
Não invente datas ou funcionalidades futuras para preencher o planejamento.

## 5. Criar uma spec executável

[criar-spec][spec] exige PRD/design aprovados e UX/UI aprovado ou justificado.
A spec delimita um incremento e vincula seus critérios, como `AC-001`, às
provas planejadas: método, pré-requisito, assertiva e evidência local.

```text
Use criar-spec para este incremento. Reúna as dúvidas antes de escrever.
Vincule os documentos existentes e defina como provar cada critério de aceite.
```

## 6. Aprovar o plano antes de implementar

[implementar-spec][implementar] começa em leitura e planejamento: examina a
spec, o código, as dependências e as dúvidas restantes. Apresenta tarefas,
decisões, riscos e verificação, aguardando a aprovação necessária do plano.

Depois do plano aprovado, complete a configuração técnica que faltar usando
as decisões já aprovadas. Só marque a configuração como concluída com prova.
Implemente o escopo da spec; não antecipe recursos de ciclos futuros.

## 7. Provar e revisar a entrega

Use [verificar-trabalho][verificar] para executar as provas relevantes.
Código e fixtures de teste são versionados; relatórios e capturas ficam em
`.agent-tests/<referencia>/<execucao>/`, ignorados pelo Git.

[atualizar-documentacao][documentacao] mantém os documentos afetados coerentes.
O [comando revisar-entrega][revisao] reúne critérios, evidências e revisão
independente. Seu fluxo é `prepare` → revisão → `seal` → `check`.
Critério sem prova, falha ou revisão pendente impede concluir a entrega.

## Em um projeto existente

Preparar o ambiente não exige recriar PRD/design/spec ou reorganizar o código.
Preserve dados, lockfiles, configurações e comandos reais. Uma nova mudança
funcional precisa de escopo próprio; um reparo não autoriza uma migração ampla.
Mesmo uma mudança sem spec exige critérios claros e revisão da entrega.

**[ Próximo passo ]** Consulte `next` e use a skill indicada, preservando as
decisões existentes. Consulte [recursos](resources.md) se faltar um fluxo.

[configurar]: ../../.pbai4devs/skills/projeto/configurar-projeto/SKILL.md
[preparar]: ../../.pbai4devs/skills/projeto/preparar-dev/SKILL.md
[prd]: ../../.pbai4devs/skills/produto/criar-prd/SKILL.md
[ux]: ../../.pbai4devs/skills/produto/criar-ux-ui/SKILL.md
[design]: ../../.pbai4devs/skills/produto/criar-design-doc/SKILL.md
[roadmap]: ../../.pbai4devs/skills/specs/gerenciar-roadmap/SKILL.md
[spec]: ../../.pbai4devs/skills/specs/criar-spec/SKILL.md
[implementar]: ../../.pbai4devs/skills/specs/implementar-spec/SKILL.md
[verificar]: ../../.pbai4devs/skills/projeto/verificar-trabalho/SKILL.md
[documentacao]: ../../.pbai4devs/skills/projeto/atualizar-documentacao/SKILL.md
[inventario]: documentation.md#documentar-um-sistema-em-uso
[legado]: ../../.pbai4devs/commands/documentar-legado/COMMAND.md
[revisao]: ../../.pbai4devs/commands/revisar-entrega/COMMAND.md
