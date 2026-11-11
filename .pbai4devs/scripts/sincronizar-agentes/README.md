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

Metadados vêm da fonte ou do YAML nativo declarado no manifesto. Regras exigem
`trigger` válido; `glob` exige `globs`. Origens nativas precisam pertencer ao
catálogo; resultados, caches e pastas temporárias não entram nos índices.

`espelhos.conf` define `agente|pasta|layout`, pode ajustar cada tipo com
`formato|pasta|tipo|formato` e registrar `descoberta|.agents|antigravity`.
`agrupado` preserva a árvore; `plano` retira categorias; `arquivo` preserva
categorias e usa `nome.md`. `mdc`, `instrucoes`, `prompt` e `agente` produzem as
extensões nativas. A descoberta gera os três manifestos JSON do Antigravity.
Veja os motivos e limites em [Compatibilidade](../../COMPATIBILIDADE.md).

O instalador gera esse manifesto a partir de `src/adapters`. Após a instalação,
o sincronizador depende somente de Node e do hub local, sem o pacote npm.
Ele respeita os clientes escolhidos, sem recriar os desmarcados. Para trocar
a seleção, use `agentdevkit agents <lista>`; não edite o manifesto gerado.
