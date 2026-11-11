---
name: sincronizar-agentes
description: Atualiza catálogos gerados e apontamentos dos recursos compartilhados.
---

# Sincronizar agentes

Use Node.js 24+ em qualquer sistema:

```sh
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --force
```

Também pode usar `executar-script` com o nome `sincronizar-agentes`.

Após criar, alterar, mover ou remover recursos, sincronize e repita com `--check`.
Somente os principais `SKILL.md`, `COMMAND.md`, `AGENT.md` e `RULE.md` são fontes.
O mesmo comando gera `catalog.json` com todos os tipos e os três registros
auxiliares. Os JSON derivados não são editados à mão. `--check` compara arquivos
com as fontes, detectando inclusões, alterações, remoções e referências inválidas.
Os `.gitignore` de `.pbai4devs` e dos clientes também são gerados dos
[modelos](../../../templates/gitignore/TEMPLATE.md). Preserve regras próprias
fora do bloco gerenciado; `--check` identifica blocos ausentes ou divergentes.
`--force` repara os destinos gerenciados, sobrescreve conflitos e limpa extras
nesses destinos, com backup local do conteúdo próprio em `.agent-tests/`.
Não apague raízes inteiras: workflows, configurações nativas e a origem ficam
fora da limpeza. `--check` só confere, sem corrigir nem criar backups.

O manifesto `.pbai4devs/espelhos.conf` registra clientes, layout e entradas nativas.
Use `gitignore|pasta` para pastas como `.vscode`, sem espelhar recursos nelas.
`plano` adapta os nomes à descoberta dos clientes; metadados próprios de SDK
podem vir de um YAML ao lado da fonte. Antigravity e Gemini recebem seus
apontamentos nativos; o catálogo geral inclui comandos, tools, scripts e modelos.
Não replique tools, scripts, templates, estado, testes, docs ou guias.
Não use `--documento`; mantenha documentos fora dos espelhos.

Confira a [compatibilidade](../../../COMPATIBILIDADE.md); um link não importa
seu conteúdo automaticamente. Sem Node, use o preparo automático das ferramentas.
