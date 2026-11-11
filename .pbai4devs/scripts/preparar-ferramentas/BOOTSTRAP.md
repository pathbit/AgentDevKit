---
description: Preparo automático de Node, npm e ferramentas sem instalação global.
---

# Preparar a máquina

No agente, peça `instalar-ferramentas`: ele executa todo o fluxo abaixo.
Não peça ao usuário que instale Node nem que rode comandos intermediários.

1. Identifique SO e arquitetura pelo ambiente nativo, antes de qualquer `.mjs`.
2. Execute [BOOTSTRAP.sh](BOOTSTRAP.sh) na raiz, em macOS/Linux:

   ```sh
   sh .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.sh
   ```

   No Windows, use [BOOTSTRAP.ps1](BOOTSTRAP.ps1) pelo PowerShell:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.ps1
   ```

3. O inicializador reutiliza Node 24+ com npm saudável, ou o runtime local.
   Se necessário, baixa Node 24 LTS de `nodejs.org`, confere SHA-256 e prepara
   o binário de Windows, macOS ou Linux para x64/arm64.
4. Ele continua automaticamente com `SCRIPT.mjs setup`, que instala e verifica
   todas as ferramentas compatíveis. Aceita `base`, grupo ou nome como argumento.

Para `check`, `info`, `list`, `run` ou `unlock`, reutilize o Node existente.
Se faltar runtime, prepare somente Node/npm antes de executar a ação pedida:

```sh
sh .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.sh --runtime-only
```

No PowerShell, acrescente `-RuntimeOnly` à chamada acima de `BOOTSTRAP.ps1`.
Esse modo informa `node=<caminho absoluto>` e termina sem executar `setup`
nem instalar ferramentas. Não aceita uma seleção junto da opção.

O runtime fica em `.pbai4devs/tools/.cache/runtime/`, ignorado pelo Git.
Não há `sudo`, instalação global nem alteração permanente de PATH. O caminho
do Node é informado na saída; reutilize-o nas próximas chamadas `.mjs` e
inclua sua pasta no PATH apenas da sessão/subprocesso, quando necessário.

Esses dois inicializadores são a exceção mínima ao uso de `.mjs`: usam o shell
nativo porque JavaScript ainda não pode executar sem Node. Não são entradas
do seletor `executar-script`, nem devem ser replicados nas pastas dos agentes.

No macOS/Linux são necessários `curl` ou `wget`, `tar`, `gzip` e SHA-256;
no Windows, PowerShell com download, hash e extração ZIP. Se faltar um recurso
nativo, resolva-o pelo gerenciador do SO dentro da autorização da tarefa e
retome. Se rede ou permissões impedirem isso, informe o erro real; não avance
nem declare sucesso. Não substitua a arquitetura por um binário incompatível.

Downloads e extrações são locais; falhas preservam o runtime anterior.
O preparo verifica CLIs. Navegador, permissões desktop e FFmpeg dependem da
tarefa e não são instalados nem ativados por esses inicializadores.

Fonte: [distribuições oficiais do Node.js](https://nodejs.org/dist/latest-v24.x/).
