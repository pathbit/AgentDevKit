---
description: Testes em projetos reais e proteção de artefatos locais.
status: aprovado
version: 0.0.7
---

# Compatibilidade com projetos existentes

## Objetivo e autorização

Atender ao pedido de testar o pacote publicado em projetos open source com
conteúdo real, usando clones em `tmp/` ignorado. Corrigir a falta de proteção
de artefatos revelada em projetos que não tinham as regras do AgentDevKit.

O trabalho usa o [PRD](../../product/prd.md),
o [design](../../product/design.md) e a
[distribuição pública](../v0.0.6/SPEC.md). Não altera as aplicações clonadas.

## Contrato

- Clonar commits fixos de Express, Zod e Chi; preservar os projetos originais.
- Comparar bytes, tipos, permissões, links, HEAD e alterações staged.
- Verificar instalação, atualização, repetição, skill própria e conflitos.
- Proteger artefatos no ignore local sem reescrever o `.gitignore` do usuário
  nem desindexar arquivos humanos. Respeitar projetos irmãos e exceções.
- Manter as recusas de links simbólicos. Um bloqueio seguro não comprova
  instalação bem-sucedida; relatá-lo e verificar ausência de alterações.
- Versionar o teste; guardar clones, logs e resultados somente em `tmp/`.
- Publicar correções como nova versão estável; repetir a prova pública.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Matriz real registra resultado e preservação por projeto. |
| AC-002 | Artefatos são ignorados sem alterar fontes ou projetos irmãos. |
| AC-003 | Regressões e revisão independente aprovam a correção. |
| AC-004 | Pacote estável publicado repete os resultados e atualiza o router. |

## Verificação

- **AC-001:** executar o runner contra o npm, incluindo caso staged e bloqueios;
  registrar commits, versão e hashes. Não confundir com testes das aplicações.
- **AC-002:** testar Git, instalação sem Git, projeto aninhado, caixa mista,
  exceções humanas e artefatos já rastreados. Não forçar sobrescritas.
- **AC-003:** executar testes do pacote, infraestrutura, lint e distribuição.
  Comparar testes nativos do Express antes e depois, sem modificar suas fontes.
- **AC-004:** conferir release, `latest`, checksum e instalação anônima; repetir
  matriz com o pacote publicado e atualizar o router com backup e diagnóstico.

Evidências dos clones ficam em `tmp/oss-compatibility/`; o relatório de revisão
em `.agent-tests/oss-compatibility/` referencia cópias dessas provas.
Zod e Chi não terão testes nativos sem os runtimes/gerenciadores exigidos.
Não concluir compatibilidade universal a partir desta matriz.

## Documentação afetada

Atualizar instalação, testes, changelog, índices e roadmap. Documentar a
proteção de artefatos locais e os limites de configurações preexistentes.
