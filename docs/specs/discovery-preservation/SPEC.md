---
description: Descoberta de skills e preservação em projetos existentes.
---

# Descoberta e preservação

As integrações devem disponibilizar os recursos sem duplicar skills geradas
para o Codex e sem substituir configurações ou alterações próprias do projeto.

## Critérios de aceite

- AC-001: O Codex descobre cada skill na rota principal; rotas alternativas
  são usadas por recurso quando necessário e conflitos são informados.
- AC-002: `init`, `update` e `sync` preservam conteúdo humano, índice Git e
  `.gitignore` da raiz; limpeza exige propriedade comprovada.
- AC-003: A sincronização independente e a atualização reconciliam o estado,
  preservando campos adicionais e sinalizando inconsistências.
- AC-004: Scripts identificam sua execução principal por caminhos reais ou
  aliases, sem executar novamente quando importados.
- AC-005: Os exemplos de maturidade funcionam também a partir do pacote
  distribuído, preservando arquivos da origem e exemplos anteriores.
- AC-006: Testes cobrem combinações de clientes e projetos existentes; resultados,
  clones e projetos gerados ficam ignorados ou fora do repositório.

Descoberta e validação estrutural não demonstram execução completa de todas as
skills e perfis em cada cliente. Registre os limites das provas realizadas.
