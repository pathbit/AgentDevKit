---
description: Código da CLI e do instalador do AgentDevKit.
---

# Código do pacote

CLI, instalação, idioma e próximos passos usam os recursos compartilhados.
Este diretório não faz parte dos recursos instalados nos projetos.

| Módulo | Responsabilidade |
| --- | --- |
| `cli.mjs` | Comandos, opções e saída para pessoas ou automações. |
| `install.mjs` | Planejamento e aplicação segura da instalação. |
| `config.mjs` | Caminhos, versão e metadados do pacote. |
| `adapters/` | Acesso aos layouts compartilhados dos agentes. |
| `i18n.mjs` e `next.mjs` | Idiomas e orientação da próxima ação. |
