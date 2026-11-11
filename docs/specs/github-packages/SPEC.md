---
description: Publicação do pacote único no registro npm do GitHub.
status: aprovado
---

# Pacote npm no GitHub Packages

## Objetivo

Publicar `@pathbit/agentdevkit` no GitHub Packages, vinculado a este repositório,
para instalação com `npx`. Escopo confirmado pelo usuário nesta solicitação.
O [PRD](../../prd.md), o [design](../../design.md) e a
[UX da CLI](../../ux-ui.md) já definem o produto. Este incremento é um novo
canal de distribuição do pacote existente, sem mudança da interface da CLI.

## Contrato

- Um pacote npm com CLI, skills e recursos compartilhados.
- Publicar o tarball aprovado do CI, preservando origem, versão e bytes.
- Usar `GITHUB_TOKEN` do Actions com permissão de escrita de pacotes.
- Incluir publicação nas releases futuras e permitir adicionar uma tag
  existente ao registro sem recriar sua release.
- Conferir a integridade da versão no registro; versões com outros bytes
  são conflitos. Uma repetição com bytes iguais é segura.
- Provar instalação da CLI a partir do registro, com credencial do workflow.
- Documentar que GitHub Packages exige autenticação inclusive para pacotes
  npm públicos; não versionar credenciais nem alterar o login local do usuário.

Não separar componentes em múltiplos pacotes, não criar um registro npmjs e
não modificar tags publicadas. Dependência: [v0.0.3](../v0.0.3/SPEC.md).

## Critérios de aceite

| ID | Resultado | Prova |
| --- | --- | --- |
| AC-001 | Pacote único com registro e repositório definidos. | Metadados. |
| AC-002 | Publica o artifact aprovado, sem repack. | Testes e workflow. |
| AC-003 | Repetição e conflitos tratados por integridade. | Testes negativos. |
| AC-004 | CLI instalada pelo registro executa corretamente. | Actions real. |
| AC-005 | Login, npx, limites e manutenção documentados. | Lint e revisão. |

Evidências em `.agent-tests/github-packages/`, fora do Git. A publicação da
versão 0.0.3 usa o artefato de sua tag existente; futuras versões seguem o CI.

[Specs](../README.md) · [Roadmap](../../roadmap.md)
