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
O [comando agêntico](../../commands/sincronizar/COMMAND.md) usa `--force` por
padrão; executar este script diretamente não ativa essa opção. A CLI oferece
`sync --dry-run --json` para consultar o plano antes de aplicá-lo.
Recursos nativos humanos recebem um bloco curto com a referência ao hub.
Texto, frontmatter e nomes existentes são preservados. O estado guarda só o
hash desse bloco; edições externas continuam permitidas. Um bloco alterado
não é sobrescrito por `--force`. Links humanos continuam opacos.
Comandos Gemini recebem o complemento dentro do `prompt` TOML.

Metadados vêm da fonte ou do YAML nativo declarado no manifesto. Regras exigem
`trigger` válido; `glob` exige `globs`. Origens nativas precisam pertencer ao
catálogo; resultados, caches e pastas temporárias não entram nos índices.

`espelhos.conf` define `agente|pasta|layout`, pode ajustar cada tipo com
`formato|pasta|tipo|formato` e registrar `descoberta|.agents|antigravity`.
`agrupado` preserva a árvore; `plano` retira categorias; `arquivo` preserva
categorias e usa `nome.md`. `mdc`, `instrucoes`, `prompt` e `agente` produzem as
extensões nativas; `nenhum` desativa a derivação de skills naquela rota.
`fallback|destino|origem|skills` usa o destino para cada skill cuja rota de
origem estiver obstruída. A descoberta gera os três manifestos JSON do Antigravity.
Veja os motivos e limites em [Compatibilidade](../../COMPATIBILIDADE.md).

Sem manifesto, o sincronizador gera a política de
`templates/clients/ADAPTERS.json`, usando a seleção salva ou `all`.
Após a instalação, depende somente de Node e do hub local, sem o pacote npm.
Ele respeita os clientes escolhidos, sem recriar os desmarcados. Para trocar
a seleção, use `agentdevkit agents <lista>`; não edite o manifesto gerado.

O bloco local em `.git/info/exclude` ignora as pastas de clientes por padrão;
sem Git, a proteção fica pendente até `git init` e sincronização. Para incluir
uma pasta, use uma exceção literal no `.gitignore` da raiz, como `!/.claude/`.
Isso também vale para `.github` e `.vscode`, que podem conter arquivos humanos.
Arquivos já rastreados e o índice não são alterados automaticamente.
Entradas novas usam os templates; hashes em `state/derived.json` permitem
atualizar arquivos gerados e blocos separadamente, preservando alterações humanas.
`--check` somente verifica; não altera o índice.
Apontamentos obsoletos podem ser removidos quando a propriedade é comprovada;
arquivos e pastas próprios, inclusive os adicionais dentro do mesmo recurso,
devem permanecer.
O estado derivado registra remoções comprovadas para reconciliá-las no próximo
`update`; campos adicionais existentes no estado são preservados.
