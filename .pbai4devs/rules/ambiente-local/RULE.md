---
trigger: always_on
description: Estrutura mínima e ambiente local dos projetos com Docker Compose.
---

# Ambiente local

Na configuração técnica de projetos novos, crie `.vscode/`, `.pbai4devs/`, as
pastas de agentes suportadas, `src/`, `tests/` e `infra/compose/compose.local.yml`.
São obrigatórios `.gitignore`, `.gitattributes`, `.editorconfig`,
`.dockerignore`, `Makefile` e `README.md`; `scripts/` é opcional para automações
da aplicação. Em projetos existentes, preserve a organização até uma
padronização autorizada; preparar a máquina não implica migrar o projeto.

Execute o ambiente local em Docker Compose. Esclareça serviços e versões,
bancos, cache, filas, integrações, recursos, segredos, portas e dados existentes.
Pergunte a porta de entrada; se o usuário não souber, escolha uma livre e
registre-a. Publique somente o necessário em localhost, com healthchecks e
persistência explícita. Preserve volumes; não execute `down -v` como rotina.

Traefik é opcional para compartilhar a porta de entrada entre aplicações com
hosts distintos. Use configuração de arquivo ou proxy restrito para descoberta;
não exponha dashboard nem acesso irrestrito ao socket Docker.

O Makefile deve oferecer `help`, `doctor`, `setup`, `up`, `down`, `logs`,
`test`, `lint` e `build`, com comandos reais da stack. Etapas ainda indefinidas
devem falhar com mensagem útil; não simule sucesso. Documente os comandos,
dependências e URL/porta no README; valide Compose e saúde antes de concluir.

Use o [modelo de ambiente](../../templates/ambiente-local/TEMPLATE.md) para
perguntas e arquivos-base. Versões da aplicação seguem as decisões do projeto;
atualização de ferramentas locais não atualiza bancos ou dependências da stack.
