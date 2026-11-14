---
name: implementar-backend
description: Implementa mudanças de backend com contratos, dados e provas de comportamento.
---

# Implementar backend

Siga o escopo aprovado, os contratos e a stack existentes. Ao implementar uma
spec, confirme spec e plano aprovados e, antes de alterar código, execute
`node .pbai4devs/scripts/executar-script/SCRIPT.mjs verificar-configuracao`.
Se o estado estiver ausente, inválido ou pendente, ou faltar prova obrigatória,
pare e informe o responsável. Saída zero ainda exige conferir as evidências.
Siga a ordem e as pré-condições já acordadas em
[implementar-spec](../../specs/implementar-spec/SKILL.md), sem reiniciar o fluxo
nem pedir novamente aprovações já dadas.

Em correção avulsa autorizada de projeto existente, preserve suas decisões e
use `preparar-dev` quando necessário, sem inventar spec ou estado. Uma tarefa
que cite uma spec ou esteja coberta por seu escopo é tarefa de spec, mesmo
sendo correção pontual; não a trate como avulsa. Esclareça dúvidas sobre
entradas, saídas, persistência, compatibilidade e falhas antes de decidir.
Altere somente o escopo atribuído.

Verifique validação de entrada, autorização por recurso e isolamento de dados.
Considere limites, concorrência, repetição, timeout, migração e recuperação
quando se aplicarem; não registre segredos. Reutilize convenções e ferramentas
do projeto sem presumir banco, framework ou serviço externo.

Prove casos normais e negativos por testes automatizados e, quando aplicável,
por chamadas reais à API com dados isolados. Mocks não comprovam integrações
que não foram executadas. Versione testes; mantenha resultados locais ignorados.
Relate critérios, comandos, observações e dependências não verificadas.
