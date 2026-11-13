---
name: implementar-backend
description: Implementa mudanças de backend com contratos, dados e provas de comportamento.
---

# Implementar backend

Siga a spec e o plano aprovados, os contratos e a stack existentes. Esclareça
dúvidas sobre entradas, saídas, persistência,
compatibilidade e falhas antes de decidir. Altere somente o escopo atribuído.

Verifique validação de entrada, autorização por recurso e isolamento de dados.
Considere limites, concorrência, repetição, timeout, migração e recuperação
quando se aplicarem; não registre segredos. Reutilize convenções e ferramentas
do projeto sem presumir banco, framework ou serviço externo.

Prove casos normais e negativos por testes automatizados e, quando aplicável,
por chamadas reais à API com dados isolados. Mocks não comprovam integrações
que não foram executadas. Versione testes; mantenha resultados locais ignorados.
Relate critérios, comandos, observações e dependências não verificadas.
