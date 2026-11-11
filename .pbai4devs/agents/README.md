---
description: Finalidade e criação dos perfis de agentes.
---

# Agentes

O perfil compartilhado usa metadados portáteis. YAMLs ao lado da origem adaptam
campos e permissões por cliente. A integração usa `templates/clients/`,
fora das instruções distribuídas aos projetos.
Consulte a [compatibilidade](../COMPATIBILIDADE.md) antes de prometer descoberta.

Perfis definem papel, entrada, resultado, ferramentas e limites. Use
`criar-agente` quando uma tarefa justificar revisão ou delegação especializada.
Cada perfil usa `<nome>/AGENT.md`.

O [revisor](revisor/AGENT.md) examina alterações sem editá-las. Cada cliente
recebe o formato previsto por seu adaptador; quando uma entrada não for
descoberta automaticamente, peça leitura explícita da fonte compartilhada.
