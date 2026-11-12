---
description: Como desenvolver, verificar e documentar o AgentDevKit.
---

# Contribuir

Use [issues][issues] para bugs e propostas. Descreva o contexto, a versão e
os passos necessários, removendo segredos e dados privados.

## Preparar o checkout

Use Git e Node.js 24+ com npm:

```console
git clone https://github.com/pathbit/AgentDevKit.git
cd AgentDevKit
npm ci --ignore-scripts
npm run check
```

O checkout contém fontes. Execute `npm run examples` para explorar os agentes
em `examples/generated/`, sem criar todas as pastas de clientes na raiz.
Os exemplos gerados são locais e ignorados; seu guia fica em
[`examples/`](examples/README.md).

## Escolher a origem da mudança

| Mudança | Origem |
| --- | --- |
| CLI e instalação | `src/` e `bin/` |
| Layout dos clientes | `.pbai4devs/templates/clients/` |
| Skills, regras e comandos | Respectivas pastas em `.pbai4devs/` |
| Automação compartilhada | `.pbai4devs/scripts/` |
| CI e publicação | `scripts/release/` e workflows do GitHub |
| Testes do produto | `tests/` |
| Exemplos de uso | `examples/` e gerador compartilhado |
| Ajuda e exemplos | `docs/` e README do recurso |

Leia o [guia do código-fonte][source] e o [design](docs/product/design.md).
Modifique fontes e templates, não catálogos, estado ou arquivos dos clientes.

## Verificar e enviar

```console
npm test
npm run test:infra
npm run check
```

Escolha verificações adicionais pelo impacto da mudança. Instalação exige
projetos novos e existentes; Git exige preservação do índice e dos arquivos;
distribuição exige o pacote real. Consulte [testes][tests].

Mantenha testes e fixtures versionados. Relatórios, capturas, downloads,
apontamentos e preferências locais ficam ignorados. Revise o diff antes de
enviar e confirme que ele contém somente fontes e mudanças intencionais.

Atualize a documentação e use a [revisão de entrega][review] para reunir
critérios, evidências e revisão independente. O PR deve explicar problema,
solução e validação. Siga as [regras Git][git]. A [publicação][release] reutiliza
o artifact aprovado do CI; não cria um pacote diferente na hora de publicar.
O mesmo artifact segue para o [npm público][package], usando a autenticação
do workflow. Nunca inclua tokens no código ou no `.npmrc` versionado.

[Wiki](docs/README.md) · [Licença MIT](LICENSE)

[issues]: https://github.com/pathbit/AgentDevKit/issues
[source]: docs/maintainers/development.md
[tests]: docs/guides/tools-and-testing.md
[review]: .pbai4devs/commands/revisar-entrega/COMMAND.md
[git]: .pbai4devs/rules/git/RULE.md
[release]: docs/maintainers/maintenance.md
[package]: docs/maintainers/packages.md
