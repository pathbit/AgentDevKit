---
description: CLI e recursos portáteis da primeira distribuição AgentDevKit.
status: aprovado
version: 0.0.1
---

# Distribuição v0.0.1

## Objetivo e escopo

Distribuir o kit independente, instalável em projetos novos e existentes,
conforme [PRD](../../prd.md), [UX](../../ux-ui.md) e [design](../../design.md).
Inclui CLI, recursos, adaptadores, idiomas e testes. Publicação depende da
validação da entrega; não inclui backend nem interface gráfica.

## Critérios de aceite

| Critério | Resultado observável |
| --- | --- |
| AC-001 | Tarball contém CLI/recursos sem resultados, downloads ou segredos. |
| AC-002 | `init` instala em diretório vazio e oferece próximos passos. |
| AC-003 | Instalação e atualização preservam conteúdo próprio existente. |
| AC-004 | Repetição é idempotente; simulação não altera o alvo. |
| AC-005 | PT padrão, EN/ES e idioma persistido funcionam com JSON válido. |
| AC-006 | Adaptadores, catálogos e sincronização refletem a origem única. |
| AC-007 | Projeto recebe orientação sem criação indevida de produto. |
| AC-008 | Testes da infraestrutura e cenários de maturidade passam. |

## Plano de verificação

Evidências: `.agent-tests/agentdevkit-v0.0.1/<execucao>/` e relatórios do CI.
A tabela define as provas; resultados reais ficam no relatório ignorado de
cada execução, sem versionar aprovações ou saídas de testes nesta spec.

| Critério | Método | Requer | Assertiva | Evidência |
| --- | --- | --- | --- | --- |
| AC-001 | pack | Node/npm | Sem extras | pack.json |
| AC-002 | init | Tarball | Recursos/next | empty.json |
| AC-003 | init/update | Sentinelas | Hashes iguais | existing.json |
| AC-004 | repetir/simular | Alvo | Idempotente | repeat.json |
| AC-005 | PT/EN/ES | Alvos | Idioma/JSON | languages.json |
| AC-006 | sync/check | Fontes | Índices iguais | sync.log |
| AC-007 | next/doctor | Fases | Ação aplicável | next.json |
| AC-008 | testes/matriz | Kit | Casos passaram | matrix.json |

Execute `npm test` para distribuição e CLI; `npm run test:infra` para as
automações; e o script `testar-maturidade` para os oito cenários. A distribuição
usa `npm pack` e npx offline sobre o tarball real. Sentinelas são arquivos do
usuário cujo conteúdo deve permanecer idêntico após instalar e atualizar.

## Documentação e autorização

README PT/EN/ES, instalação, produto e guias compartilhados acompanham a CLI.
Escopo autorizado pela solicitação atual de criação do AgentDevKit.
Critérios mantidos exigem prova aprovada na revisão antes de concluir a release.

[Todas as specs](../README.md) · [Wiki](../../README.md)
