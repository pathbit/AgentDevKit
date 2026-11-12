---
description: Fontes, geração local e arquitetura do AgentDevKit.
status: aprovado
---

# Design técnico

O repositório contém o gerador. A instalação produz a estrutura usada pelos
agentes em outro projeto. [PRD](prd.md) e [specs](specs/README.md) definem os
contratos de cada entrega.

## Fontes no repositório

```text
AgentDevKit/
├── src/              CLI e instalação
├── bin/              entrada do pacote npx
├── tests/            testes do produto
├── scripts/release/  CI, empacotamento e publicação
├── examples/         guia e cenários gerados localmente
├── docs/             guias e decisões do produto
└── .pbai4devs/        skills, regras, templates e ferramentas compartilhadas
```

Metadados npm, licença, documentação e workflows do GitHub ficam nos seus
locais padrão. Pastas nativas dos clientes, índices e estado local não fazem
parte da fonte versionada.

`npm run examples` gera as árvores de demonstração em `examples/generated/`.
Elas contêm `.claude`, `.codex` e os demais clientes, sem misturar exemplos com
a configuração ativa da raiz. `npm run test:examples` executa os cenários.
O [guia de desenvolvimento](development.md) reúne os comandos do projeto.

## Resultado instalado

`.pbai4devs` recebe os recursos compartilhados, sem copiar o núcleo do gerador,
as automações de release ou os testes exclusivos do produto. Os layouts dos
clientes vêm da [configuração declarativa][clients]. Os arquivos nativos são
pequenos apontamentos para o hub, sem symlinks.

A escolha salva determina as derivações. Atualizações e sincronizações não
reativam clientes desmarcados. `all` preserva a intenção de usar todos; estados
antigos sem escolha explícita mantêm esse comportamento.

## Instalação e propriedade

O instalador monta um plano, confere hashes e caminhos, apresenta conflitos e
aplica mudanças com backup local. `--dry-run` não altera arquivos nem índice.

Entradas humanas permanecem intactas. O kit cria suas próprias entradas quando
faltam; na migração, separa seus blocos de texto humano. Nunca é possível
ignorar somente um trecho de arquivo no Git.

Saídas identificadas são excluídas localmente do versionamento. O Git local
usa `info/exclude`; fora de um repositório, a proteção fica no `.gitignore`
da raiz. A política vem dos templates, não de listas copiadas por cliente.
Os arquivos humanos de `.github` e `.vscode` continuam versionáveis.

O estado registra versão, escolha e propriedade local. Índices e manifesto
podem ser reconstruídos. Downloads, credenciais e relatórios ficam fora do
pacote e do Git.

## Runtime

O launcher aceita Node 18+ e prepara Node 24+ antes de carregar o núcleo.
O bootstrap usa JavaScript, download oficial, SHA-256 e extração por `tar`
com argumentos separados, sem shell. Falhas preservam o runtime anterior.
Sem Node, o agente usa primeiro o instalador nativo do sistema operacional.

## Verificação e publicação

O CI separa a suíte completa dos testes de portabilidade. A publicação usa um
artifact aprovado do mesmo commit e verifica versão, origem e checksum.
Não há novo empacotamento entre teste e publicação.

O GitHub Packages recebe o mesmo tarball da release, como
`@pathbit/agentdevkit`. O workflow autentica com `GITHUB_TOKEN`; confirma a
integridade da versão no registro e testa `--version`, `init`, `doctor` e
`sync --check` via `npm exec`, em projeto temporário com cache novo.
Os comandos sugeridos pela CLI e pelas notas usam o nome e a versão do pacote.
O modo manual de pacote permite publicar uma tag existente sem alterar sua
release. O uso local do registro exige autenticação, conforme
[GitHub Packages](packages.md).

Testes comprovam arquivos e operações executadas. O carregamento em um
aplicativo específico depende das capacidades desse cliente; gerar uma
referência não comprova a execução da skill.

[Wiki](README.md) · [Manutenção](maintenance.md) · [Recursos](resources.md)

[clients]: ../.pbai4devs/templates/clients/ADAPTERS.json
