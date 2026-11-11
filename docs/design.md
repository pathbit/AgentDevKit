---
description: Arquitetura da distribuição e instalação do AgentDevKit.
status: aprovado
---

# Design técnico

Referências: [PRD](prd.md), [UX](ux-ui.md) e [spec](specs/v0.0.1/SPEC.md).

## Estrutura

| Componente | Responsabilidade |
| --- | --- |
| `bin/agentdevkit.mjs` | Entrada executável do pacote. |
| `src/` | CLI, instalação, idiomas, diagnóstico e próximos passos. |
| `src/adapters/` | Formatos de descoberta e integração por cliente. |
| `.pbai4devs/` | Origem dos recursos, modelos, scripts e definições de tools. |
| `.pbai4devs/templates/entrypoints/` | Entradas raiz dos clientes. |
| `tests/` | Testes do produto e do pacote distribuído. |

Node.js 24+ e módulos ESM evitam uma etapa de compilação para executar a CLI.
Os clientes consomem referências e formatos nativos derivados da origem;
a representação depende das capacidades confirmadas de cada cliente.

## Instalação e atualização

A CLI resolve o projeto-alvo, planeja mudanças e aplica apenas arquivos sob
sua responsabilidade. `--dry-run` não altera o alvo. Entradas próprias e
configurações existentes são preservadas; conflitos ficam explícitos.
Dados locais, caches e downloads não entram no pacote nem são sobrescritos
por uma atualização de instruções. Links simbólicos não autorizam escapes.

O idioma fica em `.pbai4devs/estado/agentdevkit.json`. Catálogos e apontamentos
são regeneráveis; são diferentes dos registros locais das ferramentas.

## Verificação e limites

Testes reais da CLI cobrem diretórios novos/existentes, idiomas, idempotência,
atualização e o tarball do npm. Testes das automações e oito cenários de
maturidade complementam a prova. Resultados ficam em `.agent-tests/` ou `tmp/`.

Não há credenciais remotas, backend nem serviços permanentes obrigatórios.
Publicação no npm/GitHub e descoberta real em cada aplicativo exigem suas
próprias verificações; arquivos corretos não demonstram execução pelo cliente.

Arquitetura autorizada para a primeira entrega; provas ficam na revisão.
