---
description: Pacote nomeado como forma de instalação e atualização.
status: aprovado
version: 0.0.5
---

# Instalação pelo registro

## Objetivo

Instalar o pacote publicado no GitHub Packages por nome e versão. O usuário
pediu que a instalação usasse o pacote publicado, em vez do arquivo de release.
Manter o registro já adotado e tornar a página do pacote fácil de encontrar.

Dependências: [publicação no GitHub Packages](../github-packages/SPEC.md),
[estrutura padrão](../v0.0.4/SPEC.md), [PRD](../../prd.md) e
[design](../../design.md). Mudança solicitada e execução autorizada.

## Contrato

- CLI, notas e guias usam `npx` com nome, versão e registro do pacote.
- Orientar o login exigido pelo GitHub e ligar a página pública do pacote.
- Manter o TGZ como artefato técnico aprovado, com checksum e procedência.
- Depois de publicar, instalar pelo registro em projeto temporário e testar
  versão, `init`, `doctor` e `sync --check` em cache novo.
- Preservar credenciais fora do Git, arquivos humanos e versões anteriores.

## Critérios de aceite

| ID | Resultado | Prova |
| --- | --- | --- |
| AC-001 | CLI sugere pacote nomeado em todos os sistemas. | Testes e saída. |
| AC-002 | Notas e guias usam o registro e apontam o pacote. | Lint e revisão. |
| AC-003 | Publicação valida o consumidor e recusa falhas. | Testes negativos. |
| AC-004 | Pacote publicado instala e funciona pelo registro. | Actions real. |
| AC-005 | Versões e dados anteriores são preservados. | Distribuição e Git. |

Evidências em `.agent-tests/registry-installation/`. A CLI e os arquivos são
o escopo; não há interface web ou desktop para validar nesta mudança.

[Specs](../README.md) · [GitHub Packages](../../packages.md)
