---
name: preparar-ferramentas
description: Instala e atualiza ferramentas locais de agentes para o SO e arquitetura atuais.
---

# Preparar ferramentas

Identifique a operação e a seleção pedidas. Confira Node.js 24+ e npm antes
dos `.mjs`; reutilize o runtime disponível e seu caminho absoluto.
Com Node 18+, o [bootstrap JavaScript][bootstrap] e `--runtime-only` preparam
Node 24+; depois execute a operação original. Sem Node/npm, instale primeiro
pelo mecanismo nativo do SO. Faça o preparo pelo usuário e reutilize o runtime.

Em `instalar-ferramentas`, o bootstrap sem essa opção já executa
`setup <seleção>`; não repita a instalação. Consultas e execução não devem
acionar `setup`: `check`, `info` e `run` preservam sua operação e seleção.

As definições ficam em `.pbai4devs/tools/<nome>/TOOL.json`: origem, download,
plataformas, entrada e prova de funcionamento. Consulte o
[índice](../../../tools/README.md) e use o script da ferramenta para operações
individuais. Execute `SCRIPT.mjs` com o Node selecionado; ele delega ao
instalador compartilhado.

No preparo inicial, execute `preparar-ferramentas setup` pelo seletor:
instala e verifica todas as ferramentas compatíveis, sem atualizar as saudáveis.
Aceita seleção por nome/grupo; relate falhas e itens não aplicáveis.
Para npm, `update` consulta `latest` oficial; ferramentas nativas de segurança
seguem o pin revisado em `TOOL.json`, sem atualização silenciosa para outro binário.
`install` reutiliza uma instalação saudável; `check` verifica sem rede;
`info` mostra a configuração; `run <nome> [argumentos]` executa sem instalar.
Sem ação, mostre ajuda. Não interprete ausência de argumentos como instalação.

Use `update agent-desktop` quando houver tarefa desktop, ou outro nome definido.
Nenhum modo baixa Chrome ou concede permissões automaticamente. Prefira o
navegador instalado com `--executable-path`; se faltar, combine seu preparo.

Escolha pelo caso de uso no [índice](../../../tools/README.md): `opensrc` para
consultar fontes de dependências; `skills` para descoberta; `just-bash` para
shell virtual; `webreel` para roteiro de vídeo; `portless` para URLs locais.
Em `skills`, use `find` ou `add <origem> --list`; incorporações passam por
`criar-skill` e `sincronizar-agentes`, sem instalador externo nos espelhos.
O shell virtual não substitui testes reais. Só ative proxy, certificados,
serviços ou gravação quando necessários à tarefa e com dependências preparadas.

Para segurança, use [preparar-seguranca](../../../commands/preparar-seguranca/COMMAND.md).
Preparar o CLI e atualizar bases são operações separadas da análise offline.

Antes de usar agent-desktop, leia `skills get desktop` e `skills get platform`
da versão instalada e confira `status`. Para agent-browser, leia
`skills get core` e `--help` da versão instalada e
observe a página antes de agir. Use `verificar-trabalho` para provar resultados.

Versione `TOOL.json`, `SCRIPT.mjs` e `README.md` de
cada ferramenta. Pacotes e registros ficam em `<nome>/.local/`; cache e launchers
em `.pbai4devs/tools/.cache/` e `bin/`, ignorados. O estado próprio da aplicação
segue os caminhos suportados e documentados por ferramenta. Não espelhe tools.
Preserve a instalação anterior se a atualização falhar; informe versões,
resultado e limitações. Um probe de versão não prova um fluxo de interface.

[bootstrap]: ../../../scripts/preparar-ferramentas/BOOTSTRAP.md
