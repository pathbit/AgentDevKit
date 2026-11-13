---
description: Ordem de trabalho e manutenção dos agentes.
---

# Como usar

Peça a skill pelo nome ou solicite a leitura de seu `SKILL.md`.

Antes de trabalhar na documentação, use `atualizar-documentacao` para inventariar
e ler os arquivos existentes. Preserve seus caminhos e conteúdo; complemente
lacunas e organize por índices, sem substituir documentos pelos modelos.

Antes de instalar ou preparar ferramentas, pergunte quais clientes o usuário
usa, se não houver escolha no pedido ou no estado do kit. A CLI aceita
`--agents codex,claude`; `agents` consulta ou altera a seleção depois.
Use os IDs da [compatibilidade](COMPATIBILIDADE.md), sem deduzir o agente pelo
aplicativo, SO ou pastas. Sem resposta disponível, mantenha a escolha salva ou
`all`. Registre pela CLI, sem editar hashes do estado manualmente.

1. `configurar-projeto`: preparar o trabalho sem iniciar código.
2. `criar-prd` e `criar-ux-ui`: definir produto e experiência.
3. `criar-design-doc`: aprovar arquitetura e tecnologia.
4. `gerenciar-roadmap`: planejar entregas e dependências.
5. `criar-spec`: exige os documentos anteriores aprovados; UX/UI pode ser
   não aplicável com justificativa aprovada.
6. `implementar-spec`: esclarecer dúvidas, aprovar plano, configurar/verificar
   o ambiente, implementar e provar os critérios de aceite.

Enquanto configurar os agentes, mantenha apenas modelos. Os documentos reais
serão preenchidos por perguntas e respostas quando o projeto começar.
Combine destinos e registre-os no estado futuro de configuração. Ao finalizar
uma etapa, explique a próxima e reúna suas perguntas. Use
[proximos-passos](skills/projeto/proximos-passos/SKILL.md) e respeite o idioma
salvo em `.pbai4devs/estado/agentdevkit.json`; sem escolha, use português.
Evolua README e documentos pelos [modelos da fase](templates/README.md).
Atualize fatos e links afetados; registre ausência de impacto com justificativa.

Para desenvolver um projeto existente, use `preparar-dev`: diagnostique e
prepare a máquina sem recriar documentos de produto. Melhorias de estrutura
e mudanças funcionais têm escopo próprio. O [modelo de ambiente][ambiente]
define as perguntas e os arquivos obrigatórios da configuração técnica.

## Criar e manter recursos

Use `criar-recurso`; ele encaminha à skill específica ou cria um novo tipo.
Após criar, alterar, renomear ou remover recursos, use `sincronizar-agentes`.
Isso regenera `catalog.json` e os índices auxiliares; não mantenha listas JSON
manualmente. Confira com `--check` antes de concluir a alteração.
Antes dos `.mjs`, confira Node/npm pelo [primeiro uso][preparo].
Com Node 18+ disponível, use `BOOTSTRAP.mjs --runtime-only` para preparar
Node 24+. Sem Node/npm, instale primeiro pelo mecanismo nativo do SO.
`instalar-ferramentas` usa o fluxo completo: prepara o runtime e executa
`setup` para instalar e verificar as ferramentas compatíveis.
Use Node.js 24+ com npm e os comandos de [scripts](scripts/README.md).
`executar-script` reutiliza as automações `.mjs`, iguais em todos os sistemas.
`verificar-trabalho` orienta as provas; alterações web exigem navegador.
Mudanças em acesso, dados, entradas e dependências usam `revisar-seguranca`.
O [fluxo de segurança](commands/auditar-seguranca/COMMAND.md) combina scanners
locais e análise de contexto; as skills já acompanham a instalação do kit.
Após qualquer implementação, conclua o [comando de revisão][revisao]:
documentação afetada, provas por critério e revisor independente. O relatório
fica ignorado em `.agent-tests/`; achados e provas pendentes impedem concluir.
Consulte [skills externas](external-skills/README.md) antes de reinventar um
procedimento; ative referências pela tarefa, respeitando a stack decidida.
`preparar-ferramentas` baixa/atualiza ferramentas locais para o SO/arquitetura;
cada ferramenta tem `TOOL.json` e `SCRIPT.mjs` em `.pbai4devs/tools/<nome>`.
Binários e registros em `.local/`, cache e launchers são ignorados.

O arquivo local `espelhos.conf` registra seleção, layouts e pontos nativos.
O catálogo local `catalog.json` reúne inventário e comandos das ferramentas.
Os registros `skills.json`, `rules.json` e `agents.json` indexam as fontes.
Codex e Antigravity compartilham `.agents`; `.agent` é uma opção legada.
Gemini usa `.gemini`; Copilot/VS Code usa `.github` e `.vscode`. Veja os demais
clientes e seus limites na [compatibilidade](COMPATIBILIDADE.md).
Só clientes selecionados recebem derivações; uma pasta compartilhada permanece
quando outro cliente precisa dela. Atualizar ou sincronizar respeita a seleção.
Somente recursos agênticos têm apontamentos; templates, scripts, tools e estado
permanecem exclusivamente em `.pbai4devs`.
O sincronizador mantém a proteção Git das saídas locais e de `.pbai4devs`.
Use os [modelos de ignore](templates/gitignore/TEMPLATE.md) para alterar a lista
de fontes e derivados; em Git, os apontamentos usam exclusões locais.
O `.gitignore` da raiz pertence ao projeto e não é alterado pelo kit.
Sem Git, a proteção local fica pendente; após `git init`, sincronize antes
de adicionar arquivos ao índice.
Documentos de produto também ficam fora dos espelhos. O comando `sincronizar`
reconstrói apontamentos com `--force`; `--check` verifica sem alterações.

Os [comandos](commands/README.md) são entradas dos casos de uso: diagnóstico,
preparo local, atualização de ferramentas, sincronização e verificações.
Para consultas, leia o [comando de status](commands/status-roadmap/COMMAND.md).
Use o [revisor](agents/revisor/AGENT.md) para revisão. Links orientam a leitura;
a descoberta automática depende dos formatos de cada ferramenta.

[ambiente]: templates/ambiente-local/TEMPLATE.md
[preparo]: scripts/preparar-ferramentas/README.md
[revisao]: commands/revisar-entrega/COMMAND.md
