---
name: criar-regra
description: Cria ou atualiza regras compartilhadas e seus apontamentos.
---

# Criar regra

Defina finalidade, contexto e ativação. Crie ou atualize
`.pbai4devs/rules/<nome>/RULE.md` com `description` e ativação explícita.
Preserve escopos e mapeie diferenças sem ampliar a ativação silenciosamente.
Defina `trigger` como `always_on`, `model_decision`, `glob` ou `manual` para
Antigravity; `model_decision` usa a descrição e `glob` exige `globs`.
Mantenha adaptações de outros clientes em YAMLs ao lado da fonte, registrados
no manifesto. Confira os valores na [compatibilidade](../../../COMPATIBILIDADE.md).
Mantenha a referência nativa de `.github/instructions/` quando aplicável.

Atualize índice/guia, siga a regra de qualidade e finalize com
`sincronizar-agentes`, inclusive após renomear ou remover regras. Verifique
ativação quando possível e informe quando a leitura precisar ser explícita.
