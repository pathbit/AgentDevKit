---
description: Instalar Node.js e npm no Windows, macOS ou Linux antes de usar o kit.
language: pt
---

# Preparar os pré-requisitos

Instale **Node.js 24+ com npm**. O npm inclui o comando `npx`; não é preciso
instalar Python, Bun ou o AgentDevKit globalmente. Git é opcional para instalar
o kit e necessário para trabalhar com o controle de versão do projeto.

## Confira antes de instalar

No terminal do computador ou do agente, execute:

```console
node --version
npm --version
npx --version
```

Com Node 24+ e os três comandos funcionando, siga para a
[instalação pelo npm ou GitHub Packages](installation.md#instalar).
Use o mesmo ambiente em que abrirá o projeto: Windows e WSL, por exemplo,
têm instalações separadas.

## Windows

No PowerShell, com [WinGet][winget] disponível:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact --source winget
```

Sem WinGet, abra o [download oficial do Node.js][node], selecione uma versão
LTS 24 ou superior e use o instalador Windows `.msi` da sua arquitetura.
Mantenha npm e a inclusão no PATH habilitados. Feche e reabra o terminal;
no VS Code, reabra também o terminal integrado. Repita os três comandos acima.

## macOS

No [download oficial][node], selecione Node LTS 24 ou superior e o instalador
macOS `.pkg`. Conclua a instalação, reabra o terminal e confira as versões.
O instalador inclui npm e npx.

Se já usa Homebrew, pode manter esse fluxo:

```sh
brew install node@24
export PATH="$(brew --prefix node@24)/bin:$PATH"
```

A segunda linha vale para o terminal atual. Para outros terminais, siga as
instruções de PATH exibidas pelo Homebrew; não substitua seu perfil inteiro.
Veja a [fórmula oficial][brew].

## Linux

Em Bash ou Zsh, use o [nvm][nvm] para instalar Node 24 no seu usuário.
Em Debian/Ubuntu, prepare as dependências se faltarem:

```sh
sudo apt-get update
sudo apt-get install -y curl ca-certificates tar xz-utils
```

Em outra distribuição, instale os equivalentes pelo seu gerenciador de pacotes.
Execute o instalador oficial do nvm e depois instale o Node:

```sh
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash
```

Reabra o terminal para carregar o nvm; então execute:

```sh
nvm install 24
nvm use 24
```

O nvm configura o perfil do seu usuário e inclui npm/npx com o Node.
Em Alpine ou outra distribuição com musl, confirme o suporte da versão e
arquitetura no [download oficial][node]; não use um binário glibc nesse ambiente.

## Preparar com ajuda do agente

Você também pode pedir no aplicativo ou terminal do seu agente:

> Confira Node, npm e npx neste ambiente. Se faltarem, instale Node 24+ pelo
> mecanismo adequado ao meu sistema, preserve a configuração existente e
> continue até validar os três comandos. Depois me ajude a escolher npm ou
> GitHub Packages e os agentes que usarei neste projeto.

O agente precisa de acesso ao terminal, à rede e das permissões de instalação
do sistema. Sem Node/npm, o `npx` ainda não pode executar o kit. Com Node
18–23 existente, o launcher pode preparar Node 24 localmente; prefira atualizar
o ambiente para Node 24+ antes de começar.

O [bootstrap do kit][bootstrap] usa `tar` nativo quando precisa baixar um
runtime, verifica o checksum e não altera o PATH permanentemente.

## Depois de instalar o kit

Na pasta do projeto, prepare e verifique as ferramentas compatíveis:

```console
npx @pathbit/agentdevkit tools setup
npx @pathbit/agentdevkit tools check all
```

Para usar GitHub Packages, acrescente `--registry=https://npm.pkg.github.com`
antes do nome do pacote, como no [guia de instalação](installation.md#github-packages).
`tools setup base` limita o preparo a navegador e lint. A instalação dos CLIs
não instala browsers, FFmpeg nem concede permissões desktop; veja os requisitos
da tarefa em [ferramentas e testes](tools-and-testing.md).

[Wiki](../README.md) · [Instalar o kit](installation.md)

[node]: https://nodejs.org/en/download
[winget]: https://learn.microsoft.com/en-us/windows/package-manager/winget/install
[brew]: https://formulae.brew.sh/formula/node@24
[nvm]: https://github.com/nvm-sh/nvm#installing-and-updating
[bootstrap]: ../../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
