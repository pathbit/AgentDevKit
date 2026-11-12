---
description: Exemplos locais dos agentes e dos estágios de um projeto.
---

# Exemplos

## Dois projetos do zero, com três specs

Os exemplos criam uma API HTTP de tarefas em memória e uma calculadora de
terminal. Cada projeto recebe PRD, decisão de UX, design e roadmap; depois,
cada uma das três specs é escrita, implementada e testada em sequência.
São produtos didáticos: aprovações e revisão são simuladas e não substituem
decisões nem revisão humana em um projeto real.

Na raiz deste repositório, com Git, rede e Node.js 24+ com npm:

```sh
node tests/example-workflows.mjs
```

O comando instala a versão pública do `@pathbit/agentdevkit` indicada no
`package.json` deste repositório, com os
clientes Codex, Claude e Copilot em dois projetos Git novos. Cria uma pasta
exclusiva em `examples/generated/workflows-*` e informa o caminho do relatório.
Nenhuma pasta anterior é apagada. Para testar outra versão publicada, passe-a
como argumento, por exemplo `node tests/example-workflows.mjs 0.0.13`.

1. Abra `REPORT.json` na pasta informada e escolha `api-tarefas` ou
   `cli-calculadora`.
2. Leia `docs/PRD.md`, `docs/UX.md`, `docs/DESIGN.md` e `docs/ROADMAP.md`.
3. Leia `docs/specs/01/SPEC.md`, `02/SPEC.md` e `03/SPEC.md`; os testes de
   cada etapa ficam em `tests/` e os resultados em `.agent-tests/`.
4. Dentro do projeto escolhido, rode `node --test tests/*.test.mjs`. Para a
   calculadora, experimente `node src/calc.mjs sum 2 3` e
   `node src/calc.mjs mean 2 4`.

A API é exercitada em uma porta local temporária pelos testes; ela não persiste
dados e não é um serviço pronto para produção. O código do gerador é versionado;
projetos, caches e relatórios gerados são ignorados pelo Git do AgentDevKit.

### Reproduzir manualmente com um agente

Na raiz do AgentDevKit, crie uma pasta ainda inexistente e instale o kit nela:

```sh
mkdir -p examples/generated
mkdir examples/generated/minha-api
cd examples/generated/minha-api
git init
npm init -y
npx --yes @pathbit/agentdevkit init --agents codex,claude,copilot --lang pt --yes
```

No agente escolhido, execute as etapas e responda às perguntas antes de avançar:

1. Peça `configurar-projeto`, depois `criar-prd`: defina uma API para criar e
   listar tarefas em memória. Use `criar-ux-ui` para justificar a ausência de
   interface visual e `criar-design-doc` para decidir o desenho técnico.
2. Peça `gerenciar-roadmap` para ordenar três incrementos: saúde da API,
   criação de tarefas e listagem de tarefas. Revise as decisões propostas.
3. Para cada incremento, peça `criar-spec`, responda às dúvidas e revise os
   critérios. Peça `implementar-spec` e valide os testes antes da próxima spec.
4. Compare seus arquivos e resultados com `api-tarefas` no exemplo automático.
   Para repetir com a calculadora, use as specs soma, média e validação de entrada.

As decisões do projeto manual são suas; o gerador automático usa dados sintéticos.

## Projetos reais existentes

Para verificar a instalação em clones públicos fixados, na raiz do repositório:

```sh
npm run test:oss -- --version 0.0.13
```

A [matriz de projetos](../tests/fixtures/oss-projects.json) registra os commits
de Hibernate ORM, EF6, Rust, Go, Tailcat, Express e Requests, além de Zod e Chi.
Para um projeto só, use por exemplo `npm run test:oss -- --project express`.
Os clones e relatórios ficam em uma pasta nova dentro de `tmp/oss-compatibility/`.
O teste valida o kit, incluindo preservação de arquivos e índice Git; ele não
compila nem executa as aplicações clonadas. Requer rede e pode baixar projetos
grandes. Para outras opções e limites, consulte [testes](../tests/README.md).

## Cenários de maturidade

Na raiz do AgentDevKit, com Node.js 24+ e Git:

```sh
npm run examples
npm run test:examples
```

O primeiro comando prepara oito projetos; o segundo regenera e testa.
Para executar apenas um cenário:

```sh
npm run test:examples -- --case somente-agentes
```

As cópias mostram os clientes selecionados na origem e seus apontamentos:

```text
examples/
├── README.md                    guia versionado
├── .gitignore                   ignora generated/
└── generated/                   saídas locais
    ├── README.md                índice dos oito cenários
    ├── REPORT.json              prepared, passed ou failed
    └── somente-agentes/
        ├── .pbai4devs/          recursos compartilhados
        ├── .claude/             apontamentos do Claude
        ├── .codex/              apontamentos do Codex
        ├── .cursor/             apontamentos do Cursor
        ├── .github/             apontamentos do Copilot
        ├── .vscode/             configuração do editor
        └── .opencode/           apontamentos do OpenCode
```

Com todos os clientes selecionados, também aparecem `.agents`, `.agent`,
`.gemini`, `.zcode`, `.kimi-code`, `.kimi`, `.minimax`, `.mimocode` e `.dsh`.
As pastas são locais; os templates e assets do gerador são a fonte versionada.

| Cenário | Conteúdo |
| --- | --- |
| somente-agentes | Recursos compartilhados, sem aplicação |
| descoberta | PRD em rascunho |
| planejado | Produto e design definidos, sem código |
| app-inicial | API com estrutura incompleta |
| app-configurada | API, planejamento e configuração |
| manutencao | Aplicação com histórico sintético de release |
| legado | Layout e configurações preexistentes |
| monorepo | Dois módulos e caminhos com espaços |

Somente diretórios marcados pelo gerador são substituídos. Arquivos humanos
da origem permanecem no lugar. Um novo `prepare` redefine o relatório para
`prepared`, sem reutilizar resultados de uma execução anterior.

Os testes exercitam scripts e APIs locais. Aprovações de produto e pareceres
do gate são dados sintéticos; não comprovam revisão humana, Docker, interface
visual, implantação ou outros sistemas operacionais.

Detalhes: [testar maturidade](../.pbai4devs/scripts/testar-maturidade/README.md).
