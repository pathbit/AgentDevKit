---
name: planejar-qa
description: Planeja e executa verificações de QA orientadas a riscos e critérios de aceite.
---

# Planejar QA

Para cada critério de aceite, identifique o comportamento observável, riscos,
dados, pré-requisitos e ambiente. Se uma decisão impedir a prova, esclareça-a;
não invente acesso, dados ou resultados.

Escolha casos positivos, negativos, limites, transições e regressões relevantes.
Combine testes unitários, integração, API, navegador ou desktop conforme o
produto e o risco; use ferramentas existentes e fixtures isoladas. Testes de
contrato ou mocks não substituem uma integração real não executada.

Registre para cada critério comando ou ação, resultado observado e estado
**passou**, **falhou** ou **não verificado**, com evidência e limitações.
Versione o código dos testes e salve resultados em `.agent-tests/` ou diretório
ignorado. Encaminhe hipóteses de falha à
[validação adversarial](../validar-adversarial/SKILL.md).
