---
description: Tarefas de preservação de permissões de temporários do sync.
status: em andamento
---

# Permissões de temporários do sync

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Spec: [sync-permissoes](../../specs/sync-permissoes/SPEC.md). Release: pendente.

- [x] Reproduzir o modo `666` em fixture de destino `600` no macOS e Linux.
- [x] Corrigir a criação do temporário sem alterar a política de arquivos novos.
- [x] Provar 26 casos de modo, conteúdo e checagens concorrentes em macOS e
  Linux. Na baseline, 18 desses casos falharam.
- [x] Repetir 12 suítes de infraestrutura em cópia isolada, oito cenários de
  maturidade e testes de preservação; registrar um caso NTFS ignorado.
- [-] Revisar o diff e atualizar documentação e evidências.
- [ ] Validar Windows e recuperação concorrente antes de uma release.

As provas ficam em `.agent-tests/sync-permissoes/execucao-XZqfCZ/`. O pacote
candidato local passou por seis operações em fixture isolada; isso não altera
a versão publicada. Os onze testes estritos de preservação continuam falhando.

[reading-pt]: TASKS.md
[reading-en]: ../../en/tasks/sync-permissoes/TASKS.md
[reading-es]: ../../es/tasks/sync-permissoes/TASKS.md
