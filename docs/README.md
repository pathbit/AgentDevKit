---
description: Wiki do AgentDevKit, do primeiro uso à manutenção do kit.
language: pt
---

# Wiki do AgentDevKit

O AgentDevKit organiza instruções de trabalho para agentes de código. A pasta
`.pbai4devs` guarda a origem; as pastas dos clientes apontam para ela. Você
pode trocar de agente sem manter várias cópias das mesmas instruções.

## Organização

| Pasta | Conteúdo |
| --- | --- |
| [Guias](guides/README.md) | Instalação, uso, comandos e solução de problemas. |
| [Produto](product/README.md) | Requisitos, experiência, arquitetura e roadmap. |
| [Manutenção](maintainers/README.md) | Desenvolvimento, comunidade e publicação. |
| [Specs](specs/README.md) | Escopo e critérios de aceite de cada incremento. |

## Comece pelo seu objetivo

| Objetivo | Caminho |
| --- | --- |
| Preparar o computador | [Node/npm no Windows, macOS e Linux](guides/prerequisites.md) |
| Primeiro uso | [Instalar via npm ou GitHub Packages][install] → [seguir o fluxo][flow] |
| Projeto em andamento | [Instalar com simulação][install] → [retomar][flow] |
| Evoluir documentação existente | [Inventariar e complementar](guides/documentation.md) |
| Personalizar agentes | [Recursos][resources] → [compatibilidade][clients] |
| Entender cada peça com um exemplo | [Recursos na prática](guides/recursos-na-pratica.md) |
| Escolher especialistas e distribuir trabalho | [Perfis e colaboração](guides/resources.md#especialistas-e-colaboração) |
| Revisar segurança | [Scanners locais e controles](guides/security.md) |
| Executar ou verificar algo | [CLI](guides/cli.md) → [ferramentas e testes][tests] |
| Corrigir uma dificuldade | [Soluções e recuperação](guides/troubleshooting.md) |
| Contribuir com o kit | [Contribuir][contrib] → [design](product/design.md) |
| Desenvolver e experimentar | [Guia rápido][development] → [exemplos][examples] |
| Preparar uma versão | [Manutenção e releases](maintainers/maintenance.md) |
| Publicar o pacote nos dois registries | [npm e GitHub Packages](maintainers/packages.md) |
| Relatar um bug ou propor melhoria | [Participar](maintainers/community.md) |

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

## Conheça este produto

- [PRD](product/prd.md): problema, público, requisitos e limites.
- [Experiência da CLI](product/ux-ui.md): interação, idiomas e saídas.
- [Design técnico](product/design.md): componentes, estado e preservação de arquivos.
- [Roadmap](product/roadmap.md) e [specs](specs/README.md): escopo das entregas.
- [Changelog](../CHANGELOG.md): mudanças por versão.

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
[flow]: guides/workflow.md
[clients]: ../.pbai4devs/COMPATIBILIDADE.md
[tests]: guides/tools-and-testing.md
[contrib]: ../CONTRIBUTING.md
[examples]: https://github.com/pathbit/AgentDevKit/tree/master/examples
[resources]: guides/resources.md
[development]: maintainers/development.md
