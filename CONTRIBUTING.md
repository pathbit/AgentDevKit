---
description: Como desenvolver, verificar e documentar mudanças no AgentDevKit.
---

# Contribuir

Abra uma [issue](https://github.com/pathbit/AgentDevKit/issues) para discutir
problemas ou propostas. Em uma correção, descreva o comando, o comportamento
esperado e o observado, o sistema operacional e a versão do kit. Remova
credenciais e dados privados dos exemplos.

## Preparar o checkout

Use Git, Node.js 24+ e npm:

```sh
git clone https://github.com/pathbit/AgentDevKit.git
cd AgentDevKit
npm ci --ignore-scripts
node bin/agentdevkit.mjs --help
```

## Escolher onde alterar

| Mudança | Origem |
| --- | --- |
| Comportamento da CLI | `src/`, `bin/` e `tests/` |
| Procedimento compartilhado | `.pbai4devs/skills/` ou `rules/` |
| Caso de uso ou automação | `.pbai4devs/commands/` ou `scripts/` |
| Compatibilidade de clientes | `src/adapters/` e testes de adaptadores |
| Ajuda e exemplos | `docs/` e README do recurso afetado |

Leia o [design](docs/design.md) e o [guia de recursos](docs/resources.md).
Edite a origem: apontamentos e catálogos são gerados. Depois de mudar recursos,
execute o sincronizador antes das verificações:

```sh
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs
```

## Verificar a mudança

```sh
npm test
npm run test:infra
npm run check
```

Os níveis adicionais dependem da mudança. Distribuição exige testar o tarball;
sincronização e instalação exigem projetos isolados, incluindo um existente;
interfaces exigem seu fluxo real. Veja [ferramentas e testes][tests].
O [CI][ci] roda em Linux, macOS e Windows, com Node 24 e 26.

Versione testes e fixtures; salve relatórios, tarballs e capturas somente em
destinos ignorados. Use `.agent-tests/` para evidências locais.

## Documentar e enviar

Atualize os guias afetados e registre o que foi testado, com seus limites.
Markdown começa com frontmatter YAML e um H1; mantenha exemplos pequenos e
links relativos válidos. A [wiki](docs/README.md) é a entrada da documentação.

Use a [revisão de entrega][review] para reunir critérios, evidências e revisão
independente. Descreva no PR o problema, a solução e a validação. Siga as
[regras Git][git] para commits; não inclua artefatos locais nem credenciais.
Publicação tem um fluxo separado em [manutenção](docs/maintenance.md).

[Wiki](docs/README.md) · [Licença MIT](LICENSE)

[tests]: docs/tools-and-testing.md
[review]: .pbai4devs/commands/revisar-entrega/COMMAND.md
[git]: .pbai4devs/rules/git/RULE.md
[ci]: https://github.com/pathbit/AgentDevKit/blob/master/.github/workflows/ci.yml
