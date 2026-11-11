---
description: Identifica o ambiente local e a estrutura do projeto sem alterações.
---

# Diagnosticar

Entrada: nenhuma. Confira Node/npm conforme o
[primeiro uso](../../scripts/preparar-ferramentas/README.md) antes dos scripts.

Use [executar-script](../../skills/projeto/executar-script/SKILL.md) para rodar
[diagnosticar-ambiente](../../scripts/diagnosticar-ambiente/) e
[inspecionar-projeto](../../scripts/inspecionar-projeto/), sem `--check`.
Este caso só inspeciona; não instala ferramentas nem inicia a aplicação.
Interprete a disponibilidade informada; saída zero não aprova dependências
ausentes ou ferramentas ainda não verificadas.

Saída: tipo de projeto, SO, ferramentas disponíveis e pendências. Resuma os
resultados; salve relatórios apenas em `.agent-tests/` quando necessários.
