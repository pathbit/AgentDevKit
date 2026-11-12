---
description: Tipos de recursos, fontes compartilhadas e ciclo de manutenção.
---

# Recursos compartilhados

[Documentação](../README.md) · [Fluxo](workflow.md) ·
[Ferramentas e testes](tools-and-testing.md)

Edite a origem em `.pbai4devs`. As pastas dos clientes contêm referências e
metadados de descoberta; editar uma cópia gerada cria divergência.
O catálogo local `catalog.json` permite encontrar recursos por tipo.
O hub permanece completo mesmo com poucos clientes selecionados. Apenas os
apontamentos necessários são gerados; consulte ou altere a seleção com `agents`
na [CLI](cli.md). Pastas compartilhadas podem atender mais de um cliente.

## Escolher o tipo certo

Os caminhos abaixo são relativos a `.pbai4devs/`.

| Tipo | Responsabilidade | Fonte |
| --- | --- | --- |
| Skill | Procedimento e decisões. | `skills/<grupo>/<nome>/SKILL.md` |
| Regra | Convenção aplicada a um contexto. | `rules/<nome>/RULE.md` |
| Comando | Entrada de um caso de uso. | `commands/<nome>/COMMAND.md` |
| Agente | Papel, ferramentas e limites. | `agents/<nome>/AGENT.md` |
| Modelo | Base a preencher. | `templates/<nome>/TEMPLATE.md` |
| Tool | Configuração e entrada de uma CLI. | `tools/<nome>/TOOL.json` |
| Script | Automação executável reutilizável. | `scripts/<nome>/SCRIPT.mjs` |

Uma skill explica como decidir; um script executa a operação. Um comando
encaminha a essas fontes, sem repetir suas instruções. Uma regra mantém uma
convenção recorrente; um agente define quem revisa ou executa determinado papel.

Modelos não são documentos aprovados do produto. Ferramentas usam um
`SCRIPT.mjs` fino para delegar ao instalador comum; não precisam de cópias em
cada cliente nem de outro instalador escrito do zero.

## Criar ou evoluir

Comece por [criar-recurso][recurso] para localizar um fluxo já existente.
Use o criador específico quando souber o tipo:

- [criar-skill][skill]: procedimento reutilizável.
- [criar-regra][regra]: convenção com contexto e ativação definidos.
- [criar-comando][comando]: caso de uso e encaminhamento.
- [criar-agente][agente]: perfil especializado, como revisão em leitura.

```text
Use criar-skill para orientar a revisão de contratos de API.
Confira se há algo equivalente, reúna dúvidas e proponha uma fonte concisa.
Reutilize scripts e ferramentas existentes; não copie instruções nos clientes.
```

Defina finalidade, entrada, saída, pré-requisitos e o que comprova a conclusão.
Reúna dúvidas antes de tomar decisões. Detalhes opcionais podem ficar em
referências próximas; o arquivo principal deve continuar fácil de encontrar.

## Metadados e formatos

Markdown usa frontmatter YAML e um H1. Skills precisam de `name` e
`description`. Regras definem `trigger`: `always_on`, `model_decision`, `glob`
ou `manual`; `glob` exige `globs`, e decisão do modelo exige descrição útil.

Metadados específicos de um cliente ficam em YAML ao lado da fonte, como
`agents/revisor/claude.yaml`. O manifesto registra sua aplicação. Para evoluir
os adaptadores do AgentDevKit, edite `templates/clients/ADAPTERS.json` no hub.
Consulte a [compatibilidade][compatibilidade] antes de prometer descoberta.

O agrupamento varia conforme o formato realmente suportado pelo cliente.
Uma referência correta não prova que o aplicativo a carregou automaticamente.
Não use symlinks para substituir os apontamentos Markdown.

## Sincronizar e conferir

Após criar, editar, renomear ou remover uma fonte, execute na raiz do projeto:

```sh
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --check
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs
```

O primeiro comando atualiza apontamentos e índices; `--check` só compara.
O manifesto instalado respeita os clientes escolhidos. Não o substitua por uma
lista de todos para reparar recursos; altere a seleção pela CLI se necessário.
Conflitos de conteúdo próprio exigem revisão. Quando a substituição for
intencional, `--force` faz backup local antes de reparar caminhos gerenciados.
Não apague pastas inteiras para contornar um conflito.

O `--force` desse script pode limpar extras nas quatro áreas dos clientes,
com backup. Ele não equivale a `agentdevkit sync --force`: a CLI controla sua
própria lista de arquivos e preserva recursos locais não registrados por ela.
Escolha a operação pelo escopo; não prometa preservação indistinta.

Não edite ou versione `catalog.json`, `skills.json`, `rules.json` ou
`agents.json`: são derivados locais. Configurações nativas e documentos
do projeto não devem ser substituídos por cópias desses índices.

## O que permanece fora dos espelhos

Somente os quatro tipos agênticos têm apontamentos: skills, regras, comandos
e agentes. Modelos, scripts, tools, testes, estado e guias ficam na origem.
Downloads de tools e [skills externas][externas] permanecem locais e ignorados.

O código de testes e as fixtures necessárias são fontes versionáveis.
Resultados não são fontes. Consulte os [modelos de ignore][ignore] e confira
com Git que a alteração não ocultou arquivos necessários ou incluiu artefatos.
Mantenha um README conciso ao criar uma pasta de primeiro nível no hub.

**[ Próximo passo ]** Escolha o criador, edite a fonte e use sync/check.
Para provas reais, consulte [ferramentas e testes](tools-and-testing.md).

[recurso]: ../../.pbai4devs/skills/projeto/criar-recurso/SKILL.md
[skill]: ../../.pbai4devs/skills/projeto/criar-skill/SKILL.md
[regra]: ../../.pbai4devs/skills/projeto/criar-regra/SKILL.md
[comando]: ../../.pbai4devs/skills/projeto/criar-comando/SKILL.md
[agente]: ../../.pbai4devs/skills/projeto/criar-agente/SKILL.md
[compatibilidade]: ../../.pbai4devs/COMPATIBILIDADE.md
[externas]: ../../.pbai4devs/external-skills/README.md
[ignore]: ../../.pbai4devs/templates/gitignore/TEMPLATE.md
