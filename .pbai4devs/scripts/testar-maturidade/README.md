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
O hub `.pbai4devs` e os clientes registrados são copiados, incluindo comandos
nativos em TOML. Sem manifesto local, os templates definem os clientes em
memória, respeitando a seleção salva. `.vscode` exige registro. Apenas as entradas
`AGENTS.md`, `CLAUDE.md` e `GEMINI.md` presentes na origem são incluídas na raiz.
Os templates substituem somente entradas com blocos gerenciados válidos;
entradas próprias ou editadas são preservadas. Sem estado de instalação,
o mantenedor usa `.pbai4devs/templates/entrypoints/`, com fallback para a raiz.
Os testes resolvem cada apontamento pelo formato declarado do cliente e recurso.

As cópias geram os derivados locais antes dos testes, sem alterar a origem.
Não copiam o código do produto (`bin`, `src`, `release` e `tests` do hub).
Executam sincronização/reparo/idempotência, catálogo, verificação de
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
