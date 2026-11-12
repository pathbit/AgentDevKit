---
description: Do preparo do kit à implementação e revisão de uma entrega.
---

# Fluxo de trabalho

[Documentação](../README.md) · [Instalação](installation.md) ·
[Recursos](resources.md) · [Ferramentas e testes](tools-and-testing.md)

O AgentDevKit organiza o trabalho; ele não substitui decisões do projeto.
Instalar o kit cria sua estrutura de apoio, sem criar um produto, escolher
uma stack ou gerar PRD, design e specs automaticamente.

## 1. Identificar a situação

Na preparação do kit, escolha os agentes que usa: a CLI pergunta em um terminal
interativo ou aceita `--agents codex,claude`. Um agente de desktop deve reunir
essa escolha com você antes de executar a instalação; não deve deduzi-la pelo
nome do aplicativo ou pelas pastas existentes. Sem resposta disponível, o
padrão é `all`. A seleção salva continua nas atualizações e sincronizações.
Use `agents` para consultar ou alterar depois; veja a [referência](cli.md).

Use `doctor` para conferir o kit e `next` para consultar a próxima etapa.
Nos exemplos, `agentdevkit` representa a CLI; no checkout, use
`npm run cli -- <comando>`. A invocação por npx está na instalação.

```sh
agentdevkit doctor --target .
agentdevkit next --target .
```

O diagnóstico descreve sinais e arquivos existentes. Ele não aprova
documentos, não comprova comportamento e não autoriza substituir decisões.

| Situação | Comece por |
| --- | --- |
| Só está instalando os agentes | Manter modelos; não iniciar o produto. |
| Projeto novo, ainda sem decisões | [configurar-projeto][configurar]. |
| Aplicação existente que precisa rodar | [preparar-dev][preparar]. |
| Nova funcionalidade em projeto existente | Reutilizar documentos e planejar. |

## 2. Reunir as perguntas no início

Antes de criar documentos, [inventarie e leia o que existe](documentation.md).
Reutilize os caminhos e complemente lacunas, sem substituir pelo template.
Antes de escrever documentos ou código, leia o contexto já disponível.
Reúna as dúvidas que alteram objetivo, escopo, dependências ou critérios.
Não pergunte novamente o que o usuário já decidiu ou o projeto já registra.
A escolha dos clientes precede o preparo opcional de ferramentas; não aprova
downloads, início do produto ou mudanças na aplicação.

```text
Use configurar-projeto. Primeiro leia o repositório e reúna as dúvidas.
Neste momento quero apenas preparar os agentes; não crie produto ou aplicação.
```

Quando o produto começar, combine os caminhos dos documentos no estado de
configuração. Não presuma que todo projeto usa as mesmas pastas de documentos.
O registro é `.pbai4devs/estado/configuracao/ESTADO.md`.

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
[revisao]: ../../.pbai4devs/commands/revisar-entrega/COMMAND.md
