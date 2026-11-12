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

| Perfil | Entrega |
| --- | --- |
| [Planejador](planejador/AGENT.md) | Dúvidas, escopo e plano verificável. |
| [Implementador](implementador/AGENT.md) | Código, testes e documentação. |
| [Validador](validador/AGENT.md) | Resultado real por critério de aceite. |
| [Auditor de segurança](auditor-seguranca/AGENT.md) | Triagem e provas de controles. |
| [Documentador](documentador/AGENT.md) | Documentos coerentes com a entrega. |
| [Revisor](revisor/AGENT.md) | Parecer independente do estado final. |

O agente principal distribui o contexto, limita os arquivos de cada tarefa
e reúne os resultados. Um perfil não precisa chamar outro diretamente:
quando o cliente proíbe delegação aninhada, devolva o próximo passo ao principal.
Veja os [catálogo de comandos](../commands/README.md).

Sidecars limitam ferramentas onde o formato permite. O planejador usa leitura;
os validadores têm terminal para produzir evidências, sem editar fontes.
Permitir terminal não cria isolamento por diretório. Respeite as permissões
do ambiente e não trate instruções como substitutas de sandbox.
