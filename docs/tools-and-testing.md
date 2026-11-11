---
description: Preparo explícito de ferramentas e escolha de provas funcionais.
---

# Ferramentas e testes

[Documentação](README.md) · [Fluxo](workflow.md) · [Recursos](resources.md)

Instalar o AgentDevKit instala instruções e definições. Não instala todas as
ferramentas, escolhe a stack da aplicação ou inicia serviços automaticamente.
Consulte o [catálogo de tools][tools] e cada guia antes de usar.

## Preparar o runtime

As automações compartilhadas exigem Node.js 24+ com npm. Esse requisito é do
kit; a tecnologia da aplicação vem do design aprovado.

Sem runtime, o agente usa o [bootstrap nativo][bootstrap] e continua o trabalho.
Para preparar apenas Node/npm, sem baixar tools, no macOS/Linux:

```sh
sh .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.sh --runtime-only
```

No PowerShell, o mesmo modo é `-RuntimeOnly`. Reutilize o caminho de Node
informado pelo bootstrap. Não altere o PATH global nem peça ao usuário uma
sequência de instalações manuais se o agente puder executar o preparo.

## Fazer o setup explicitamente

Quando a tarefa pedir preparo de ferramentas, há um fluxo único:

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup
```

Ele reutiliza instalações saudáveis e verifica cada CLI compatível.
Para limitar a seleção, use `setup base`, um grupo ou o nome da ferramenta.
O grupo `base` inclui navegador e lint; grupos opcionais estão no catálogo.
O bootstrap sem `--runtime-only` também segue esse fluxo completo.

Uma consulta, `check` ou `run` não autoriza trocar a operação por instalação.
Se faltar uma ferramenta necessária, informe o pré-requisito e aplique apenas
o preparo autorizado. Não instale dependências da aplicação sem sua definição.

## Operações do instalador comum

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs list
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs check base
node .pbai4devs/tools/skills/SCRIPT.mjs info
node .pbai4devs/tools/skills/SCRIPT.mjs run --version
```

`install` reutiliza a instalação saudável; `update` consulta a origem oficial.
`check` verifica a instalação, `info` mostra configuração e `run` executa a CLI.
`unlock <nome>` só recupera lock de processo local comprovadamente encerrado;
locks ativos ou de origem incerta permanecem. Veja o [gerenciador][manager].

Pacotes ficam em `tools/<nome>/.local`; cache e atalhos são ignorados.
Uma instalação compatível não comprova navegador, permissões desktop ou um
fluxo de produto. Webreel e Portless têm requisitos próprios nos seus guias.

## Escolher a prova pelo impacto

Use [verificar-trabalho][verificar] para vincular aceites a provas observáveis.

| Mudança | Prova necessária |
| --- | --- |
| Lógica, API ou automação | Testes/comandos reais e assertivas de resultado. |
| Fluxo web | Navegador real, ações do usuário e resultado visível. |
| Aplicação desktop | Abrir o aplicativo e executar a ação afetada. |
| Documento ou artefato visual | Abrir/renderizar e inspecionar a saída. |
| Recursos do kit | Sync/check, Markdown e testes afetados. |

Para web, use testes do projeto, [agent-browser][browser] ou o conector
Playwright conforme o [executor de navegador][playwright]. Abra a URL real,
percorra o fluxo e confira console/rede; avalie desktop e celular se aplicáveis.

Para desktop, use [agent-desktop][desktop] ou ferramenta compatível, com as
permissões necessárias. Não trate uma captura isolada como prova funcional.
Em terminal, confira saída, efeitos e código de retorno. O shell virtual
`just-bash` não substitui testes que precisam do ambiente real da aplicação.

## Testar o kit

No checkout, use `npm test`, `npm run test:infra` e `npm run check`.
`test:infra` executa unidades, inclusive as do harness; não executa sozinho a
matriz funcional de oito cenários. Essa matriz é uma operação separada.
Em um projeto com os recursos instalados, as automações também são diretas:

```sh
node .pbai4devs/scripts/testar-infraestrutura/SCRIPT.mjs
node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run
```

A matriz usa projetos sintéticos em `tmp/examples/`; não certifica seu produto.
Seus gates simulados testam contratos, sem representar aprovação humana real.
Smokes opcionais ficam em `preparar-ferramentas/tests/` e exigem as ferramentas
declaradas no guia. Probes de versão não equivalem a vídeo, proxy ou aplicação.

## Guardar código e evidências

Versione testes da aplicação em `tests/` e fixtures necessárias. Testes do kit
ficam em `.pbai4devs/scripts/<nome>/tests/`. Salve resultados, relatórios,
capturas e vídeos em `.agent-tests/<referencia>/<execucao>/`, ignorados.
Arquivos e pastas `.playwright*` ficam ignorados em qualquer caixa.

Registre passou, falhou ou não verificado, com evidência e motivo. Se não puder
executar a prova necessária, informe; não transforme ausência em sucesso.
Finalize pelo [comando de revisão][revisao] antes de concluir a implementação.

**[ Próximo passo ]** Selecione a prova do seu aceite e confira seus requisitos.

[tools]: ../.pbai4devs/tools/README.md
[bootstrap]: ../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[manager]: ../.pbai4devs/scripts/preparar-ferramentas/README.md
[verificar]: ../.pbai4devs/skills/projeto/verificar-trabalho/SKILL.md
[browser]: ../.pbai4devs/tools/agent-browser/README.md
[desktop]: ../.pbai4devs/tools/agent-desktop/README.md
[playwright]: ../.pbai4devs/scripts/testar-navegador/REFERENCE.md
[revisao]: ../.pbai4devs/commands/revisar-entrega/COMMAND.md
