---
description: Instalação do AgentDevKit 0.0.1 em projetos novos ou existentes.
---

# Instalação

O AgentDevKit instala uma estrutura para trabalhar com agentes no seu projeto.
Você escolhe a pasta; ele prepara os recursos e indica a próxima etapa.
Esta página usa a [release pública 0.0.1][release], sem depender do npmjs.

## Com Node.js e npm disponíveis

Confira `node --version` e `npm --version`. O runtime usado pelo kit é Node.js
24 ou superior. A entrada da CLI tenta preparar um runtime local quando recebe
um Node antigo. Sem Node/npm, siga [o caminho alternativo](#sem-node-ou-npm).

Abra o terminal na pasta do projeto. No macOS ou Linux:

```sh
ADK_RELEASE=https://github.com/pathbit/AgentDevKit/releases/download
ADK_PACKAGE="$ADK_RELEASE/v0.0.1/agentdevkit-0.0.1.tgz"
npx --yes --ignore-scripts --package "$ADK_PACKAGE" \
  agentdevkit init . --lang pt
```

No Windows, use o PowerShell:

```powershell
$ADK_RELEASE = 'https://github.com/pathbit/AgentDevKit/releases/download'
$ADK_PACKAGE = "$ADK_RELEASE/v0.0.1/agentdevkit-0.0.1.tgz"
npx --yes --ignore-scripts --package $ADK_PACKAGE `
  agentdevkit init . --lang pt
```

O `--yes` antes de `--package` pertence ao npx. Para impedir também a pergunta
de idioma da CLI, acrescente `--yes` depois de `agentdevkit init`.
Sem `--lang`, o padrão é português; um terminal interativo pode perguntar.
Use `--lang en` ou `--lang es` para inglês ou espanhol.

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
| Pastas dos agentes | Apontamentos e formatos nativos gerados. |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Entradas com blocos gerenciados. |
| `.pbai4devs/estado/agentdevkit.json` | Versão, idioma e hashes instalados. |
| `.agent-tests/agentdevkit/backups/` | Cópias locais de arquivos alterados. |

O kit não baixa as ferramentas opcionais durante `init`. O comando
`tools setup` prepara e verifica as compatíveis quando você o solicitar.
O pacote também não exige credenciais para inicializar o projeto.

## Sem Node ou npm

O npx depende deles e não consegue iniciar sozinho. Se estiver usando um
agente, peça: “Prepare o runtime do AgentDevKit e instale a versão 0.0.1 neste
projeto; preserve meus arquivos e continue até o diagnóstico”.

Para fazer manualmente, obtenha o código da tag `v0.0.1` pela [release][release]
ou clone em uma pasta separada do projeto:

```sh
git clone --depth 1 -b v0.0.1 https://github.com/pathbit/AgentDevKit.git
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
`bin/agentdevkit.mjs init --target "caminho/do/seu/projeto" --lang pt`;
no PowerShell, coloque `&` antes do caminho do executável entre aspas.
Ele mantém Node/npm no cache local, sem instalar globalmente ou mudar o PATH
permanente. `--runtime-only` não instala as ferramentas opcionais.

macOS/Linux precisam de `curl` ou `wget`, `tar`, `gzip` e SHA-256 disponíveis.
Para detalhes e restrições do SO, consulte o [guia do bootstrap][bootstrap].
Para conferir o pacote manualmente, a release inclui `SHA256SUMS`.

## Depois da instalação

Use a [referência da CLI](cli.md) para `doctor`, `next`, `lang`, `update` e
`sync`. Atualizar usa a versão do pacote invocado; não busca a próxima release
automaticamente. Se algo falhar, siga
[solução de problemas](troubleshooting.md).
Volte ao [índice da documentação](README.md) para o fluxo completo.

[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.1
[bootstrap]: ../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
