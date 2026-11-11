---
description: Instalação do AgentDevKit 0.0.2 em projetos novos ou existentes.
---

# Instalação

O AgentDevKit instala uma estrutura para trabalhar com agentes no seu projeto.
Você escolhe a pasta; ele prepara os recursos e indica a próxima etapa.
Esta página usa o pacote da [release 0.0.2][release], sem depender do npmjs.

## Com Node.js e npm disponíveis

Confira `node --version` e `npm --version`. O runtime usado pelo kit é Node.js
24 ou superior. A entrada da CLI tenta preparar um runtime local quando recebe
um Node antigo. Sem Node/npm, siga [o caminho alternativo](#sem-node-ou-npm).

Abra o terminal na pasta do projeto. No macOS ou Linux:

```sh
ADK_RELEASE=https://github.com/pathbit/AgentDevKit/releases/download
ADK_PACKAGE="$ADK_RELEASE/v0.0.2/agentdevkit-0.0.2.tgz"
npx --yes --ignore-scripts --package "$ADK_PACKAGE" \
  agentdevkit init . --lang pt
```

No Windows, use o PowerShell:

```powershell
$ADK_RELEASE = 'https://github.com/pathbit/AgentDevKit/releases/download'
$ADK_PACKAGE = "$ADK_RELEASE/v0.0.2/agentdevkit-0.0.2.tgz"
npx --yes --ignore-scripts --package $ADK_PACKAGE `
  agentdevkit init . --lang pt
```

O `--yes` antes de `--package` pertence ao npx. No primeiro uso em terminal
interativo, a CLI pergunta o idioma ausente e quais agentes você usa.
Use `--lang en` ou `--lang es` para inglês ou espanhol.

## Escolher os agentes

Informe, por exemplo, `--agents codex,claude` no comando `init`, ou responda à
pergunta inicial. Use `all` para todos; veja IDs e aliases na
[compatibilidade](../.pbai4devs/COMPATIBILIDADE.md).

A escolha explícita prevalece sobre a salva em
`.pbai4devs/estado/agentdevkit.json`. Sem ambas, vale `all`. `--yes` depois de
`init`, `--json`, `--dry-run` e execuções sem terminal interativo não perguntam.
Instalações antigas sem seleção também usam `all`.

Se um agente de desktop executar por você, ele deve perguntar quais clientes
você usa antes de escolher a opção. Não se deduz o agente ativo pelo sistema
operacional ou pela existência de pastas; sem resposta disponível, usa-se `all`.
Para consultar ou mudar depois, use `agents` na [CLI](cli.md).

Ao terminar, siga o bloco `[ Próximo passo ]`. Ele informa a skill a usar no
agente e um comando de verificação. Instalar o kit não aprova decisões de
produto nem começa a implementar funcionalidades.

## Projeto novo ou existente

Em um projeto novo, siga preparação inicial, PRD, UX/UI, design técnico,
roadmap, spec e plano aprovado. Só então configure a base técnica e implemente.
Os documentos nascem dessas decisões com o agente, usando os modelos do hub.

Em um projeto existente, simule primeiro. Exemplo no macOS/Linux:

```sh
npx --yes --ignore-scripts --package "$ADK_PACKAGE" \
  agentdevkit init --target "./meu projeto" --dry-run --lang pt
```

No PowerShell, use o mesmo comando com crase no lugar de `\` para quebrar a
linha. Sem a quebra, ele também pode ser digitado inteiro em uma linha.
Revise conflitos e repita sem `--dry-run` para aplicar. O projeto pode estar
vazio ou já ter código; não use `--force` como primeira tentativa.

O instalador preserva arquivos próprios, como README existente, código,
configurações do editor, workflows e skills nativas que não pertencem ao kit.
Mudanças em arquivos gerenciados podem exigir revisão e backup.

| Local | Conteúdo |
| --- | --- |
| `.pbai4devs/` | Origem compartilhada de skills, regras, modelos e scripts. |
| Pastas dos agentes escolhidos | Apontamentos e formatos nativos gerados. |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Entradas com blocos gerenciados. |
| `.pbai4devs/estado/agentdevkit.json` | Versão, idioma, clientes e hashes. |
| `.agent-tests/agentdevkit/backups/` | Cópias locais de arquivos alterados. |

O kit não baixa as ferramentas opcionais durante `init`. O comando
`tools setup` prepara e verifica as compatíveis quando você o solicitar.
O pacote também não exige credenciais para inicializar o projeto.
Clientes podem compartilhar pastas: Codex usa `.codex` e `.agents`; Copilot
usa `.github` e `.vscode`. Trocar a seleção remove somente arquivos gerenciados
que deixaram de ser necessários, preservando arquivos próprios e dependências.

## Sem Node ou npm

O npx depende deles e não consegue iniciar sozinho. Se estiver usando um
agente, peça: “Pergunte quais agentes uso, prepare o runtime do AgentDevKit e
instale a versão 0.0.2 neste projeto; preserve arquivos e faça o diagnóstico”.

Para fazer manualmente, obtenha o código da tag `v0.0.2` pela [release][release]
ou clone em uma pasta separada do projeto:

```sh
git clone --depth 1 -b v0.0.2 https://github.com/pathbit/AgentDevKit.git
cd AgentDevKit
```

Na pasta obtida, macOS/Linux:

```sh
sh .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.sh --runtime-only
```

Na mesma pasta, Windows/PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.ps1 -RuntimeOnly
```

O bootstrap verifica o download oficial por SHA-256 e imprime
`node=<caminho absoluto>`. Use esse executável para chamar
`bin/agentdevkit.mjs init --target "caminho/do/seu/projeto" --lang pt`
com `--agents codex,claude` ou a sua seleção;
no PowerShell, coloque `&` antes do caminho do executável entre aspas.
Ele mantém Node/npm no cache local, sem instalar globalmente ou mudar o PATH
permanente. `--runtime-only` não instala as ferramentas opcionais.

macOS/Linux precisam de `curl` ou `wget`, `tar`, `gzip` e SHA-256 disponíveis.
Para detalhes e restrições do SO, consulte o [guia do bootstrap][bootstrap].
Para conferir o pacote manualmente, a release inclui `SHA256SUMS`.

## Depois da instalação

Use a [referência da CLI](cli.md) para `doctor`, `next`, `lang`, `agents`,
`update` e `sync`. Atualizar usa o pacote invocado; não busca a próxima release
automaticamente. Se algo falhar, siga
[solução de problemas](troubleshooting.md).
Volte ao [índice da documentação](README.md) para o fluxo completo.

[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.2
[bootstrap]: ../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
