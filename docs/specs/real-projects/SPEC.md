---
description: Compatibilidade com repositórios públicos e exemplos incrementais.
status: aprovado
version: 0.0.13
---

# Projetos reais e exemplos incrementais

Validar a instalação e manutenção do pacote em commits fixos de projetos reais,
preservando suas configurações e seu índice Git. Demonstrar o fluxo de produto,
design e três specs em dois projetos novos, com resultados locais ignorados.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Testar os sete repositórios, com commits registrados. |
| AC-002 | Testar init repetido, update, sync e preservação nos clones. |
| AC-003 | Proteger caches ante exceções Git, preservando texto e índice. |
| AC-004 | Produto e design antes das três specs de cada projeto novo. |
| AC-005 | Documentar reprodução, limites e saídas ignoradas. |
| AC-006 | Testes de regressão, pacote e revisão independente passam. |

Os testes de compatibilidade não executam nem compilam as aplicações externas.
Aprovações de produto e revisão nos exemplos são simuladas. Código de teste é
versionado; clones, projetos gerados e evidências permanecem fora do Git.
