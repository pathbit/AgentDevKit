---
name: implementar-frontend
description: Implementa interfaces web conforme a spec, o design e as provas de uso.
---

# Implementar frontend

Siga a spec e o plano aprovados, o design e os componentes existentes.
Esclareça comportamento, conteúdo e acessibilidade
quando faltarem decisões; não escolha framework nem crie telas fora do escopo.

Considere estados de carregamento, vazio, erro e sucesso; navegação por teclado,
semântica acessível e diferentes tamanhos de tela. Preserve contratos com o
backend e evite expor segredos ou dados de outras pessoas.

Execute os testes apropriados e abra a interface real em navegador disponível.
Percorra os fluxos alterados em desktop e celular quando aplicável; confira
resultado, console e rede. Testes automáticos de acessibilidade são parciais:
inclua inspeção por teclado e relate o que não foi verificado. Uma captura ou
fixture isolada não prova o produto. Veja [Playwright](https://playwright.dev/docs/accessibility-testing).
