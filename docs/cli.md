---
description: Comandos, opções, JSON e códigos de saída do AgentDevKit 0.0.1.
---

# Referência da CLI

Use esta página após a [instalação](installation.md). Todos os caminhos de
projeto aceitam aspas; sem `--target`, a CLI usa a pasta atual.
Executar sem comando equivale a `init`, portanto pode criar arquivos.

## Atalho opcional para os exemplos

`adk` abaixo é uma função só deste terminal; não instala nada globalmente.
Ela equivale ao prefixo npx mostrado na instalação. No macOS/Linux:

```sh
ADK_RELEASE=https://github.com/pathbit/AgentDevKit/releases/download
ADK_PACKAGE="$ADK_RELEASE/v0.0.1/agentdevkit-0.0.1.tgz"
adk() {
  npx --yes --ignore-scripts --package "$ADK_PACKAGE" agentdevkit "$@"
}
```

No Windows/PowerShell:

```powershell
$ADK_RELEASE = 'https://github.com/pathbit/AgentDevKit/releases/download'
$ADK_PACKAGE = "$ADK_RELEASE/v0.0.1/agentdevkit-0.0.1.tgz"
function adk {
  npx --yes --ignore-scripts --package $ADK_PACKAGE agentdevkit @args
}
```

Com um checkout, `node bin/agentdevkit.mjs` substitui `adk`. Não procure esse
`bin/` no projeto atendido: o instalador copia o hub e seus scripts locais.

## Comandos

| Comando após `adk` | Resultado |
| --- | --- |
| `init [pasta]` | Instala ou reaplica o kit; aceita pasta ainda inexistente. |
| `update` | Aplica os recursos da versão da CLI que você executou. |
| `sync` | Regera índices e apontamentos a partir do hub do projeto. |
| `doctor` | Confere estado, hashes e recursos derivados da instalação. |
| `next` | Indica a próxima etapa conforme o estado do projeto. |
| `lang` | Consulta o idioma salvo. |
| `lang pt`, `lang en`, `lang es` | Salva idioma e atualiza a orientação. |
| `tools [ação]` | Delega ao gerenciador local de ferramentas. |
| `help`, `--help`, `-h` | Mostra ajuda, sem instalar o kit. |
| `version`, `--version`, `-v` | Mostra a versão da CLI. |

`language` é sinônimo de `lang`; `pt-br` também é aceito como português.
`update`, `sync`, a troca de idioma e `tools` exigem uma instalação existente.
O idioma não traduz automaticamente skills e documentos próprios.

```sh
adk doctor --target "./meu projeto"
adk next --target "./meu projeto"
adk lang es --target "./meu projeto"
adk update --dry-run --target "./meu projeto"
adk sync --check --target "./meu projeto"
```

## Opções

| Opção | Uso |
| --- | --- |
| `--target <pasta>` | Escolhe o projeto; não combine com a pasta de `init`. |
| `--lang <idioma>` | Idioma desta execução; grava ao aplicar mudanças. |
| `--yes`, `-y` | Evita a pergunta inicial de idioma; não força conflitos. |
| `--dry-run` | Simula `init`, `update`, `sync` ou troca de idioma. |
| `--force` | Autoriza substituir conflitos do plano, com backup local. |
| `--check` | Em `sync`, verifica divergências sem corrigi-las. |
| `--json` | Emite um objeto JSON no stdout, sem decoração adicional. |

A saída humana resume contagens. `--dry-run` mostra até 12 caminhos;
use `--json` para obter o plano completo. Uma simulação com conflitos pode
retornar falha mesmo sem escrever arquivos. Recuperação está no
[guia de problemas](troubleshooting.md#conflitos-e-backups).

`update` não procura “latest”: para mudar de versão, escolha o pacote da nova
release em `ADK_PACKAGE` e execute seu `update`. `sync` preserva a origem local
e atualiza suas derivações; não baixa uma versão nova do kit.

## Ferramentas

```sh
adk tools list
adk tools setup
adk tools check all
adk tools info skills
adk tools update base
adk tools run skills --help
```

As ações são `list`, `setup`, `install`, `update`, `check`, `info`, `run` e
`unlock`. Sem ação, aparece ajuda. `setup` usa `all` por padrão; `install`,
`update`, `check` e `info` usam `base`. Aceitam nome, grupo, `base` ou `all`;
`run` e `unlock` exigem uma ferramenta. `list` não aceita seleção.
`setup` relata incompatíveis como não aplicáveis na seleção geral; solicitar
uma delas pelo nome falha. Consultar ou executar não instala silenciosamente.
Detalhes: [gerenciador de ferramentas][tools].

## JSON e códigos de saída

```sh
adk sync --check --json --target "./meu projeto"
```

Campos comuns: `ok`, `command`, `version`, `language`, `target`, `message` e
`next`. Conforme a ação, aparecem `plan`, `conflicts`, `changed`, `backup`,
`issues`, `error` ou `toolOutput`. `next` contém orientação e comandos;
`plan` contém `path`, `action` e `conflict`. Erros capturados usam `error.code`
e `error.detail`; conflitos e checks podem falhar sem esses campos.
O bootstrap pode trazer `detail` no nível principal.
Em `tools --json`, a saída da ferramenta fica no texto `toolOutput`.

| Código | Significado |
| --- | --- |
| `0` | Consulta ou operação concluída; examine também `command` e `ok`. |
| `1` | Falha, conflito ou diagnóstico/check com pendências. |
| `2` | Argumentos inválidos da CLI, ou código devolvido pela ferramenta. |
| Outros | Código propagado por uma ferramenta ou pelo bootstrap. |

`doctor` não testa seu aplicativo, browser, integrações ou ferramentas.
O código zero de `next` também não significa que todas as etapas estão prontas.
Volte ao [índice](README.md) ou consulte
[solução de problemas](troubleshooting.md).

[tools]: ../.pbai4devs/scripts/preparar-ferramentas/README.md
