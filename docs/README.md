---
description: Wiki do AgentDevKit, do primeiro uso à manutenção do kit.
language: pt
---

# Documentação do AgentDevKit

O AgentDevKit guarda instruções para agentes de código em `.pbai4devs` e
gera apontamentos para os clientes escolhidos.

## Primeiro uso

1. [Prepare Node.js e npm](guides/prerequisites.md).
2. [Instale e confira o kit][install]. Se o projeto já tem arquivos,
   [simule antes de aplicar][preview].
3. [Escolha um fluxo][flow] para planejar produto, rodar uma aplicação ou
   documentar um sistema existente.

## Consulte por objetivo

| Objetivo | Caminho |
| --- | --- |
| Atualizar o kit ou mudar clientes | [Atualizar e escolher agentes][update] |
| Já uso outro fluxo de planejamento ou contexto | [Comparar funcionalidades](guides/comparacao.md) |
| Evoluir documentação existente | [Inventariar e complementar](guides/documentation.md) |
| Personalizar agentes | [Recursos][resources] → [compatibilidade][clients] |
| Entender cada peça com um exemplo | [Recursos na prática](guides/recursos-na-pratica.md) |
| Escolher especialistas e distribuir trabalho | [Perfis e colaboração](guides/resources.md#especialistas-e-colaboração) |
| Revisar segurança | [Scanners locais e controles](guides/security.md) |
| Consultar comandos e respostas JSON | [Referência da CLI](guides/cli.md) |
| Escolher e verificar ferramentas para uma tarefa | [Plugins e créditos](guides/plugins.md) · [Ferramentas e testes][tests] |
| Corrigir uma dificuldade | [Soluções e recuperação](guides/troubleshooting.md) |

O [índice de guias](guides/README.md) reúne essas referências em ordem de uso.

## Entenda os termos

| Termo | Significado |
| --- | --- |
| Skill | Procedimento que orienta decisões e ações de uma tarefa. |
| Regra | Orientação aplicável a um contexto de trabalho. |
| Comando | Entrada de um caso de uso com passos, argumentos e saída. |
| Perfil de agente | Responsável por uma tarefa completa. |
| Adaptador | Traduz referências para o formato de cada cliente. |
| Espelho | Apontamento gerado para um recurso da origem. |
| Template | Modelo que será preenchido com decisões do projeto. |
| Spec | Escopo de uma entrega com critérios verificáveis. |
| Evidência | Registro de uma verificação realmente executada. |

O agente lê e executa as instruções conforme as capacidades de seu cliente.
A CLI instala, sincroniza e diagnostica arquivos. Ter um apontamento correto
não comprova que determinado cliente carregou ou executou a skill.
O [guia de recursos](guides/resources.md) mostra como esses componentes se
combinam; não existe uma proporção obrigatória entre suas quantidades.

## Produto e manutenção

- [PRD](product/prd.md): problema, público, requisitos e limites.
- [Experiência da CLI](product/ux-ui.md): interação, idiomas e saídas.
- [Design técnico](product/design.md): componentes, estado e preservação de arquivos.
- [Roadmap](product/roadmap.md) e [specs](specs/README.md): escopo das entregas.
- [Tarefas](tasks/README.md): trabalho e evidências por incremento.
- [Changelog](../CHANGELOG.md): mudanças por versão.
- [Contribuir][contrib] · [Desenvolvimento][development] · [Exemplos][examples].
- [Manutenção](maintainers/README.md) · [Releases](maintainers/maintenance.md) ·
  [Publicação](maintainers/packages.md) · [Comunidade](maintainers/community.md).

Esta wiki documenta **o AgentDevKit** e fica versionada junto ao código.
Os projetos que recebem o kit usam os
[templates](../.pbai4devs/templates/README.md) para seus próprios documentos,
após perguntas e decisões. A instalação não copia esta wiki para `docs/`
do projeto atendido.

Os guias completos estão em português; os READMEs de entrada também existem
em [inglês](../README.en.md) e [espanhol](../README.es.md). O idioma salvo pela
CLI orienta a comunicação dos agentes, sem traduzir documentos existentes.

[Voltar ao projeto](../README.md)

[install]: guides/installation.md#instalar
[preview]: guides/installation.md#simular-em-um-projeto-existente
[update]: guides/installation.md#atualizar-e-escolher-agentes
[flow]: guides/workflow.md
[clients]: ../.pbai4devs/COMPATIBILIDADE.md
[tests]: guides/tools-and-testing.md
[contrib]: ../CONTRIBUTING.md
[examples]: https://github.com/pathbit/AgentDevKit/tree/main/examples
[resources]: guides/resources.md
[development]: maintainers/development.md
