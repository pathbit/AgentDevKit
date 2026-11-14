---
name: implementar-frontend
description: Implementa interfaces web conforme a spec, o design e as provas de uso.
---

# Implementar frontend

Siga o escopo aprovado, o design e os componentes existentes. Ao implementar
uma spec, confirme spec e plano aprovados e, antes de alterar código, execute
`node .pbai4devs/scripts/executar-script/SCRIPT.mjs verificar-configuracao`.
Se o estado estiver ausente, inválido ou pendente, ou faltar prova obrigatória,
pare e informe o responsável. Saída zero ainda exige conferir as evidências.
Siga a ordem e as pré-condições já acordadas em
[implementar-spec](../../specs/implementar-spec/SKILL.md), sem reiniciar o fluxo
nem pedir novamente aprovações já dadas.

Em correção avulsa autorizada de projeto existente, preserve suas decisões e
use `preparar-dev` quando necessário, sem inventar spec ou estado. Uma tarefa
que cite uma spec ou esteja coberta por seu escopo é tarefa de spec, mesmo
sendo correção pontual; não a trate como avulsa. Esclareça comportamento,
conteúdo e acessibilidade quando faltarem decisões; não escolha framework nem
crie telas fora do escopo.

Considere estados de carregamento, vazio, erro e sucesso; navegação por teclado,
semântica acessível e diferentes tamanhos de tela. Preserve contratos com o
backend e evite expor segredos ou dados de outras pessoas.

Execute os testes apropriados e abra a interface real em navegador disponível.
Percorra os fluxos alterados em desktop e celular quando aplicável; confira
resultado, console e rede. Testes automáticos de acessibilidade são parciais:
inclua inspeção por teclado e relate o que não foi verificado. Uma captura ou
fixture isolada não prova o produto. Veja [Playwright](https://playwright.dev/docs/accessibility-testing).
