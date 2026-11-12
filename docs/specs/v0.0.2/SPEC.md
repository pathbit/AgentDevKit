---
description: Instalação seletiva e persistente dos agentes usados pelo projeto.
status: aprovado
version: 0.0.2
---

# Selecionar agentes por projeto

## Objetivo

Criar apenas os apontamentos dos agentes escolhidos, mantendo a origem única
em `.pbai4devs`. A seleção funciona no terminal, em agentes desktop e em
execuções sem interação. Escopo solicitado e autorizado pelo usuário, conforme
[PRD](../../product/prd.md), [UX](../../product/ux-ui.md) e [design](../../product/design.md).

## Comportamento

- `init --agents codex,claude` instala os clientes selecionados.
- `agents` consulta; `agents codex,claude` altera; `agents all` ativa todos.
- No primeiro uso interativo, a CLI pergunta idioma e agentes.
- Em um aplicativo, o agente pode reunir a escolha pelo chat e passá-la à CLI.
- A prioridade é opção explícita, escolha salva e, por último, `all`.
- Sem terminal interativo, com `--yes`, `--json` ou `--dry-run`, não há pergunta.
- A seleção é persistida em `estado/agentdevkit.json`; `all` mantém seu sentido
  de todos, inclusive clientes adicionados em versões futuras.
- Atualizar, sincronizar, trocar idioma e consultar não reativam clientes
  desmarcados. Estados antigos sem seleção continuam equivalentes a `all`.
- Dependências de descoberta são incluídas: Codex precisa de `.agents`, por
  exemplo. As pastas efetivas podem ser compartilhadas entre clientes.
- Desmarcar remove somente derivados próprios comprovados. Arquivos humanos
  permanecem; alterações em arquivos gerenciados produzem conflitos e backup.

O hub, scripts, modelos e ferramentas permanecem completos. Selecionar agentes
não instala ferramentas, escolhe a stack nem inicia o produto. Não inclui
detecção por processos, configuração global de editores ou login nos clientes.

## Plano

1. Centralizar IDs, aliases, dependências e entradas nativas nos adaptadores.
2. Filtrar o manifesto e persistir a escolha na instalação.
3. Implementar consulta, alteração e perguntas sem bloquear automações.
4. Remover derivados desmarcados com as proteções existentes de propriedade.
5. Atualizar os guias e as skills de configuração; sincronizar os recursos.
6. Verificar seleção, migração, preservação, pacote real e distribuição.

## Critérios de aceite

| ID | Resultado observável | Prova |
| --- | --- | --- |
| AC-001 | Gera só os clientes escolhidos e suas dependências. | Adaptadores |
| AC-002 | Escolha explícita e pergunta interativa funcionam. | CLI e terminal |
| AC-003 | Sem interação, há seleção salva ou fallback all. | CLI/JSON |
| AC-004 | Atualização e sync preservam a escolha. | CLI e script direto |
| AC-005 | Alterar seleção preserva conteúdo humano. | Hashes e conflitos |
| AC-006 | Erros de entrada e simulação não alteram o alvo. | Testes negativos |
| AC-007 | Estado legado e all mantêm compatibilidade. | Migração e repetição |
| AC-008 | Pacote real, guias e revisão são verificados. | Pacote, lint e CI |

Use Node 24/26, diretórios vazios e existentes e instalações via tarball real.
Teste as raízes, entradas, índices e `.gitignore`; não considere apenas a
mensagem de sucesso. Exercite o sincronizador instalado sem depender de `src/`.

Código de testes é versionado. Resultados e relatório por critério ficam em
`.agent-tests/client-selection/<execucao>/`. A seleção de arquivos não comprova
carregamento em todo aplicativo; registre separadamente o que foi executado.

[Todas as specs](../README.md) · [Wiki](../../README.md)
