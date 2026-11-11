---
description: Projetos copiados para testar os fluxos em maturidades diferentes.
---

# Testar maturidade

Exige Node.js 24+ e Git. Na raiz do repositório:

```sh
node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run
node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run --case legado
node --test .pbai4devs/scripts/testar-maturidade/tests/TEST.mjs
```

`prepare` só gera as cópias; `run` gera e executa. Os oito cenários ficam em
`tmp/examples/`: agentes, descoberta, planejamento, aplicação inicial,
configurada, manutenção, legado e monorepo com caminhos em português.

O harness copia recursos e configurações reais; exclui pacotes, caches, logs,
resultados de testes, Playwright e pastas temporárias em qualquer caixa,
`.git` e nomes conhecidos de credenciais/overrides locais. Não faz varredura
semântica de segredos. A saída fica em `tmp/examples/`; a API de testes também
aceita descendentes de `.agent-tests/`. Regenera apenas pastas identificadas
como suas. Cada exemplo recebe Git local, sem commits nem identidade alterada.
O hub `.pbai4devs`, clientes registrados e entradas `AGENTS.md`, `CLAUDE.md` e
`GEMINI.md` são copiados juntos, incluindo comandos nativos em TOML.
As entradas vêm de `.pbai4devs/templates/entrypoints/`; sem esse template,
usa-se o arquivo da raiz. Os testes resolvem cada apontamento pelo formato
declarado para seu cliente e tipo de recurso.

As cópias executam sincronização/reparo/idempotência, catálogo, verificação de
recursos, diagnóstico, inspeção e gates negativos/positivo. Em dois casos,
criação/edição/renomeação/remoção e corrupção dos índices exercitam o ciclo todo.
Aplicações executam testes HTTP reais em
portas efêmeras, encerradas ao fim. Legado e monorepo preservam seus arquivos.
Ferramentas copiadas ficam sem downloads: o check negativo é esperado.

O gate positivo simula o parecer para testar seu contrato; não representa
revisão humana. Estados de aprovação são dados sintéticos. Nenhum teste
certifica produção, Docker, interface visual ou outro sistema operacional.

Índice e relatório: `tmp/examples/README.md` e `REPORT.json`. Logs e provas
individuais ficam em `.agent-tests/` dentro de cada exemplo, todos ignorados.
