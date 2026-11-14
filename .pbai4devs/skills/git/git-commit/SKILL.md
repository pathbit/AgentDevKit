---
name: git-commit
description: Cria um commit com alterações selecionadas do usuário.
---

# git-commit

Confira status, diff, alterações previamente preparadas e identidades efetivas
com `git var GIT_AUTHOR_IDENT` e `git var GIT_COMMITTER_IDENT`. Siga a regra
compartilhada `.pbai4devs/rules/git/RULE.md` para identidade, mensagem e assinatura.
Prepare somente arquivos autorizados e avaliados na revisão da entrega. Após
preparar o índice, execute `revisar-entrega check-commit <relatorio>
[outros-relatorios...]`: todos os arquivos staged devem ter revisão selada.
Se falhar ou o índice mudar, interrompa e refaça a verificação. Crie o commit
somente com critérios, documentação e revisão aprovados. Confira autor,
committer e mensagem;
não inclua trabalho
incompleto ou alterações alheias.
