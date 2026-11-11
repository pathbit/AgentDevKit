---
description: Comandos, opções, JSON e códigos de saída do AgentDevKit 0.0.2.
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
ADK_PACKAGE="$ADK_RELEASE/v0.0.2/agentdevkit-0.0.2.tgz"
adk() {
  npx --yes --ignore-scripts --package "$ADK_PACKAGE" agentdevkit "$@"
}
```

No Windows/PowerShell:

```powershell
$ADK_RELEASE = 'https://github.com/pathbit/AgentDevKit/releases/download'
$ADK_PACKAGE = "$ADK_RELEASE/v0.0.2/agentdevkit-0.0.2.tgz"
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
| `agents` | Lista os clientes disponíveis e a seleção salva. |
| `agents codex,claude` | Salva a seleção e atualiza os apontamentos. |
| `agents all` | Ativa todos os clientes, incluindo os legados. |
| `tools [ação]` | Delega ao gerenciador local de ferramentas. |
| `help`, `--help`, `-h` | Mostra ajuda, sem instalar o kit. |
| `version`, `--version`, `-v` | Mostra a versão da CLI. |

`language` é sinônimo de `lang`; `clients` é sinônimo de `agents`.
`pt-br` também é aceito como português. `update`, `sync`, a troca de idioma ou
clientes e `tools` exigem uma instalação existente.
O idioma não traduz automaticamente skills e documentos próprios.

```sh
adk doctor --target "./meu projeto"
adk next --target "./meu projeto"
adk lang es --target "./meu projeto"
adk agents codex,claude --dry-run --target "./meu projeto"
adk update --dry-run --target "./meu projeto"
adk sync --check --target "./meu projeto"
```

## Opções

| Opção | Uso |
| --- | --- |
| `--target <pasta>` | Escolhe o projeto; não combine com a pasta de `init`. |
| `--lang <idioma>` | Idioma desta execução; grava ao aplicar mudanças. |
| `--agents <lista>` | Seleciona clientes; `--clients` é um alias. |
| `--yes`, `-y` | Evita perguntas iniciais; não força conflitos. |
| `--dry-run` | Simula instalação, atualização ou troca de configuração. |
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

## Seleção de clientes

`--agents` aceita IDs separados por vírgula ou `all`. Pode ser usado em `init`,
`update`, `sync`, `lang` e `agents`. Consultas `doctor`, `next` e `tools` não
aceitam essa opção. Veja IDs e aliases na [compatibilidade][clients].

```sh
adk init --agents codex,claude --lang pt --target "./meu projeto"
adk agents --target "./meu projeto"
adk agents copilot,cursor --target "./meu projeto"
```

A escolha explícita prevalece sobre a salva; sem ambas, vale `all`.
No primeiro `init` interativo, perguntas reúnem idioma e clientes ausentes.
Com `--yes`, `--json`, `--dry-run` ou sem terminal interativo, use opções
explícitas ou aceite o estado salvo e os padrões. Não há detecção do agente
ativo.

O estado salva `clients: ["all"]` ou os IDs selecionados. Projetos antigos sem
esse campo mantêm todos os clientes. `update` e `sync` reutilizam a escolha;
pastas compartilhadas permanecem quando outro cliente ainda depende delas.
Trocar a seleção remove só arquivos gerenciados desnecessários; conteúdo próprio
é preservado, e alterações conflitantes seguem o mesmo plano e backup.
`agents` sem lista é consulta; seu `--dry-run` exige uma nova seleção.

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

Campos comuns: `ok`, `command`, `version`, `language`, `clients`, `target`,
`message` e `next`. Conforme a ação, aparecem `plan`, `conflicts`, `changed`,
`backup`,
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
[clients]: ../.pbai4devs/COMPATIBILIDADE.md
