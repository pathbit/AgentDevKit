---
description: Mesma versão pública no npm e GitHub Packages e limpeza do histórico falho.
status: aprovado
---

# Publicação sincronizada

## Objetivo

Remover as execuções antigas com erro, preservando execuções aprovadas e
releases publicadas. Publicar o mesmo AgentDevKit no npm e GitHub Packages,
sem mudar o número ou o conteúdo de uma versão já publicada.

## Contrato

- Excluir somente execuções concluídas com falha confirmada.
- Preservar tags, releases, assets e execuções aprovadas.
- Usar o TGZ original aprovado pelo CI nos dois registries.
- Manter `npx` pelo npm público sem autenticação como opção padrão.
- Autenticar o GitHub com token próprio, sem compartilhar credenciais.
- Confirmar visibilidade pública, versão e integridade nos dois destinos.
- Publicar ambos nas próximas tags; permitir completar só um destino.
- Recusar uma versão existente com bytes diferentes; nunca reempacotar a tag.

## Critérios de aceite

| ID | Prova |
| --- | --- |
| AC-001 | Execuções falhas removidas; aprovadas e releases preservadas. |
| AC-002 | Mesma versão e mesmo checksum nos dois registries. |
| AC-003 | GitHub público e associado ao repositório correto. |
| AC-004 | Tokens isolados e acesso anônimo ao npm preservado. |
| AC-005 | Automação publica ambos e permite retomar um destino. |
| AC-006 | Testes e revisão aprovados; consumo dos dois destinos verificado. |

## Validação

Comparar inventários remotos antes/depois da limpeza. Testar perfis de registry,
erros de autenticação, integridade divergente, repetição e seleção do workflow.
Completar a versão `0.0.9` no GitHub com seu artefato original, comparar os
registries e provar instalação, diagnóstico e sincronização.

Provas ficam em `tmp/` ou `.agent-tests/`, ignoradas pelo Git.
