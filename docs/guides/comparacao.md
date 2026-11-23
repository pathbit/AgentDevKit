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

As marcas comparam capacidades. O escopo, os comandos e as garantias de
cada implementação estão nas notas abaixo das tabelas.

### Planejar e entregar

<!-- markdownlint-disable MD013 -->

| Funcionalidade | AgentDevKit | BMad Method | OpenSpec | GitHub Spec Kit | `tlc-spec-lean` | `tlc-spec-driven` | dotcontext |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Adoção em repositório existente | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Especificação ou plano com critérios de aceite | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Tarefas ou histórias em artefato próprio | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓\* |
| Implementação guiada pelo plano | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Verificação da implementação contra o planejado | ✓ | ✓ | ✓\* | ✓ | ✓ | ✓ | ✓\* |
| Critérios e evidências registrados na verificação | ✓ | ✓ | ✓\* | ✓ | ✓ | ✓ | ✓\* |
| Revisão da entrega em outra sessão ou por outro agente | ✓ | ✓ | — | — | ✓ | ✓ | — |
| Checagem do conteúdo revisado contra o diff de commit ou merge fast-forward | ✓ | — | — | — | — | — | — |
| PRD e desenho técnico em etapas próprias | ✓ | ✓ | — | — | — | — | — |
| Levantamento do código para documentar sistema existente | ✓ | ✓ | — | — | — | — | ✓\* |
| Orientação no terminal para a próxima ação ou artefato | ✓ | ✓ | ✓ | ✓\* | — | — | ✓ |
| Atualização das specs vigentes ao arquivar mudanças por deltas | ✓\* | — | ✓ | — | — | — | — |
| Início ou avanço do fluxo via servidor MCP | ✓\* | — | — | — | — | — | ✓ |

<!-- markdownlint-enable MD013 -->

O AgentDevKit registra o parecer independente, o resultado por critério e
as referências às provas. O comando `revisar-entrega` pode selar o conteúdo
revisado e conferir o diff do commit ou de um merge fast-forward. O BMad
orienta a revisão em uma sessão nova. `tlc-spec-lean` organiza as fatias
no plano e `tlc-spec-driven` prevê um arquivo de tarefas no fluxo formal.
[Revisão no AgentDevKit][revisao] · [Revisão no BMad][bmad-review] ·
[Lean][tlc-lean] · [Spec Driven][tlc-driven]

O OpenSpec 2 oferece `openspec-verify-change` no perfil personalizado. No
GitHub Spec Kit, `speckit-converge` compara evidências e artefatos. Instale
o workflow `speckit` para acompanhar sua execução pela CLI.
[Skills do OpenSpec][openspec-skills] · [Convergência][speckit-verify] ·
[Workflows do Spec Kit][speckit-workflows]

O AgentDevKit oferece as duas funções por plugins opcionais. O plugin
`openspec` usa o motor do OpenSpec para aplicar deltas e arquivar a mudança
em `openspec/`. O plugin `dotcontext-mcp` usa o servidor do dotcontext para
iniciar ou avançar o PREVC. Cada motor aplica os próprios critérios. Use
`next --integrations` para localizar os artefatos reconhecidos no projeto.
[Plugins](plugins.md) · [Arquivamento no OpenSpec][openspec-cli] ·
[Evidências no dotcontext][dotcontext-evidence]

### Configurar e manter o projeto

<!-- markdownlint-disable MD013 -->

| Funcionalidade | AgentDevKit | BMad Method | OpenSpec | GitHub Spec Kit | `tlc-spec-lean` | `tlc-spec-driven` | dotcontext |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Instalação ou integração com múltiplos clientes de IA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Estrutura compartilhada sem instalar arquivos para clientes individuais | ✓ | — | ✓ | ✓ | — | — | — |
| Seleção de clientes ou destinos ajustável após a instalação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sincronização de instruções próprias do projeto entre clientes de IA | ✓ | — | — | — | — | — | ✓ |
| Prévia sem escrita para atualização ou configuração de clientes | ✓ | — | ✓ | — | — | — | ✓ |
| Diagnóstico dos arquivos gerenciados e da configuração instalada | ✓ | ✓ | — | ✓ | — | — | ✓ |
| Proteção de mudanças locais em arquivos gerenciados na atualização | ✓ | — | — | ✓ | — | — | — |
| Preservação do índice Git ao configurar e sincronizar | ✓ | — | — | — | — | — | — |
| Recuperação de problemas no ciclo de instalação ou atualização | ✓ | — | — | ✓ | — | — | — |
| Consulta a catálogo de módulos, extensões ou skills opcionais | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| Instalação seletiva de módulos, extensões ou skills opcionais | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| Verificação de ferramentas locais pelo terminal | ✓ | — | — | ✓ | — | — | — |

<!-- markdownlint-enable MD013 -->

- **Configuração e versionamento.** O AgentDevKit salva a seleção em
  `.pbai4devs/state/agentdevkit.json` e usa essa seleção no `sync`. Use
  `agents add <ids>` e `agents remove <ids>` para alterar os clientes
  individualmente. A seleção `none` conserva `.pbai4devs` e `AGENTS.md` sem
  configurar um cliente específico. Versione as fontes compartilhadas e trate
  os apontamentos gerados conforme o guia de instalação. O OpenSpec oferece
  `init --tools none` e permite repetir `init` para adicionar clientes. O
  Spec Kit registra as integrações instaladas e oferece `--integration none`.
  [CLI do AgentDevKit][cli] · [Instalação e Git][instalacao] ·
  [Configuração do OpenSpec][openspec-setup] ·
  [Integrações do Spec Kit][speckit-integrations] ·
  [Modo `none` do Spec Kit][speckit-none]
