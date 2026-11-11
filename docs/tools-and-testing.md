---
description: Preparo das ferramentas e escolha de verificações reais.
---

# Ferramentas e testes

O kit traz definições e automações. Instalar o kit não instala todas as tools
nem escolhe a stack da aplicação. Consulte o [catálogo][tools].

## Runtime e preparo

O núcleo usa Node.js 24+ com npm. O launcher aceita Node 18+ e prepara o runtime
atual quando necessário. Sem Node, o agente precisa instalá-lo pelo mecanismo
do sistema operacional antes de iniciar `npx`.

Para preparar somente o runtime a partir do hub:

```console
node .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --runtime-only
```

O mesmo JavaScript atende aos sistemas suportados. Não há bootstrap PowerShell,
SH ou Bash no kit. O executável nativo `tar` é usado sem shell para extrair o
arquivo oficial após conferir SHA-256. Veja o [guia do bootstrap][bootstrap].

Quando a tarefa pedir instalação das ferramentas:

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup
```

`setup` reutiliza instalações saudáveis e verifica as compatíveis. Um nome
ou grupo limita a seleção. `check`, `info` e `run` não trocam uma consulta
por instalação. Downloads, caches e recibos permanecem locais e ignorados.

## Escolher a prova

| Mudança | Verificação |
| --- | --- |
| Lógica ou API | Testes e assertivas de resultado. |
| Fluxo web | Navegador real, ações e resultado visível. |
| Aplicativo desktop | Abrir o aplicativo e executar o fluxo. |
| Documento visual | Renderizar ou abrir o artefato e inspecionar. |
| Gerador e Git | Instalar, sincronizar e comparar arquivos/índice. |

Use [verificar-trabalho][verify] para vincular aceites às provas. Web pode usar
[agent-browser][browser] ou o conector Playwright; desktop pode usar
[agent-desktop][desktop]. Confira console, rede, permissões e efeitos reais.
Uma captura isolada não demonstra o funcionamento completo.

## Verificar o AgentDevKit

No checkout, `npm test` verifica o produto; `npm run test:infra` verifica as
automações compartilhadas; `npm run check` valida as fontes. Os perfis de
[CI](maintenance.md) evitam repetir a suíte completa em cada sistema.

Os testes do produto ficam em `.pbai4devs/tests/`. Os testes compartilhados
ficam em `scripts/<nome>/tests/` dentro do hub. Em uma aplicação atendida,
o código de testes segue os diretórios acordados para aquele projeto.

A [matriz de maturidade][matrix] usa oito projetos sintéticos. Ela comprova
contratos do kit; não aprova um produto real nem certifica todos os aplicativos.
Os pareceres simulados dessa matriz não substituem revisão independente.

## Guardar os resultados

Código de testes e fixtures são versionados. Relatórios, capturas, vídeos,
downloads e saídas locais são ignorados, inclusive `.playwright*` em qualquer
caixa. Registre passou, falhou ou não verificado; não transforme ausência de
prova em sucesso. Feche a entrega pela [revisão][review].

[Wiki](README.md) · [Recursos](resources.md)

[tools]: ../.pbai4devs/tools/README.md
[bootstrap]: ../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[verify]: ../.pbai4devs/skills/projeto/verificar-trabalho/SKILL.md
[browser]: ../.pbai4devs/tools/agent-browser/README.md
[desktop]: ../.pbai4devs/tools/agent-desktop/README.md
[matrix]: ../.pbai4devs/scripts/testar-maturidade/README.md
[review]: ../.pbai4devs/commands/revisar-entrega/COMMAND.md
