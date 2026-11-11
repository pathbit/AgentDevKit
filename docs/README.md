---
description: Wiki do AgentDevKit, do primeiro uso à manutenção do kit.
language: pt
---

# Wiki do AgentDevKit

O AgentDevKit organiza instruções de trabalho para agentes de código. A pasta
`.pbai4devs` guarda a origem; as pastas dos clientes apontam para ela. Você
pode trocar de agente sem manter várias cópias das mesmas instruções.

## Comece pelo seu objetivo

| Objetivo | Caminho |
| --- | --- |
| Primeiro uso | [Instalar](installation.md) → [seguir o fluxo](workflow.md) |
| Projeto em andamento | [Instalar com simulação][install] → [retomar][flow] |
| Personalizar agentes | [Recursos](resources.md) → [compatibilidade][clients] |
| Executar ou verificar algo | [CLI](cli.md) → [ferramentas e testes][tests] |
| Corrigir uma dificuldade | [Soluções e recuperação](troubleshooting.md) |
| Contribuir com o kit | [Contribuir][contrib] → [design](design.md) |
| Preparar uma versão | [Manutenção e releases](maintenance.md) |

## Entenda os termos

| Termo | Significado |
| --- | --- |
| Skill | Procedimento que o agente segue para uma tarefa. |
| Regra | Orientação aplicável a um contexto de trabalho. |
| Comando | Entrada para executar um caso de uso. |
| Perfil de agente | Papel especializado, como revisão. |
| Adaptador | Traduz referências para o formato de cada cliente. |
| Espelho | Apontamento gerado para um recurso da origem. |
| Template | Modelo que será preenchido com decisões do projeto. |
| Spec | Escopo de uma entrega com critérios verificáveis. |
| Evidência | Registro de uma verificação realmente executada. |

O agente lê e executa as instruções conforme as capacidades de seu cliente.
A CLI instala, sincroniza e diagnostica arquivos. Ter um apontamento correto
não comprova que determinado cliente carregou ou executou a skill.

## Conheça este produto

- [PRD](prd.md): problema, público, requisitos e limites.
- [Experiência da CLI](ux-ui.md): interação, idiomas e saídas.
- [Design técnico](design.md): componentes, estado e preservação de arquivos.
- [Roadmap](roadmap.md) e [specs](specs/README.md): escopo das entregas.
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

[install]: installation.md#projeto-novo-ou-existente
[flow]: workflow.md
[clients]: ../.pbai4devs/COMPATIBILIDADE.md
[tests]: tools-and-testing.md
[contrib]: ../CONTRIBUTING.md
