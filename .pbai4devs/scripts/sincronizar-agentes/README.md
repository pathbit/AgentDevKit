---
description: Gera catálogos e apontamentos a partir da origem compartilhada.
---

# Sincronizar agentes

```sh
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --check
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --force
node --test .pbai4devs/scripts/sincronizar-agentes/tests/TEST.mjs
```

`--check` só confere e mostra até dez caminhos em conflito; a execução normal
atualiza os recursos. `--force` pode salvar backup em `.agent-tests/` antes de
reparar caminhos gerenciados; conflitos protegidos continuam bloqueados.
O script recusa atualizar ou remover um arquivo quando identifica mais de um
hardlink ou não consegue verificar uma contagem válida. Isso pode bloquear a
operação em sistemas de arquivos que não fornecem a contagem. A conferência não
impede alterações concorrentes após a leitura;
interrompa outros processos antes de sincronizar.
O `--check` informa hardlinks e contagens não verificadas nos caminhos que
planeja alterar; a situação pode mudar antes da aplicação.
Em atualizações no macOS e Linux, o estágio copia os metadados nativos
suportados e verifica a cópia antes da publicação. No macOS, ACLs que negam
escrita, flags de proteção ou consultas inconclusivas bloqueiam a operação;
ACLs legíveis e xattrs são preservados quando a verificação nativa passa.
Remoções com metadados que seriam perdidos continuam bloqueadas. ACLs de
diretórios e alterações concorrentes após a verificação não são cobertas.
Um caminho informado após falha pode conter dados parciais ou de outra origem;
preserve-o e revise antes de qualquer recuperação.
No macOS, um destino de backup com ACL herdada ou consulta inconclusiva é
recusado antes da cópia. A pasta vazia é informada para revisão; a inspeção não
garante privacidade contra alterações concorrentes nem cobre outros sistemas.
As consultas Git desativam rastreamentos herdados somente nos subprocessos, sem
alterar a configuração do usuário. Leituras ainda podem atualizar metadados
de acesso do sistema de arquivos.
O [comando agêntico](../../commands/sincronizar/COMMAND.md) usa a CLI: consulte
`sync --dry-run --json`, aplique `sync` e confira `sync --check`. O script
direto usa o manifesto existente; seu `--check` não detecta YAMLs nativos ainda
ausentes desse manifesto. A CLI recompõe o manifesto no planejamento.
Recursos nativos humanos recebem um bloco curto com a referência ao hub.
Texto, frontmatter e nomes existentes são preservados. O estado guarda só o
hash desse bloco; edições externas continuam permitidas. Um bloco alterado
não é sobrescrito por `--force`. Links humanos continuam opacos.
Comandos Gemini recebem o complemento dentro do `prompt` TOML.

Metadados vêm da fonte ou do YAML nativo declarado no manifesto. Regras exigem
`trigger` válido; `glob` exige `globs`. Origens nativas precisam pertencer ao
catálogo; resultados, caches e pastas temporárias não entram nos índices.
O tratamento dos gatilhos do Copilot e a migração conservadora de instruções
antigas estão descritos em [Compatibilidade](../../COMPATIBILIDADE.md).

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

O kit preserva os ignores existentes, `.git/info/exclude` e o índice Git.
Apontamentos e artefatos podem ficar visíveis; confira o status antes de
adicionar arquivos. O diagnóstico informa arquivos privados expostos e blocos
antigos no exclude que ainda possam afetar outras worktrees.
Entradas novas usam os templates; hashes em `state/derived.json` permitem
atualizar arquivos gerados e blocos separadamente, preservando alterações humanas.
Uma referência CRLF já equivalente à saída esperada pode ser mantida intacta,
sem bloco duplicado ou adoção de propriedade. Se houver divergência com um
registro derivado, o check direto informa o conflito e a API pode retornar
`line-ending-diverged`. A normalização não autoriza sobrescrita.
`--check` somente verifica; não altera o índice. Regras Claude remanescentes
após desmarcar o cliente geram aviso e falha no check, pois ainda podem estar
ativas. Confira-as antes de removê-las. Um link, erro ou limite de varredura
também deixa o escopo não verificado. Possíveis links em exemplos Markdown
podem gerar aviso conservador; o arquivo não é adotado por isso.
Apontamentos obsoletos podem ser removidos quando a propriedade é comprovada;
arquivos e pastas próprios, inclusive os adicionais dentro do mesmo recurso,
devem permanecer.
O estado derivado registra remoções comprovadas para reconciliá-las no próximo
`update`; campos adicionais existentes no estado são preservados.
