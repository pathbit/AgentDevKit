---
trigger: model_decision
description: Aplique ao consultar, preparar, integrar ou publicar alterações Git.
---

# Regras Git

Em consultas sem alterações, defina `GIT_OPTIONAL_LOCKS=0` no ambiente do
subprocesso para reduzir atualizações opcionais. Isso não garante a preservação
exata do índice: até `git diff` pode atualizá-lo. Quando essa preservação for
exigida, use apenas métodos comprovadamente seguros para o repositório ou
informe a limitação. A variável não substitui as travas necessárias para
operações que alteram o Git.

Use Conventional Commits (`tipo(escopo): descrição`, escopo opcional), inclusive
em checkpoints e merges; destaque mudanças incompatíveis com `!` ou
`BREAKING CHANGE:`. Autor e committer devem ser o usuário, nunca um agente;
confira as identidades efetivas e não adicione coautoria ou identificação de
agente. Se a identidade do usuário não estiver clara, pergunte. Não altere a
configuração ou a assinatura criptográfica automaticamente e não reescreva
autores humanos existentes.

Antes de publicar, confira o conteúdo, as verificações e o estado remoto; não
envie tarefas incompletas nem use push forçado. Consulte a skill correspondente
em `.pbai4devs/skills/git/`.
