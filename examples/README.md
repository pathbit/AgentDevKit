---
description: Exemplos locais dos agentes e dos estágios de um projeto.
---

# Exemplos

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
