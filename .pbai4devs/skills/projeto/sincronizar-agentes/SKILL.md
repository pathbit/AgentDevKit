---
name: sincronizar-agentes
description: Atualiza catálogos e apontamentos dos recursos compartilhados.
---

# Sincronizar agentes

Confira `node --version`. Se houver Node.js 24+ instalado, selecione-o antes de
preparar outro runtime. Use a CLI da versão instalada com Node.js 24+:

```sh
agentdevkit sync --dry-run --json
agentdevkit sync --json
agentdevkit sync --check --json
```

Revise o plano, os conflitos e os arquivos preservados antes de aplicar. Se a
CLI não estiver no PATH, use o prefixo abaixo, substituindo `VERSAO` pela versão
em `.pbai4devs/state/agentdevkit.json`:

```sh
npx --yes --ignore-scripts --package=@pathbit/agentdevkit@VERSAO agentdevkit
```

O script direto usa o manifesto existente; seu `--check` não comprova que novos
YAMLs nativos foram incorporados. Use a CLI após alterar esses metadados.

Após criar, alterar, mover ou remover recursos, sincronize e use `--check`.
Os principais `SKILL.md`, `COMMAND.md`, `AGENT.md` e `RULE.md` são fontes.
O mesmo comando gera `catalog.json` com todos os tipos e os três registros
auxiliares. Os JSON derivados não são editados à mão. `--check` compara arquivos
com as fontes, detectando inclusões, alterações, remoções e links inválidos.
O sync cria `.pbai4devs/.gitignore` a partir do modelo quando ausente e preserva
os ignores existentes. Quando ele já existe, `--check` não compara seu conteúdo
ao modelo, embora possa apontar outros problemas; compare os arquivos para
avaliar divergências.
Não cria ignores nos clientes nem altera o ignore da raiz ou o exclude do Git.
`--force` não autoriza sobrescrever conteúdo humano; backups locais podem ficar
em `.agent-tests/` e devem ser revisados antes de qualquer restauração.
Preserve recursos nativos humanos, inclusive colisões de nomes; links humanos
são opacos e nunca devem ser atravessados. Confira `preserved` no JSON da CLI.
Não apague raízes inteiras: workflows, configurações nativas e a origem ficam
fora da limpeza. `--check` só confere, sem corrigir nem criar backups.

O manifesto gerado `.pbai4devs/espelhos.conf` registra clientes e formatos nativos;
não o edite à mão.
Respeite a seleção salva em `state/agentdevkit.json`; não reative clientes para
reparar apontamentos. Para alterá-la, use `agents` na CLI. Pastas compartilhadas
continuam quando necessárias; arquivos próprios dos clientes são preservados
pela CLI, inclusive ao reduzir a seleção.
Use `gitignore|pasta` para pastas como `.vscode`, sem espelhar recursos nelas.
`plano` adapta os nomes à descoberta dos clientes; metadados próprios de SDK
podem vir de um YAML ao lado da fonte. Antigravity e Gemini recebem seus
apontamentos; o catálogo geral inclui comandos, tools, scripts e modelos.
Não replique tools, scripts, templates, estado, testes, docs ou guias.
Não use `--documento`; mantenha documentos fora dos espelhos.

Confira a [compatibilidade](../../../COMPATIBILIDADE.md); um link não importa
seu conteúdo. Sem Node, use o preparo automático das ferramentas.
