---
description: Índice da estrutura compartilhada dos agentes.
---

# Recursos do AgentDevKit

`.pbai4devs` é a origem compartilhada dos recursos instalados pelo AgentDevKit.
Para a ordem de trabalho e os comandos,
leia [INSTRUCTIONS.md](INSTRUCTIONS.md).
O [catálogo completo](catalog.json) é gerado das fontes pelo sincronizador.
Ele inclui recursos, ferramentas, automações, modelos e referências externas.
Os arquivos `skills.json`, `rules.json` e `agents.json` são índices auxiliares
das fontes. Os clientes usam seus próprios diretórios de apontamentos.

| Pasta | Para que serve |
| --- | --- |
| [skills](skills/README.md) | Procedimentos de tarefas e seus criadores |
| [agents](agents/README.md) | Perfis para revisão e delegação |
| [commands](commands/README.md) | Casos de uso para skills, scripts e ferramentas |
| [rules](rules/README.md) | Orientações aplicadas por contexto |
| [templates](templates/README.md) | Modelos para documentos futuros |
| [scripts](scripts/README.md) | Automações e seleção de ferramentas instaladas |
| [tools](tools/README.md) | Definições e scripts; instalações locais ignoradas |
| [external-skills](external-skills/README.md) | Catálogo curado; skills baixadas localmente |

Somente `SKILL.md`, `AGENT.md`, `COMMAND.md` e `RULE.md` dos respectivos diretórios
têm apontamentos nas ferramentas. A origem é agrupada; os destinos usam o
layout registrado. Veja a [compatibilidade](COMPATIBILIDADE.md) dos clientes.
Recursos auxiliares e guias ficam exclusivamente em `.pbai4devs`.
Os testes das automações ficam em `scripts/<nome>/tests/`; seus resultados são
ignorados em `.agent-tests/`.
O `.gitignore` desta pasta controla suas fontes e arquivos locais. Cada cliente
também tem seu `.gitignore`, gerado dos [modelos](templates/gitignore/TEMPLATE.md);
as regras específicas dos agentes não ficam no `.gitignore` da raiz.
Os modelos acompanham cada fase. Após implementar, use `atualizar-documentacao`
e o comando `revisar-entrega` para fechar documentação, revisão e evidências.

Use o [comando sincronizar](commands/sincronizar/COMMAND.md) para reparar tudo;
o script também aceita `--check` para só conferir.
Os [exemplos de maturidade](scripts/testar-maturidade/README.md) são gerados em
`tmp/examples/`, com cópias portáveis da estrutura e relatórios ignorados.
