---
description: Automações de desenvolvimento e publicação do AgentDevKit.
---

# Automações do repositório

Use os comandos npm da raiz. [release](release/README.md) contém verificação,
empacotamento e publicação do produto. `npm run verify` executa o perfil
completo; `npm run build` gera o tarball local, sem publicar.

As automações entregues aos projetos consumidores continuam em
[`.pbai4devs/scripts`](../.pbai4devs/scripts/README.md), junto dos seus recursos.
Não duplique essas ferramentas neste diretório.
