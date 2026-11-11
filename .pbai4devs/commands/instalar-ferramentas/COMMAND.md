---
description: Prepara Node e npm automaticamente, instala e valida as ferramentas locais.
---

# Instalar ferramentas

Entrada: `base`, `all`, grupo ou nome do [índice](../../tools/README.md);
padrão: `all`. Siga o [preparo automático](../../scripts/preparar-ferramentas/BOOTSTRAP.md):
identifique o SO e execute o inicializador nativo. Se Node/npm faltar ou falhar,
ele instala o runtime local e continua com `setup <seleção>` automaticamente.
Não transfira os passos de instalação para o usuário.

Siga [preparar-ferramentas](../../skills/projeto/preparar-ferramentas/SKILL.md).
Com Node pronto, também pode usar `executar-script` com
`preparar-ferramentas setup <seleção>`.
Esse único fluxo instala o que faltar e verifica cada CLI, preservando
instalações saudáveis. Rede é necessária quando faltar instalação.

Saída: versões, plataforma, resultados e itens não aplicáveis ou com falha.
Pacotes ficam ignorados em `.local/`; dependências de UI seguem a tarefa.
Para buscar versões mais recentes, use [atualizar](../atualizar-ferramentas/COMMAND.md).
