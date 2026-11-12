---
description: Correções verificadas de preservação, transações e interface CLI.
status: aprovado
version: 0.0.8
---

# Preservação e validação aprofundada

## Objetivo e autorização

Atender ao pedido de revisão profunda, corrigindo falhas comprovadas e
publicando uma nova versão estável após validação. Esta etapa continua o
[PRD](../../product/prd.md), o [design](../../product/design.md) e os
[testes em projetos reais](../v0.0.7/SPEC.md).

## Contrato

- Não apagar ou sobrescrever arquivos humanos pela aparência de seu Markdown.
  Exigir propriedade comprovada para limpeza automática de apontamentos.
- Recusar conflitos conhecidos antes de escrever. Em falhas posteriores,
  restaurar as alterações próprias sem substituir edições humanas concorrentes.
- Preservar permissões em atualização, backup e rollback, inclusive em
  arquivos somente para leitura quando a operação for permitida pelo sistema.
- Recusar componentes simbólicos nos caminhos locais de ferramentas, inclusive
  após operações externas, antes de escrever ou confirmar uma instalação.
- Preservar integralmente argumentos após `tools ... --`; ajuda e versão
  não exigem diretório de projeto válido.
- Conferir artefatos existentes e exceções literais além dos nomes de amostra,
  sem ler ignores de projetos irmãos ou desindexar arquivos humanos.
- Manter a recusa de links simbólicos incompatíveis do Zod; não converter
  esse bloqueio documentado em uma instalação bem-sucedida.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Markdown humano é preservado; limpeza usa propriedade comprovada. |
| AC-002 | Falhas não deixam gravações próprias parciais nem mudam permissões. |
| AC-003 | Gerenciador não escreve fora da instalação por links simbólicos. |
| AC-004 | CLI repassa argumentos; ajuda funciona sem projeto. |
| AC-005 | Ignore protege artefatos sem invadir projetos irmãos. |
| AC-006 | Regressões, pacote público e atualização do router são verificados. |

## Verificação

Para AC-001 a AC-005, conservar reproduções anteriores e testes de regressão
que falham antes da correção, com assertivas de conteúdo, modo, estado e Git.
Executar os testes relevantes em Node 24/26 e revisar os diffs de forma
independente. Limitações de plataforma devem ficar explícitas.

Para AC-006, executar pipeline completo, cenários de maturidade e matriz OSS
do pacote gerado. Confirmar no CI Linux, macOS e Windows; publicar o mesmo TGZ,
comparar checksum e repetir o consumo público. Atualizar o router com preview,
backup, diagnóstico e comparação da baseline, preservando o índice existente.

Testes e fixtures são versionados. Clones e provas ficam em `tmp/` e o registro
de revisão em `.agent-tests/`. Não prometer ausência universal de bugs.

## Documentação afetada

Atualizar referência da CLI, instalação, ferramentas, changelog, README,
roadmap e índices. Não criar documentos de produto nos projetos consumidores.
