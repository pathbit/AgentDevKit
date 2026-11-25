---
description: Como usar os recursos do AgentDevKit no desenvolvimento de software.
language: pt-BR
---

# Recursos na prática

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O AgentDevKit organiza o trabalho de desenvolvimento de software com agentes
que você escolhe. O kit reúne instruções e ferramentas; decisões de produto,
revisão humana e testes continuam necessários no projeto atendido.

## Qual recurso usar?

Consulte o [guia instalado][start] para escolher por intenção. Ele aponta
para o comando que recebe o pedido e informa o que deve sair de cada etapa.
Se o cliente não mostrar um comando ou perfil, peça ao agente para ler a
fonte em `.pbai4devs` e seguir as instruções pertinentes ao pedido.

| Recurso | Para que serve | Exemplo concreto |
| --- | --- | --- |
| [Skill][skills] | Orienta decisões e passos de uma tarefa recorrente. | [Criar uma spec][spec] com dúvidas e critérios. |
| [Comando][commands] | Dá entrada a um caso de uso e encaminha o trabalho. | [Validar entrega][validar] com provas. |
| [Agente][agents] | Define responsabilidades e limites de um papel. | [Revisor][reviewer] examina a mudança em leitura. |
| [Regra][rules] | Registra uma convenção aplicável a um contexto. | [Qualidade][quality] orienta os cuidados da entrega. |
| [Template][templates] | Oferece uma estrutura para registrar decisões. | Preencher a [spec][spec-template] de um incremento. |
| [Script][scripts] | Executa uma automação reutilizável. | [Sincronizar][sync] os apontamentos. |
| [Ferramenta][tools] | Fornece uma capacidade técnica verificável. | [agent-browser][browser] exercita uma interface web. |
| [Testes e evidências][tests] | Comprovam comportamento e registram resultados. | Versionar o teste e manter relatório local. |

Os links levam às fontes e aos catálogos. Uma instrução em Markdown não inicia
um processo sozinha; o cliente de IA decide como descobrir e executar recursos
conforme suas capacidades e permissões. Consulte a
[compatibilidade por cliente][compat] antes de depender de um atalho.

## Como as etapas se conectam

Use a sequência abaixo para uma entrega de produto. Se o objetivo imediato
for rodar ou documentar um sistema existente, use os caminhos específicos
ao fim desta seção.

1. Use [proximos-passos][next] para identificar a fase e as pendências.
2. Defina produto, experiência quando aplicável e design técnico com o usuário.
   Os [templates][templates] são pontos de partida, não decisões prontas.
3. Use [criar-spec][spec] para registrar limites e aceites. Em
   [planejar-entrega][plan], passe o objetivo ou a spec ao planejador. Ele
   devolve dúvidas, escopo, tarefas e provas para aprovação.
4. Passe spec e plano aprovados a [implementar-entrega][implement]. O perfil
   [implementador][developer] devolve o diff, aceites, comandos e provas iniciais.
5. Passe esses materiais a [validar-entrega][validar]. O validador usa a skill
   [verificar-trabalho][verify] e ferramentas do projeto. Para web, use
   navegador real. Para desktop, abra a aplicação. Registre a prova e o estado
   de cada critério.
6. Entregue diff, decisões de documentação e provas a [revisar-entrega][review].
   O revisor avalia o estado final em leitura, e o responsável registra a decisão
   com o script de revisão. A equipe decide quando integrar.

Quando houver trabalho independente, o agente principal pode distribuí-lo
entre os [especialistas][specialists] disponíveis, com responsáveis por arquivos,
dependências e provas. Se o cliente não oferecer subagentes, o trabalho segue
em sequência e a ausência de revisão independente fica explícita.

Escolha provas pelo escopo: contratos, validação e dados no backend; interação,
acessibilidade, estados de erro e navegador ou desktop no frontend. QA inclui
casos de limite e falha; segurança considera ameaças e permissões; performance
compara medições com metas e carga definidas. Registre ambiente, comandos e
resultados por critério, inclusive falhas e verificações não executadas.

Para **rodar um projeto existente**, consulte a etapa atual com
`npx @pathbit/agentdevkit next --intent run --target .`, usando a versão e o
registro escolhidos na [instalação][install]. [Diagnosticar][diagnose] inventaria
ambiente e projeto, e [preparar-dev][prepare] usa esse inventário quando o
pedido inclui ajustes.
Entregue os comandos para subir, verificar e parar a aplicação.

