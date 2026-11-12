---
description: Encaminha um plano aprovado à implementação dentro do escopo.
---

# Implementar entrega

Entrada: spec aprovada, plano, responsáveis e critérios de aceite.
Confira os pré-requisitos de
[implementar-spec](../../skills/specs/implementar-spec/SKILL.md).
Se houver apenas uma ideia ou escopo, encaminhe ao
[planejador](../../agents/planejador/AGENT.md) e a `criar-spec` antes de implementar.

Acione o [implementador](../../agents/implementador/AGENT.md) com os arquivos
sob sua responsabilidade. Ele usa a skill, testes e ferramentas do projeto;
registra dúvidas restantes antes de decidir requisitos.

Saída: alteração revisável, documentação e provas locais. Encaminhe ao
[validador](../../agents/validador/AGENT.md) por
[validar-entrega](../validar-entrega/COMMAND.md). Falhas voltam ao implementador;
a entrega termina somente após [revisar-entrega](../revisar-entrega/COMMAND.md).
