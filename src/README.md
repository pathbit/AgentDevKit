---
description: Código da CLI e do instalador do AgentDevKit.
---

# Código do pacote

CLI, instalação, idioma e próximos passos usam os recursos compartilhados.
Este diretório não faz parte dos recursos instalados nos projetos.

| Módulo | Responsabilidade |
| --- | --- |
| `cli.mjs` | Entrada estável para a CLI. |
| `cli/` | Argumentos, execução, saída, avisos e relatório de recuperação. |
| `install.mjs` | API de instalação, sync e diagnóstico usada pela CLI. |
| `installation/` | Plano, estágio, arquivos gerenciados e transação. |
| `config.mjs` | Caminhos, versão e metadados do pacote. |
| `adapters/` | Acesso aos layouts compartilhados dos agentes. |
| `i18n.mjs` e `next.mjs` | Idiomas e orientação da próxima ação. |
| `plugins.mjs` | Catálogo opcional e encaminhamento aos gerenciadores locais. |

Em `installation/`, `plan.mjs` coordena o plano. `prepare-stage.mjs`
prepara a cópia privada e `stage-cleanup.mjs` trata sua limpeza e seus
diagnósticos. `plan-state.mjs` concilia a proposta com o estado registrado
e `native-outputs.mjs` concilia referências com os destinos do projeto.
`apply.mjs` revalida o plano antes de escrever e usa `publish-file.mjs`
para publicar arquivos. `state.mjs`, `legacy-state.mjs`, `ownership.mjs`
e `git-index.mjs` concentram leitura, migração, propriedade e verificações
do índice. Os controles compartilhados de Git, metadados e recuperação
moram em `.pbai4devs/scripts/lib/`.

Antes de aplicar alterações, o instalador recusa arquivos com múltiplos
hardlinks detectados ou cuja contagem não possa ser verificada. A contagem é
conferida novamente antes da escrita, mas
isso não elimina alterações concorrentes entre a conferência e a operação.
O plano informa esses bloqueios; uma mudança posterior exige nova verificação.
No macOS, a aplicação também recusa arquivos com ACL listada ou com consulta
inconclusiva; o plano informa esses bloqueios nos arquivos afetados. A proteção
não cobre ACLs dos diretórios do projeto ou alterações concorrentes após a consulta.
Antes de copiar dados para um backup novo no macOS, a aplicação recusa sua
pasta se ela tiver ACL listada ou se a consulta falhar. Essa verificação não
comprova privacidade contra alterações concorrentes ou em outros sistemas.

Quando o planejamento do estágio falha e a tentativa de removê-lo também
falha, `planInstallation` preserva a cadeia da falha principal em `cause` e
disponibiliza a falha de limpeza em `cleanupError`, propriedade não enumerável.
Esse valor
pode conter mensagens e caminhos sensíveis: inspecione-o apenas localmente.
A saída JSON da CLI informa a falha de limpeza com mensagem fixa. Quando a
remoção final é a única falha, seu valor fica em `cause`.
