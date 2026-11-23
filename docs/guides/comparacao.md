---
description: Compare abordagens de planejamento, entrega e contexto para agentes de código.
---

# Comparar ferramentas para desenvolvimento com agentes

Compare as funções que sua equipe precisa para planejar, implementar, verificar
e manter o contexto do projeto. Cada ferramenta tem seu próprio fluxo, e você
pode combinar opções que cumprem papéis diferentes no mesmo repositório.

## Matriz de funcionalidades

**✓** Função documentada · **✓\*** Função documentada com configuração
adicional · **—** Equivalente sem confirmação nas fontes consultadas.

<!-- markdownlint-disable MD013 -->

| Funcionalidade | AgentDevKit | BMad Method | OpenSpec | GitHub Spec Kit | `tlc-spec-lean` | `tlc-spec-driven` | dotcontext |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Adoção em repositório existente | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Especificação ou plano com critérios de aceite | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Tarefas ou histórias em artefato próprio | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓\* |
| Implementação guiada pelo plano | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Verificação da implementação contra o planejado | ✓ | ✓ | ✓\* | ✓ | ✓ | ✓ | ✓\* |
| PRD e desenho técnico em etapas próprias | ✓ | ✓ | — | — | — | — | — |
| Levantamento do código para documentar sistema existente | ✓ | ✓ | — | — | — | — | ✓\* |
| Instalação ou integração com múltiplos clientes de IA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Orientação no terminal para a próxima ação ou artefato | ✓ | ✓ | ✓ | ✓\* | — | — | ✓ |
| Sincronização de instruções próprias do projeto entre clientes de IA | ✓ | — | — | — | — | — | ✓ |
| Atualização das specs vigentes ao arquivar mudanças por deltas | — | — | ✓ | — | — | — | — |
| Início ou avanço do fluxo via servidor MCP | — | — | — | — | — | — | ✓ |

<!-- markdownlint-enable MD013 -->

As colunas do Tech Leads Club cobrem duas skills do mesmo catálogo. Lean
organiza as fatias no plano, enquanto Spec Driven prevê um arquivo de tarefas
no fluxo formal.

Em OpenSpec, habilite o workflow de verificação na seleção personalizada para
usar `/opsx:verify`. No GitHub Spec Kit, instale o workflow com
`specify workflow add speckit` para acompanhar a execução pela CLI.
[Comandos do OpenSpec][openspec-commands] · [Workflows do Spec Kit][speckit-workflows]

No dotcontext, a integração MCP permite ao agente criar contexto, preencher
documentação e operar o PREVC. Os contratos de tarefas ficam em
`.context/runtime/contracts/`.
[Integração do dotcontext][dotcontext] · [Notas de versão][dotcontext-releases]

## Quando considerar cada opção

| Abordagem | Quando considerar | Destaques |
| --- | --- | --- |
| **AgentDevKit** | Compartilhar instruções entre clientes de agentes e orientar a adoção em projetos novos ou existentes. | Fonte comum em `.pbai4devs`, orientação pelo terminal e levantamento de sistemas existentes em Markdown ou JSON. [CLI][cli] · [Fluxo de trabalho][fluxo] |
| **BMad Method** | Explorar ideias e organizar descoberta, planejamento e desenvolvimento. | Skills com pontos de entrada próprios para cada atividade. [Documentação oficial][bmad] |
| **OpenSpec** | Organizar o trabalho por mudança e manter as specs vigentes. | Propostas, specs, design e tarefas organizados da proposta ao arquivamento. [Visão geral][openspec] |
| **GitHub Spec Kit** | Especificar, planejar e decompor o trabalho por funcionalidade. | Comandos para passar da especificação à implementação e um guia de adoção que parte da arquitetura e dos testes de um projeto existente. [Projeto][speckit] · [Projetos existentes][speckit-existing] |
| **Tech Leads Club `tlc-spec-lean`** | Usar um plano curto com critérios verificáveis. | Plano revisado por uma pessoa, verificações ligadas aos critérios e revisão por outro agente. [Skill oficial][tlc-lean] |
| **Tech Leads Club `tlc-spec-driven`** | Detalhar tarefas, dependências e pontos de verificação. | Especificação, design e tarefas conforme o escopo, com etapas de execução e verificação. [Skill oficial][tlc-driven] |
| **dotcontext**, de Vinicius Lana (Vini Lana) | Manter contexto persistente e acompanhar a execução entre agentes. | Contexto em `.context/`, fluxo PREVC, servidor MCP e hooks opcionais para clientes compatíveis. O projeto já foi publicado como `@ai-coders/context`. [README do projeto][dotcontext] |

## Como conferir no seu projeto

No cliente de IA, use a sintaxe disponível para a integração instalada.

