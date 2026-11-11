---
description: Confere a estrutura, os testes e as ferramentas locais dos agentes.
---

# Verificar agentes

Entrada: nenhuma. Pré-requisitos: Node.js 24+ e ferramentas base
preparadas. Os apontamentos devem estar sincronizados.

Use [executar-script](../../skills/projeto/executar-script/SKILL.md), nesta ordem:
`verificar-recursos`, `testar-infraestrutura` e
`preparar-ferramentas check base`. O comando não instala nem corrige arquivos.
Se os apontamentos divergirem, informe o caso [sincronizar](../sincronizar/COMMAND.md).
Ao alterar catálogos, sincronização ou instalação, execute também
`testar-maturidade run` e confira os cenários em `examples/generated/`.

Saída: passou, falhou ou não verificado por etapa, com evidências em
`.agent-tests/`. Falhas, testes ignorados ou ferramentas ausentes não aprovam
a etapa. Provas web usam [testar-navegador](../testar-navegador/COMMAND.md).
