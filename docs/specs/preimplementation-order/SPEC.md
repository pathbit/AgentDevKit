---
description: Orientação e verificação da ordem anterior à implementação.
---

# Ordem antes da implementação

O projeto deve partir de decisões de produto e design, passar por roadmap e
spec e concluir a configuração técnica antes do código da aplicação.

## Critérios de aceite

- AC-001: `next` orienta roadmap e spec antes da configuração técnica e não
  presume aprovação ou escolhe uma spec ambígua.
- AC-002: A verificação prévia informa bloqueio se o estado de preparação ou
  configuração estiver ausente, inválido ou pendente; ela não modifica Git.
- AC-003: As skills exigem provas da infraestrutura antes de implementar e
  registram como pendentes as provas de uma aplicação que ainda não existe.
- AC-004: Projetos existentes, arquivos humanos, links e índice são
  preservados; testes e revisão cobrem decisões, lacunas e retomada.

O status registrado não comprova a evidência por si só. Instruções e scripts
não impedem escrita arbitrária por um agente que os ignore; essa proteção
depende das permissões ou hooks do cliente usado.
