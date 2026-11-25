---
description: Preservar permissões durante a criação de temporários do sync.
status: aprovado
---

# Permissões de temporários do sync

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O sincronizador pode criar um temporário com permissões mais amplas que o
arquivo existente antes de aplicar seu modo. A autorização geral de melhorias
já concedida pelo usuário cobre esta correção. Este incremento complementa a
[spec de preservação](../v0.0.8/SPEC.md), sem substituir seu contrato de rollback.
Produto e arquitetura permanecem os do [PRD](../../product/prd.md),
[UX](../../product/ux-ui.md) e [design](../../product/design.md).

## Escopo

Em POSIX, ao atualizar um arquivo regular existente, criar o temporário com o
modo observado do destino, sujeito à máscara de criação do sistema, antes de
escrever conteúdo; então restaurar o modo existente como hoje. Arquivos novos e
o Windows mantêm o método anterior de criação; a nova checagem de consistência
também se aplica ao Windows e ainda precisa de prova real. Não consultar ou
alterar `process.umask()` na implementação: a consulta sem argumento tem risco
de corrida segundo a [documentação do Node](https://nodejs.org/api/process.html#processumask).
Se uma remoção ou mudança de modo for observada na checagem anterior à criação
do temporário, recusar a operação. Isso não fecha a janela após essa checagem.

Isso não garante ACLs, dono, grupo, bits especiais, atributos estendidos ou
sigilo no Windows, nem resolve trocas concorrentes durante aplicação, limpeza ou
rollback. O modo pode mudar novamente após a checagem. A
[recuperação conservadora](../recuperacao-conservadora/SPEC.md) continua separada
e pendente; não publicar enquanto seus testes estritos falharem.

## Critérios de aceite

- **AC-001:** Em macOS e Linux, com `umask` permissivo, o temporário de um
  destino `600` não concede acesso a grupo ou outros no instante da criação.
  A fixture sintética em `tests/sync-temporary-privacy.test.mjs` deve falhar
  antes e passar depois. Guardar saída em `.agent-tests/sync-permissoes/`.
- **AC-002:** Modos existentes `400`, `444`, `600`, `640` e `644` são
  preservados após o sync, com máscaras `000`, `002`, `022` e `077`. Arquivo
  novo mantém os modos resultantes das mesmas máscaras. Testar com fixtures isoladas;
  verificar bytes e não depender apenas de opções passadas a `writeFileSync`.
- **AC-003:** Testes de sync e preservação passam sem alterar arquivos humanos,
  índice Git ou ignores das fixtures. Reexecutar `testar-infraestrutura` e
  `testar-maturidade`; registrar comandos, falhas e limites.
- **AC-004:** O teste no Windows não interpreta bits POSIX como prova de ACL.
  Validar funcionamento e preservação na matriz Windows antes de publicar;
  até então registrar como não verificado.

## Entrega

Atualizar o [roadmap](../../product/roadmap.md), testes e documentação de
limites; registrar provas e revisão independente. A versão de release ainda
não foi escolhida. A correção isolada não conclui os demais requisitos do
objetivo nem autoriza uma publicação parcial.

[reading-pt]: SPEC.md
[reading-en]: ../../en/specs/sync-permissoes/SPEC.md
[reading-es]: ../../es/specs/sync-permissoes/SPEC.md
