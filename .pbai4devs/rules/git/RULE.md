---
trigger: model_decision
description: Aplique ao preparar, integrar ou publicar alterações Git.
---

# Regras Git

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
