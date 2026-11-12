---
description: Coexistência com agentes e links simbólicos de projetos existentes.
status: aprovado
version: 0.0.9
---

# Preservar agentes existentes

## Objetivo

Instalar e atualizar o AgentDevKit no Zod e em projetos com agentes próprios,
preservando configurações, arquivos, permissões, links e estado do Git.
O pedido atual substitui o bloqueio conservador documentado na
[versão anterior](../v0.0.8/SPEC.md).

## Contrato

- Tratar links simbólicos humanos nas entradas e nos clientes como caminhos
  preservados: não abrir, atravessar, converter, sobrescrever ou adotar.
- Preservar agentes e skills humanos, inclusive nomes iguais aos do kit e
  durante execução com `--force`. Informar os caminhos preservados.
- Gerar os apontamentos disponíveis sem atribuir ao kit arquivos preservados.
  No Zod, manter `.codex/skills` e usar também `.agents/skills` para o Codex.
- Manter a validação estrita em fontes, estado, ferramentas, Git e caminhos
  antes pertencentes ao kit. Um link não pode esconder alteração gerenciada.
- Manter os mesmos contratos na CLI e no sincronizador instalado.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Links humanos internos, externos e quebrados permanecem intactos. |
| AC-002 | Skills, agentes e configurações preexistentes são preservados. |
| AC-003 | Caminhos gerenciados recusam links sem escrita externa. |
| AC-004 | Init, update, doctor e sync são coerentes e idempotentes. |
| AC-005 | Zod, Express e Chi passam na matriz do pacote, preservando Git. |
| AC-006 | Regressões, documentação, CI e pacote público são verificados. |

## Validação

Executar testes de regressão para links e colisões, inclusive `--force`,
substituição de caminhos após o plano e mudança de seleção dos clientes.
Rodar pipeline completo, maturidade e matriz OSS com o TGZ candidato;
repetir a matriz com o pacote publicado. Comparar bytes, tipos, modos,
destinos de links, staging e configuração Git nos clones.

Clones e evidências ficam ignorados em `tmp/` e `.agent-tests/`.
O escopo é a instalação do kit; não afirmar execução das aplicações clonadas.

## Documentação afetada

Atualizar instalação, CLI, recuperação, recursos, sincronização, testes,
changelog e índices. Preservar as specs antigas como histórico.
