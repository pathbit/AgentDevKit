---
description: Estrutura padrão do repositório, exemplos e automações simples.
status: aprovado
version: 0.0.4
---

# Estrutura padrão e exemplos

## Objetivo

Organizar o repositório para que uma pessoa consiga localizar o código,
experimentar os agentes e verificar uma alteração pelos comandos npm.
Escopo solicitado pelo usuário: código e testes na raiz, exemplos em pasta
própria e automações claras. Aprovação geral e execução já autorizadas.

Dependências: [v0.0.3](../v0.0.3/SPEC.md) e
[GitHub Packages](../github-packages/SPEC.md). O [PRD](../../product/prd.md), o
[design](../../product/design.md) e a [UX](../../product/ux-ui.md) continuam aplicáveis.

## Contrato

- Código em `src/`, launcher em `bin/`, testes em `tests/` e publicação em
  `scripts/release/`. `.pbai4devs` mantém os recursos portáveis dos agentes.
- `examples/` contém o guia versionado. O gerador produz oito cenários em
  `examples/generated/`, com os diretórios dos clientes e relatório atual.
- A preparação deve funcionar sem pastas de agentes previamente geradas na
  raiz. Preparar novamente invalida resultados antigos com propriedade válida.
- Não remover arquivos humanos. Apenas demonstrações geradas identificadas
  podem sair da raiz, com backup local. Workflows reais ficam em `.github`.
- Manter npm/npx, instalação, atualização, escolha de clientes e preservação
  do projeto consumidor. Não copiar o código do kit para a aplicação atendida.
- Adaptar build, testes, CI e publicação sem duplicar a matriz. Releases e
  GitHub Packages usam os mesmos bytes aprovados.
- Manter guias curtos por tarefa, sem novos frameworks, dependências ou
  serviços que a CLI não usa.

## Critérios de aceite

| ID | Resultado | Prova |
| --- | --- | --- |
| AC-001 | Código e testes nas pastas da raiz. | Inventário e imports. |
| AC-002 | Comandos npm e pacote continuam funcionais. | CLI e TGZ real. |
| AC-003 | Exemplos completos gerados de uma origem limpa. | Oito cenários. |
| AC-004 | Relatórios atuais e conteúdo humano preservado. | Testes negativos. |
| AC-005 | Upgrade mantém projetos e versões anteriores. | Migração real. |
| AC-006 | Saídas não entram no Git ou pacote. | Git e inventário. |
| AC-007 | Publicação preserva a distribuição. | Testes e Actions. |
| AC-008 | Guias e referências acompanham a nova estrutura. | Lint e revisão. |

Evidências em `.agent-tests/standard-layout/`, fora do versionamento. Testes
web/desktop não se aplicam: esta entrega altera a CLI, arquivos e automações.

[Desenvolvimento](../../maintainers/development.md) · [Specs](../README.md)
