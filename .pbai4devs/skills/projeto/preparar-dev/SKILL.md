---
name: preparar-dev
description: Prepara ou repara o ambiente local de um projeto existente para começar a desenvolver.
---

# Preparar desenvolvimento

Inspecione somente este repositório: README, regras, manifests, lockfiles,
Makefile, Compose, Dockerfiles, exemplos de ambiente e comandos de CI/testes.
Identifique tecnologia, versões e a forma real de executar; não presuma que a
estrutura esteja correta nem que tenha sido criada por este agente.

1. Use `executar-script` com `inspecionar-projeto` e `diagnosticar-ambiente`
   para descobrir estrutura, SO, arquitetura, Docker/Compose e runtimes.
   Confira conectores. Reúna as dúvidas no início: intenção, erro observado,
   serviços externos, credenciais, versões, porta e dados/volumes a preservar.
   Use o [modelo de ambiente](../../../templates/ambiente-local/TEMPLATE.md)
   para completar apenas o que faltar.
2. Apresente os reparos necessários e execute os autorizados. Para apenas
   desenvolver, não exija novos PRD/design/spec nem reorganize a aplicação.
   Restrinja o reparo ao ambiente; alterações funcionais têm escopo próprio.
   Mudanças de arquitetura, versões ou migração de dados exigem decisão própria;
   melhorias de estrutura seguem `configurar-projeto` quando solicitadas.
3. Rode `preparar-ferramentas setup` para instalar e validar ferramentas locais
   dos agentes por seus `TOOL.json`, com SO/arquitetura corretos e downloads
   em `.pbai4devs/tools/<nome>/.local/`. Instale dependências
   do projeto pelos lockfiles e comandos existentes; evite instalações globais.
4. Prepare os serviços pelo Docker Compose local, conforme a
   [regra de ambiente](../../../rules/ambiente-local/RULE.md). Se estiver ausente
   ou quebrado, adapte os modelos ao projeto com o reparo autorizado. Preserve
   bancos, volumes e segredos; não recrie dados nem execute limpeza destrutiva.
5. Valide configuração, build, saúde, migrações acordadas e testes relevantes.
   Use `verificar-trabalho` para provar o fluxo real quando houver aplicação.
   Relate comandos para subir/parar, URL/porta, evidências e pendências.

Registre resultados locais em `.agent-tests/`; atualize documentação somente
quando necessário e sincronize seus apontamentos. Para implementar novas
funcionalidades, encaminhe ao fluxo de specs com seus pré-requisitos.
