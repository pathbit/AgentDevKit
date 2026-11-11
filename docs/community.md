---
description: Como relatar problemas e propor melhorias para o AgentDevKit.
---

# Participar da evolução

Use as [issues do AgentDevKit][issues] para relatar problemas e sugerir melhorias.
Procure relatos semelhantes antes de abrir um novo. Uma reação ou um exemplo
reproduzível na issue existente ajuda a reunir o contexto.

## Relatar um problema

Escolha [Relatar um problema][bug]. O formulário pede versão do kit, sistema,
agente/editor, comando ou ação, passos, resultado esperado e observado.
Logs são opcionais: inclua só o trecho necessário e remova dados privados.

Se não souber uma informação, explique isso. Um exemplo pequeno que reproduz
o problema costuma ser mais útil que um repositório inteiro.

## Propor uma melhoria

Escolha [Sugerir uma melhoria][feature] e descreva o problema antes da solução.
Informe quem se beneficia, um exemplo de uso e como reconhecer o resultado.
O formulário também aceita melhorias na documentação.

Issues não são executadas automaticamente por agentes. Uma proposta precisa
de triagem e definição de escopo antes de virar implementação ou release.
Não há prazo de atendimento prometido.

## Acompanhar e contribuir

Os labels `bug`, `enhancement` e `documentation` ajudam a classificar o assunto.
Mantenedores podem pedir informações, reunir duplicatas e vincular a mudança
a um PR. Consulte o [roadmap](roadmap.md) para o escopo registrado.

Para contribuir com código ou documentos, siga [Contribuir][contrib]. O modelo
de PR pede problema, mudança e verificação. Após a revisão, as mudanças passam
pelo CI; a publicação segue o [fluxo de releases](maintenance.md).

Issues e anexos de um repositório público são públicos. Não envie tokens,
senhas, dados pessoais ou acesso a serviços. Resultados locais de testes
continuam fora do Git, conforme o [guia de ferramentas](tools-and-testing.md).

[Wiki](README.md) · [Solução de problemas](troubleshooting.md)

[issues]: https://github.com/pathbit/AgentDevKit/issues
[bug]: https://github.com/pathbit/AgentDevKit/issues/new?template=bug_report.yml
[feature]: https://github.com/pathbit/AgentDevKit/issues/new?template=feature_request.yml
[contrib]: ../CONTRIBUTING.md