- **AgentDevKit**. Compare a orientação de `npx @pathbit/agentdevkit next`
  com o inventário de `npx @pathbit/agentdevkit document --markdown`.
  Em um projeto com o kit instalado, `sync --check` confere a sincronização.
  [CLI][cli] · [Documentação de sistemas existentes][legado] ·
  [Clientes compatíveis][compatibilidade]
- **BMad Method**. Use `bmad` no cliente de IA para consultar a próxima etapa.
  Se você usa a árvore de tickets, `tickets.py next` mostra a fila de trabalho
  no terminal. Para investigar código existente, consulte `bmad-deep-recon`.
  [Projeto existente][bmad-existing] · [Planejamento][bmad-plan] ·
  [Árvore de tickets][bmad-tickets]
- **OpenSpec**. Após criar uma mudança com `/opsx:propose`, consulte
  `openspec status --change <id>` no terminal. Compare os arquivos da mudança
  com as specs vigentes para ver o que o arquivamento incorpora.
  [CLI][openspec-cli] · [Estrutura e deltas][openspec-concepts]
- **GitHub Spec Kit**. Siga o fluxo de `/speckit-specify` a
  `/speckit-implement` e confira `spec.md`, `plan.md` e `tasks.md`.
  Use `/speckit-converge` para procurar diferenças entre o código e esses
  artefatos. Para um workflow iniciado pela CLI, consulte
  `specify workflow status <run_id>`.
  [Guia rápido][speckit-quickstart] · [Workflows][speckit-workflows]
- **Tech Leads Club**. Confira como `tlc-spec-lean` organiza as fatias e os
  critérios no `plan.md` e aciona uma revisão por outro agente.
  Em `tlc-spec-driven`, veja o `tasks.md` do fluxo formal e a associação
  entre critérios, verificações e provas.
  [Lean][tlc-lean] · [Spec Driven][tlc-driven] · [Clientes compatíveis][tlc-catalog]
- **dotcontext**. Veja planos e contexto persistidos em `.context/`.
  Com o CLI instalado, `dotcontext admin workflow guide` apresenta a
  orientação do PREVC pelo terminal. Consulte também a configuração de
  exportação de instruções e integração MCP.
  [README do projeto][dotcontext] · [Notas de versão][dotcontext-releases]

## Adotar apenas o que você usa

Consulte os fluxos reconhecidos no projeto antes ou depois de instalar o kit:

```console
npx @pathbit/agentdevkit next --integrations
```

A consulta usa arquivos e pastas locais para apontar referências e documentos
que você pode aproveitar. Use `--intent product` ou `--intent run` para indicar
seu objetivo e `--json` para saída estruturada. Quando encontra indícios no
projeto, o `next` sugere essa consulta e mantém a orientação principal.
As aprovações do projeto continuam valendo.

Se o projeto já tem specs ou decisões revisadas, comece por elas. Escolha uma
fonte para os critérios de aceite de cada entrega e registre onde ficam as
provas. Isso permite manter, por exemplo, as specs em OpenSpec e usar
o AgentDevKit para a preparação local e as instruções compartilhadas.

Em um projeto existente, veja primeiro o plano com `init --dry-run` e limite
os apontamentos do AgentDevKit com `--agents`. Instale e configure cada
ferramenta externa em uma ação separada, seguindo sua documentação quando
ela usar os mesmos clientes ou caminhos.
[Instalação do AgentDevKit][instalacao]

[cli]: cli.md
[fluxo]: workflow.md
[instalacao]: installation.md
[legado]: documentation.md#documentar-um-sistema-em-uso
[compatibilidade]: ../../.pbai4devs/COMPATIBILIDADE.md
[bmad]: https://docs.bmad-method.org/
[bmad-existing]: https://docs.bmad-method.org/scenarios/change-an-existing-codebase/
[bmad-plan]: https://docs.bmad-method.org/scenarios/plan-a-feature-as-a-team/
[bmad-tickets]: https://docs.bmad-method.org/reference/ticket-tree/#what-is-ready
[openspec]: https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md
[openspec-cli]: https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md
[openspec-commands]: https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md
[openspec-concepts]: https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md
[speckit]: https://github.com/github/spec-kit
[speckit-existing]: https://github.github.com/spec-kit/how-to/existing-projects.html
[speckit-quickstart]: https://github.github.com/spec-kit/quickstart
[speckit-workflows]: https://github.github.com/spec-kit/workflows/overview.html
[tlc-lean]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-lean/SKILL.md
[tlc-driven]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-driven/SKILL.md
[tlc-catalog]: https://github.com/tech-leads-club/agent-skills#-supported-agents
[dotcontext]: https://github.com/vinilana/dotcontext#what-dotcontext-is
[dotcontext-releases]: https://github.com/vinilana/dotcontext/releases
