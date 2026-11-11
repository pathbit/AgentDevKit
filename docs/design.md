---
description: Arquitetura, estado e preservação de arquivos do AgentDevKit.
status: aprovado
---

# Design técnico

O kit separa três responsabilidades: instruções compartilhadas, formatos dos
clientes e instalação no projeto. O [PRD](prd.md) define o problema; a
[spec v0.0.1](specs/v0.0.1/SPEC.md) define os critérios da primeira entrega.

## Da origem ao cliente

```text
.pbai4devs/                  src/adapters/
recursos compartilhados  +   política de cada cliente
                         |
                         v
               planejamento da instalação
                         |
                         v
             projeto que recebe o AgentDevKit
             ├── .pbai4devs/   origem e estado
             ├── .claude/     se Claude for escolhido
             ├── .github/     se Copilot for escolhido
             ├── outros clientes...
             └── AGENTS.md    entrada comum
```

As entradas usam Markdown, metadados ou configurações nativas conforme o
[cliente](../.pbai4devs/COMPATIBILIDADE.md). São arquivos regulares, sem
symlinks. Templates, ferramentas, scripts e downloads ficam no hub.

## Onde cada responsabilidade fica

| Componente | Responsabilidade |
| --- | --- |
| [bin/agentdevkit.mjs](../bin/agentdevkit.mjs) | Entrada e runtime. |
| [src/cli.mjs](../src/cli.mjs) | Argumentos, comandos e saída. |
| [src/install.mjs](../src/install.mjs) | Plano, conflitos e backup. |
| [src/next.mjs](../src/next.mjs) | Próxima ação conforme o projeto. |
| [src/i18n.mjs](../src/i18n.mjs) | Mensagens em PT, EN e ES. |
| [src/adapters/](../src/adapters/) | Política de destinos e formatos. |
| [.pbai4devs/](../.pbai4devs/README.md) | Recursos que o projeto recebe. |
| [tests/][product-tests] | Testes do produto e da distribuição. |

Node.js 24+ executa os módulos ESM diretamente, sem compilação ou dependências
de runtime do pacote. Ferramentas opcionais têm instalações próprias.

## O que acontece na instalação

1. Resolve o alvo e recusa caminhos reservados ou symlinks perigosos.
2. Resolve os clientes pela opção explícita, estado salvo ou padrão `all`.
3. Prepara o hub completo e gera os apontamentos dos clientes selecionados.
4. Compara conteúdo e hashes registrados; apresenta mudanças e conflitos.
5. Com `--dry-run`, encerra sem alterar o alvo.
6. Ao aplicar, confere novamente os arquivos, salva os anteriores e grava
   as mudanças. Em erro durante a aplicação, tenta restaurar o que alterou.

O backup fica em `.agent-tests/agentdevkit/backups/` dentro do alvo. É uma
proteção local: não substitui Git nem um backup externo.

## Estado e propriedade

`.pbai4devs/estado/agentdevkit.json` registra versão, idioma, `clients` e hashes
de arquivos ou blocos gerenciados. `clients` guarda `["all"]` ou uma seleção.
Estados antigos sem o campo mantêm todos. É configuração versionável;
não é cache nem guarda credenciais. Não edite seus hashes manualmente.

`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` e `.gitignore` recebem blocos delimitados.
O conteúdo próprio fora deles permanece. Um README existente é preservado;
quando não existe, a instalação cria uma entrada mínima.

Arquivos próprios fora da gestão do kit são preservados. Alterações locais
em arquivos gerenciados podem gerar conflitos no próximo `update`.
`--force` permite substituir esses conflitos e guarda backup. Recursos novos
com nomes próprios podem coexistir com o kit. Veja [personalização][resources]
e [recuperação](troubleshooting.md).

Catálogos e apontamentos são derivados; o [sincronizador][sync] os reconstrói.
A CLI usa a política distribuída em `src/adapters/`; no projeto instalado,
`espelhos.conf` reflete a seleção e permite sincronizar com o script local.

Os clientes podem depender da mesma pasta. Codex inclui `.codex` e `.agents`;
Copilot inclui `.github` e `.vscode`; Antigravity usa `.agents`. A troca
remove apenas derivações gerenciadas que nenhum selecionado exige. Arquivos
próprios permanecem, e conteúdo gerenciado modificado exige resolver conflitos.
Atualizações e sincronizações sem seleção explícita reutilizam o estado salvo.

A interação inicial coleta idioma e clientes somente em terminal interativo.
Cada opção explícita evita sua pergunta; JSON, simulação e `--yes` evitam todas.
Não se tenta identificar o agente pela máquina ou por nomes de pastas.
A seleção não inicia downloads nem altera as decisões de produto.

## Dados locais e limites

Cada pasta de cliente e o hub têm seu `.gitignore`. O ignore da raiz cobre
resultados e temporários gerais. O pacote possui filtros próprios para excluir
downloads, caches e saídas de testes; ignorar no Git não basta para o npm pack.

A instalação não exige backend, credenciais remotas ou serviço permanente.
Não há agendamento de agentes ou loop de execução criado pelo kit.
Instalar ferramentas e executar testes são ações explícitas.

Os testes comprovam arquivos e operações. Carregamento de skills em um
aplicativo, permissões de desktop e comportamento de ferramentas externas
dependem de verificação no ambiente correspondente.

[Wiki](README.md) · [Manutenção](maintenance.md)

[resources]: resources.md
[sync]: ../.pbai4devs/scripts/sincronizar-agentes/README.md
[product-tests]: https://github.com/pathbit/AgentDevKit/tree/master/tests
