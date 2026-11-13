---
description: Índice da estrutura compartilhada dos agentes.
---

# Recursos do AgentDevKit

`.pbai4devs` é a origem compartilhada dos recursos instalados pelo AgentDevKit.
Para a ordem de trabalho e os comandos,
leia [INSTRUCTIONS.md](INSTRUCTIONS.md).
O catálogo local `catalog.json` é gerado das fontes pelo sincronizador.
Ele inclui recursos, ferramentas, automações, modelos e referências externas.
Os arquivos `skills.json`, `rules.json` e `agents.json` são índices auxiliares
das fontes. Os clientes selecionados usam seus diretórios de apontamentos.
O estado `state/agentdevkit.json` guarda `clients`: `["all"]` ou os IDs
escolhidos. Catálogos, manifesto, estado e pastas nativas são derivados locais;
não devem ser commitados. No repositório do kit, o código do produto fica em
`src/`, `bin/`, `tests/` e `scripts/release/`, na raiz.
Use `agents` na CLI para consultar ou alterar; `all` inclui os clientes legados.
O hub fica completo; clientes podem compartilhar pastas necessárias.

| Pasta | Para que serve |
| --- | --- |
| [skills](skills/README.md) | Procedimentos de tarefas e seus criadores |
| [agents](agents/README.md) | Perfis para revisão e delegação |
| [commands](commands/README.md) | Casos de uso e encaminhamento |
| [rules](rules/README.md) | Orientações aplicadas por contexto |
| [templates](templates/README.md) | Modelos para documentos futuros |
| [scripts](scripts/README.md) | Automações e seleção de ferramentas |
| [tools](tools/README.md) | Definições e instalações locais ignoradas |
| [external-skills][externas] | Catálogo curado e downloads locais |

Somente `SKILL.md`, `AGENT.md`, `COMMAND.md` e `RULE.md` em suas pastas
têm apontamentos nas ferramentas. A origem é agrupada; os destinos usam o
layout registrado. Veja a [compatibilidade](COMPATIBILIDADE.md) dos clientes.
Recursos auxiliares e guias ficam exclusivamente em `.pbai4devs`.
A licença do kit fica em `LICENSE` dentro deste hub após `init` ou `update`.
Ela vem do pacote e não substitui a licença do projeto consumidor.
Os testes das automações ficam em `scripts/<nome>/tests/`; seus resultados são
ignorados em `.agent-tests/`.
O `.gitignore` desta pasta controla sua árvore. As saídas nos clientes são
protegidas por regras locais geradas dos
[modelos](templates/gitignore/TEMPLATE.md).
Um `.gitignore` não consegue ignorar irmãos com `../`; o gerador usa o local
correto do Git e preserva configurações humanas.
Os modelos acompanham cada fase. Após implementar, use `atualizar-documentacao`
e o comando `revisar-entrega` para fechar documentação, revisão e evidências.

Use o [comando sincronizar](commands/sincronizar/COMMAND.md) para reparar tudo;
o script também aceita `--check` para só conferir.
Os [exemplos de maturidade](scripts/testar-maturidade/README.md) são gerados em
`examples/generated/`, com cópias portáveis da estrutura e relatórios ignorados.

[externas]: external-skills/README.md
