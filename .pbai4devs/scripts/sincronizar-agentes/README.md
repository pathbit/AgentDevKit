---
description: Gera catálogos e apontamentos a partir da origem compartilhada.
---

# Sincronizar agentes

```sh
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --check
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --force
node --test .pbai4devs/scripts/sincronizar-agentes/tests/TEST.mjs
```

`--check` só confere; a execução normal atualiza os recursos. `--force` salva
conflitos em `.agent-tests/` antes de reparar os caminhos gerenciados.
Recursos nativos humanos e seus links permanecem intactos, inclusive com
`--force`. O retorno inclui `preserved`; esses caminhos não contam como
derivados pendentes nem passam a pertencer ao kit.

Metadados vêm da fonte ou do YAML nativo declarado no manifesto. Regras exigem
`trigger` válido; `glob` exige `globs`. Origens nativas precisam pertencer ao
catálogo; resultados, caches e pastas temporárias não entram nos índices.

`espelhos.conf` define `agente|pasta|layout`, pode ajustar cada tipo com
`formato|pasta|tipo|formato` e registrar `descoberta|.agents|antigravity`.
`agrupado` preserva a árvore; `plano` retira categorias; `arquivo` preserva
categorias e usa `nome.md`. `mdc`, `instrucoes`, `prompt` e `agente` produzem as
extensões nativas. A descoberta gera os três manifestos JSON do Antigravity.
Veja os motivos e limites em [Compatibilidade](../../COMPATIBILIDADE.md).

Sem manifesto, o sincronizador gera a política de
`templates/clients/ADAPTERS.json`, usando a seleção salva ou `all`.
Após a instalação, depende somente de Node e do hub local, sem o pacote npm.
Ele respeita os clientes escolhidos, sem recriar os desmarcados. Para trocar
a seleção, use `agentdevkit agents <lista>`; não edite o manifesto gerado.

Os derivados ficam locais: catálogos, manifesto, estado e apontamentos são
excluídos pelo Git. O bloco em `.git/info/exclude` preserva regras próprias;
sem Git, usa um bloco na raiz que migra ao executar depois de `git init`.
Raízes dedicadas são locais por completo; `.github` e `.vscode` excluem somente
os arquivos gerados. Conteúdo próprio permanece no disco e não é desindexado
sem comprovação de propriedade do kit.
Entradas novas usam os templates; hashes em `estado/derived.json` permitem
atualizar apenas arquivos integralmente gerados, preservando alterações humanas.
`--check` também acusa derivados ainda rastreados; não altera o índice.
