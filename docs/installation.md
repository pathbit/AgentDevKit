---
description: Instalação e manutenção do AgentDevKit em projetos novos ou existentes.
---

# Instalação

Use Node.js 24+. A CLI `agentdevkit` pertence ao pacote
`@pathbit/agentdevkit`; publicação e upload da release são etapas separadas
da validação local.

Se Node/npm não estiverem disponíveis, o agente primeiro obtém o checkout e
executa seu bootstrap nativo apenas para o runtime: `--runtime-only` no shell
ou `-RuntimeOnly` no PowerShell. Depois usa o Node informado pelo bootstrap
para chamar a CLI. Esse fluxo não exige instalar todas as ferramentas nem
pedir ao usuário uma sequência de comandos manuais.

## Pelo checkout

```sh
node bin/agentdevkit.mjs init --target /caminho/do/projeto --lang pt
node bin/agentdevkit.mjs doctor --target /caminho/do/projeto
node bin/agentdevkit.mjs next --target /caminho/do/projeto
```

`init` aceita também o diretório como argumento posicional. O padrão de idioma
é português; `--lang en` ou `--lang es` troca a apresentação da CLI. O estado
fica em `.pbai4devs/estado/agentdevkit.json`. Troque depois com:

```sh
node bin/agentdevkit.mjs lang en --target /caminho/do/projeto
```

O idioma da CLI não traduz automaticamente cada skill ou documento do projeto.
Use `--json` para obter o resultado estruturado, incluindo os próximos passos.

## Projeto novo ou existente

Em um diretório novo, instale o kit e siga a preparação sugerida por `next`.
PRD, UX/design e configuração vêm antes de criar e implementar specs.

Em um repositório existente, confira `--dry-run` antes da instalação ou
atualização. Código, documentos, configurações de editor e workflows próprios
devem ser preservados. Conflitos precisam aparecer no resultado; backups não
substituem a revisão das mudanças. `--yes` permite execução sem perguntas.

```sh
node bin/agentdevkit.mjs update --target /caminho/do/projeto --dry-run
node bin/agentdevkit.mjs update --target /caminho/do/projeto --yes
node bin/agentdevkit.mjs sync --target /caminho/do/projeto --check
```

A origem fica em `.pbai4devs`; os clientes recebem os formatos suportados por
seus adaptadores. Downloads, resultados e credenciais não pertencem à
distribuição. Instalações locais de ferramentas ficam separadas dos recursos.

## Validar o pacote local

```sh
npm pack
npx --yes --ignore-scripts \
  --package ./pathbit-agentdevkit-0.0.1.tgz agentdevkit --version
```

O nome padrão de `npm pack` inclui o escopo; a release usa o asset renomeado
`agentdevkit-0.0.1.tgz`. Só use o URL de release após o upload correspondente.