- **Seleção e diagnóstico.** O AgentDevKit usa `--dry-run` para a prévia,
  `doctor` para o diagnóstico e `sync --check` para conferir a sincronização
  sem escrever. O OpenSpec também oferece `update --dry-run`. O guia do BMad
  documenta `bmad status` na prévia da v7 e a seleção de clientes na instalação
  de módulos. O Tech Leads Club configura os destinos ao instalar skills
  individuais. O dotcontext usa presets por exportação, tem prévia de
  configuração MCP e oferece diagnóstico dos hooks do Codex. Cada verificação
  tem o escopo da operação que a ferramenta descreve.
  [CLI do AgentDevKit][cli] · [CLI do OpenSpec][openspec-cli] ·
  [Instalação do BMad][bmad-install] · [Catálogo do TLC][tlc-catalog] ·
  [CLI do dotcontext][dotcontext-cli]
- **Preservação e recuperação.** O AgentDevKit preserva o índice Git,
  sinaliza conflitos com conteúdo próprio e permite consultar o diário e a
  cópia de uma operação pendente via `recovery`. Revise o estado e a cópia
  antes de usar `recovery resolve`. O Spec Kit usa manifestos para detectar
  alterações, bloquear atualizações de integrações alteradas sem `--force` e
  reverter falhas da própria operação, com snapshots em certos conflitos.
  O OpenSpec 2 preserva alterações nos caminhos antigos na migração e avisa
  que a atualização substitui edições diretas de skills em `.agents/skills`.
  A recuperação de sessões do dotcontext pertence ao fluxo de trabalho.
  [Preservação e recuperação no AgentDevKit][instalacao] ·
  [Ciclo de integrações do Spec Kit][speckit-integrations] ·
  [Migração do OpenSpec 2][openspec-upgrade] ·
  [Runtime do dotcontext][dotcontext-runtime]
- **Opcionais.** `plugins list` e `plugins info` consultam as ferramentas e
  skills externas reconhecidas pelo AgentDevKit. `plugins install` e
  `plugins check` atuam sobre os itens selecionados, com os gerenciadores
  correspondentes. `tools check` verifica ferramentas auxiliares, enquanto
  `specify check` verifica executáveis exigidos pelas integrações do Spec Kit.
  O catálogo do BMad oferece módulos como Test Architect. O Spec Kit oferece
  extensões com busca e instalação, e o Tech Leads Club usa um catálogo
  comum às duas skills da tabela. `dotcontext admin skill list` lista skills
  do contexto, que `admin skill export` exporta para os clientes.
  [CLI do AgentDevKit][cli] · [Módulos do BMad][bmad-modules] ·
  [Extensões do Spec Kit][speckit-extensions] ·
  [CLI do Spec Kit][speckit-core] · [Catálogo do TLC][tlc-catalog] ·
  [CLI do dotcontext][dotcontext-cli]

## Quando considerar cada opção

| Abordagem | Quando considerar | Destaques |
| --- | --- | --- |
| **AgentDevKit** | Compartilhar instruções entre clientes de agentes e orientar a adoção em projetos novos ou existentes. | Fonte comum em `.pbai4devs`, configuração seletiva, levantamento local e revisão da entrega por critérios e provas. [CLI][cli] · [Fluxo de trabalho][fluxo] |
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
- **OpenSpec**. Após criar uma mudança com a skill `openspec-propose`, consulte
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
[revisao]: ../../.pbai4devs/commands/revisar-entrega/COMMAND.md
[bmad]: https://docs.bmad-method.org/
[bmad-existing]: https://docs.bmad-method.org/scenarios/change-an-existing-codebase/
[bmad-install]: https://docs.bmad-method.org/start/install-bmad/
[bmad-modules]: https://docs.bmad-method.org/customize/add-modules/
[bmad-plan]: https://docs.bmad-method.org/scenarios/plan-a-feature-as-a-team/
[bmad-review]: https://docs.bmad-method.org/build/review-a-change/
[bmad-tickets]: https://docs.bmad-method.org/reference/ticket-tree/#what-is-ready
[openspec]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/start/overview.md
[openspec-cli]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/reference/cli.md
[openspec-concepts]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/guides/concepts.md
[openspec-setup]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/start/setup.md
[openspec-skills]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/reference/skills.md
[openspec-upgrade]: https://github.com/Fission-AI/OpenSpec/releases/tag/v2.0.0
[speckit]: https://github.com/github/spec-kit
[speckit-core]: https://github.github.com/spec-kit/overview/core.html#check-installed-tools
[speckit-existing]: https://github.github.com/spec-kit/how-to/existing-projects.html
[speckit-extensions]: https://github.github.com/spec-kit/extensions/cli.html
[speckit-integrations]: https://github.github.com/spec-kit/integrations/cli.html
[speckit-none]: https://github.github.com/spec-kit/integrations/none.html
[speckit-quickstart]: https://github.github.com/spec-kit/quickstart
[speckit-verify]: https://github.github.com/spec-kit/reference/agentic-sdd.html
[speckit-workflows]: https://github.github.com/spec-kit/workflows/overview.html
[tlc-lean]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-lean/SKILL.md
[tlc-driven]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-driven/SKILL.md
[tlc-catalog]: https://github.com/tech-leads-club/agent-skills#-supported-agents
[dotcontext]: https://github.com/vinilana/dotcontext#what-dotcontext-is
[dotcontext-cli]: https://github.com/vinilana/dotcontext#cli-reference
[dotcontext-evidence]: https://github.com/vinilana/dotcontext#executable-evidence
[dotcontext-releases]: https://github.com/vinilana/dotcontext/releases
[dotcontext-runtime]: https://github.com/vinilana/dotcontext#harness-runtime
