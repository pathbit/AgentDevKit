---
description: Como usar os recursos do AgentDevKit no desenvolvimento de software.
language: pt
---

# Recursos na prática

O AgentDevKit organiza o trabalho de desenvolvimento de software com agentes
que você escolhe. O kit reúne instruções e ferramentas; decisões de produto,
revisão humana e testes continuam necessários no projeto atendido.

## Qual recurso usar?

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

## Exemplo: entregar uma funcionalidade

1. Peça ao agente para ler `AGENTS.md` e usar
   [proximos-passos][next]. Ele identifica a fase e as pendências do projeto.
2. Defina produto, experiência quando aplicável e design técnico com o usuário.
   Os [templates][templates] são pontos de partida, não decisões prontas.
3. Use [criar-spec][spec] para esclarecer dúvidas, limitar o incremento e
   registrar critérios verificáveis. Planeje e obtenha a aprovação necessária.
4. Use [implementar-entrega][implement] com a spec e o plano. O perfil
   [implementador][developer] segue a skill e respeita o escopo aprovado.
5. Execute as verificações adequadas: testes automatizados, navegador para um
   fluxo web ou desktop para uma aplicação desktop, quando aplicáveis. Registre
   o resultado de cada critério, incluindo o que não pôde ser executado.
6. Atualize a documentação afetada e encaminhe a mudança à
   [revisão independente][review]. A equipe decide quando integrar a entrega.

Para um projeto existente, comece pelo inventário e preserve suas decisões;
consulte o [fluxo de trabalho][workflow] e a
[instalação em projetos existentes][install].

## Onde ficam os arquivos?

`.pbai4devs/` contém as fontes compartilhadas. Pastas como `.claude/` ou
`.codex/` recebem apenas os recursos de integração dos clientes selecionados;
os arquivos humanos existentes continuam pertencendo ao projeto. A seleção pode
ser consultada ou alterada pela [CLI][cli].

O código dos testes e as fixtures necessárias são versionáveis. Relatórios,
capturas, downloads e resultados locais ficam fora do versionamento. O
`.gitignore` da raiz pertence ao projeto; com Git inicializado, o kit mantém
suas exclusões locais em `.git/info/exclude` e informa conflitos. Sem Git,
execute a sincronização após `git init`, antes de adicionar arquivos ao índice.
Veja [instalação][install] e [ferramentas e testes][tests].

Para criar ou mudar um recurso, use o [guia de recursos][resources] e depois
sincronize e verifique os apontamentos. Para dúvidas de operação, consulte
[solução de problemas](troubleshooting.md).

[skills]: ../../.pbai4devs/skills/README.md
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
[implement]: ../../.pbai4devs/commands/implementar-entrega/COMMAND.md
[review]: ../../.pbai4devs/commands/revisar-entrega/COMMAND.md
[workflow]: workflow.md
[install]: installation.md
[cli]: cli.md
[resources]: resources.md