Para **documentar um sistema em uso**, comece com
`npx @pathbit/agentdevkit document --markdown`. A CLI oferece um rascunho
de inventário. O comando [documentar-legado][legado] orienta o documentador
a seguir os fluxos relevantes no código e nos testes e entregar fatos,
inferências e lacunas com suas fontes. O trabalho de edição reaproveita
os documentos existentes. [Guia de documentação](documentation.md#documentar-um-sistema-em-uso)

Quando a tarefa depende de uma spec ou um plano existente, a skill
[proximos-passos](../../.pbai4devs/skills/projeto/proximos-passos/SKILL.md)
usa as indicações de `next --integrations` para encontrar referências no projeto.
Consulte [quando usar outros métodos](comparacao.md).

Para **auditar segurança**, [auditar-seguranca][audit] coleta ou reaproveita o
relatório local, e o perfil auditor usa [revisar-seguranca][security] para
interpretá-lo no contexto. Ferramentas ou bases ausentes entram na cobertura
pendente. A correção tem seu próprio fluxo e escopo.

Para **evoluir o kit**, localize o recurso pelo [guia de recursos][resources].
Depois de alterar a fonte, use [sincronizar][sync-command] para aplicar e
conferir os apontamentos e [verificar-agentes][verify-agents] para validar
fontes, ferramentas e testes.

## Onde ficam os arquivos?

`.pbai4devs/` contém as fontes compartilhadas. Pastas como `.claude/` ou
`.codex/` recebem apenas os recursos de integração dos clientes selecionados;
os arquivos humanos existentes continuam pertencendo ao projeto. A seleção pode
ser consultada ou alterada pela [CLI][cli].

O código dos testes e as fixtures necessárias são versionáveis. Relatórios,
capturas, downloads e resultados locais ficam fora do versionamento. O
`.gitignore` da raiz pertence ao projeto; o kit preserva as regras Git
existentes e informa arquivos que podem estar visíveis. Confira o status e as
regras de ignore antes de adicionar arquivos ao índice.
Veja [instalação][install] e [ferramentas e testes][tests].

Para criar ou mudar um recurso, use o [guia de recursos][resources] e depois
sincronize e verifique os apontamentos. Para dúvidas de operação, consulte
[solução de problemas](troubleshooting.md).

[skills]: ../../.pbai4devs/skills/README.md
[start]: ../../.pbai4devs/INSTRUCTIONS.md
[commands]: ../../.pbai4devs/commands/README.md
[agents]: ../../.pbai4devs/agents/README.md
[rules]: ../../.pbai4devs/rules/README.md
[templates]: ../../.pbai4devs/templates/README.md
[scripts]: ../../.pbai4devs/scripts/README.md
[tools]: ../../.pbai4devs/tools/README.md
[spec]: ../../.pbai4devs/skills/specs/criar-spec/SKILL.md
[spec-template]: ../../.pbai4devs/templates/spec/TEMPLATE.md
[validar]: ../../.pbai4devs/commands/validar-entrega/COMMAND.md
[reviewer]: ../../.pbai4devs/agents/revisor/AGENT.md
[developer]: ../../.pbai4devs/agents/implementador/AGENT.md
[quality]: ../../.pbai4devs/rules/qualidade/RULE.md
[sync]: ../../.pbai4devs/scripts/sincronizar-agentes/README.md
[browser]: ../../.pbai4devs/tools/agent-browser/README.md
[tests]: tools-and-testing.md
[compat]: ../../.pbai4devs/COMPATIBILIDADE.md
[next]: ../../.pbai4devs/skills/projeto/proximos-passos/SKILL.md
[legado]: ../../.pbai4devs/commands/documentar-legado/COMMAND.md
[implement]: ../../.pbai4devs/commands/implementar-entrega/COMMAND.md
[plan]: ../../.pbai4devs/commands/planejar-entrega/COMMAND.md
[verify]: ../../.pbai4devs/skills/projeto/verificar-trabalho/SKILL.md
[diagnose]: ../../.pbai4devs/commands/diagnosticar/COMMAND.md
[prepare]: ../../.pbai4devs/commands/preparar-dev/COMMAND.md
[audit]: ../../.pbai4devs/commands/auditar-seguranca/COMMAND.md
[security]: ../../.pbai4devs/skills/seguranca/revisar-seguranca/SKILL.md
[sync-command]: ../../.pbai4devs/commands/sincronizar/COMMAND.md
[verify-agents]: ../../.pbai4devs/commands/verificar-agentes/COMMAND.md
[review]: ../../.pbai4devs/commands/revisar-entrega/COMMAND.md
[install]: installation.md
[cli]: cli.md
[resources]: resources.md
[specialists]: resources.md#especialistas-e-colaboração

[reading-pt]: recursos-na-pratica.md
[reading-en]: ../en/guides/recursos-na-pratica.md
[reading-es]: ../es/guides/recursos-na-pratica.md
