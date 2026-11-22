---
description: Compare abordagens de planejamento, entrega e contexto para agentes de código.
---

# Escolher um fluxo para o seu projeto

O AgentDevKit mantém as instruções compartilhadas em `.pbai4devs`, gera
apontamentos para os clientes escolhidos e orienta o próximo passo pelo
terminal. Em um produto novo, use `next --intent product` para encontrar
a próxima etapa de planejamento. Para rodar uma aplicação existente, use
`next --intent run` para receber orientação a partir dos arquivos e da
configuração do projeto. Consulte a [CLI][cli] e o [fluxo de trabalho][fluxo].

## Quando considerar cada opção

| Se você precisa de… | O que a ferramenta oferece |
| --- | --- |
| Skills para explorar ideias, planejar e desenvolver | **BMad Method** reúne skills de descoberta, planejamento e construção. A documentação oferece pontos de entrada diferentes para essas atividades. [Documentação oficial][bmad] |
| Propostas e specs por mudança | **OpenSpec** organiza propostas, specs, design e tarefas por mudança. O fluxo documentado cobre propor, implementar e arquivar. [Visão geral do OpenSpec][openspec] |
| Especificação, plano técnico e tarefas por funcionalidade | **GitHub Spec Kit** oferece comandos para especificar, planejar, decompor e implementar. O guia de adoção em projetos existentes orienta a partir da arquitetura e dos testes que a equipe já usa. [Projeto][speckit] · [Projetos existentes][speckit-existing] |
| Um plano curto com critérios verificáveis | **Tech Leads Club `tlc-spec-lean`** define um plano revisado por uma pessoa, verificações ligadas a critérios, implementação e revisão por outro agente. [Skill oficial][tlc-lean] |
| Tarefas detalhadas com dependências e pontos de verificação | **Tech Leads Club `tlc-spec-driven`** define especificação, design e tarefas conforme o escopo, execução e verificação. [Skill oficial][tlc-driven] |
| Contexto persistente e acompanhamento da execução entre agentes | **dotcontext**, de Vinicius Lana (Vini Lana), é o projeto antes publicado como `@ai-coders/context`. A documentação atual descreve `.context/`, o fluxo PREVC, o servidor MCP e hooks opcionais para clientes compatíveis. [README do projeto][dotcontext] |

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
[bmad]: https://docs.bmad-method.org/
[openspec]: https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md
[speckit]: https://github.com/github/spec-kit
[speckit-existing]: https://github.github.com/spec-kit/how-to/existing-projects.html
[tlc-lean]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-lean/SKILL.md
[tlc-driven]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-driven/SKILL.md
[dotcontext]: https://github.com/vinilana/dotcontext#what-dotcontext-is
