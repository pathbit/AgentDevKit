---
description: Instalação, atualização e execução das ferramentas locais.
---

# Preparar ferramentas

O [catálogo](../../tools/README.md) é descoberto pelos arquivos `TOOL.json`.

## Primeiro uso

Peça ao agente `instalar-ferramentas`. Ele segue o
[preparo automático](BOOTSTRAP.md): verifica Node/npm, instala o runtime local
quando necessário e continua sozinho até a validação das ferramentas.
Os inicializadores usam o shell do SO antes de qualquer `.mjs`, sem depender
de Node instalado, privilégios administrativos ou mudança permanente no PATH.

Se Node 24+ com npm já estiver disponível, também pode executar diretamente:

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup
```

`setup` reutiliza instalações saudáveis e executa `check` para cada ferramenta.
Aceita `base`, grupo ou nome; sem seleção, usa `all`. Incompatibilidades na
seleção geral são informadas como não aplicáveis; pedir uma delas pelo nome
falha. Falhas de instalação/verificação são relatadas e retornam código 1.
Sem npm funcional, o preparo para antes de alterar as ferramentas.
Ao mover o hub, preserve suas pastas `.local` e `.cache`; `setup` reutiliza os
pacotes e regenera os atalhos locais, que usam imports relativos.

## Operações individuais

Com runtime disponível, execute a ação diretamente. Se ele faltar, use
`--runtime-only` no bootstrap POSIX ou `-RuntimeOnly` no PowerShell e reutilize
o caminho retornado; esse modo não instala ferramentas.

Na raiz do repositório:

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs list
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs install skills
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs update base
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs check all
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs unlock skills
```

`info <nome>` mostra configuração e estado; `run <nome> [argumentos]` executa
sem instalar. Sem ação, há ajuda. Cada ferramenta tem uma única entrada
`SCRIPT.mjs`, executada com Node em qualquer sistema.

`unlock <nome>` recupera somente um lock local com PID comprovadamente morto.
Locks ativos, de outro host ou sem metadados verificáveis são preservados.
Não aceita grupos. Um lock ausente não cria arquivos.

O requisito comum é Node.js 24+ com npm. O gerenciador usa o Node atual.
Downloads usam npm oficial com scripts de instalação desativados e integridade
conferida.
Permissões de binários POSIX são aplicadas somente aos caminhos declarados
em `executables` no `TOOL.json`, antes do probe.
Atualizações usam staging e preservam a versão anterior em caso de falha.
Atalhos locais recusam diretórios e arquivos simbólicos antes de escrever.
O preparo valida os CLIs. Navegador, permissões desktop e FFmpeg dependem da
tarefa; ele não inicia aplicações nem concede permissões automaticamente.

Testes: `node --test .pbai4devs/scripts/preparar-ferramentas/tests/TEST.mjs`.
Após instalar `skills`, `just-bash`, `opensrc`, `webreel` e `portless`, execute
`node .pbai4devs/scripts/preparar-ferramentas/tests/SMOKE_VERCEL.mjs`.
Ele prova descoberta local, shell virtual e validação de roteiro; Portless
recebe probes. Vídeo, proxy, TLS e downloads de fontes não são exercitados.
Relatórios ficam em `.agent-tests/vercel-labs/`.
