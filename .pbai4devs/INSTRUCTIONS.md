---
description: Ordem de trabalho e manutenção dos agentes.
---

# Como usar

Peça a skill pelo nome ou solicite a leitura de seu `SKILL.md`.

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
Evolua README e documentos de apoio pelos [modelos da fase](templates/README.md).
Atualize fatos e links afetados; registre ausência de impacto com justificativa.

Para desenvolver um projeto existente, use `preparar-dev`: diagnostique e
prepare a máquina sem recriar documentos de produto. Melhorias de estrutura
e mudanças funcionais têm escopo próprio. O [modelo de ambiente](templates/ambiente-local/TEMPLATE.md)
define as perguntas e os arquivos obrigatórios da configuração técnica.

## Criar e manter recursos

Use `criar-recurso`; ele encaminha à skill específica ou cria um novo tipo.
Após criar, alterar, renomear ou remover recursos, use `sincronizar-agentes`.
Isso regenera `catalog.json` e os índices auxiliares; não mantenha listas JSON
manualmente. Confira com `--check` antes de concluir a alteração.
Antes dos `.mjs`, confira Node/npm pelo [primeiro uso](scripts/preparar-ferramentas/README.md).
Se faltar runtime numa consulta ou execução, use o bootstrap somente para
Node/npm (`--runtime-only` no shell ou `-RuntimeOnly` no PowerShell).
`instalar-ferramentas` usa o fluxo completo: prepara o runtime e executa
`setup` para instalar e verificar as ferramentas compatíveis.
Use Node.js 24+ com npm e os comandos de [scripts](scripts/README.md).
`executar-script` reutiliza as automações `.mjs`, iguais em todos os sistemas.
`verificar-trabalho` orienta os níveis de prova; alterações web exigem navegador.
Após qualquer implementação, conclua o [comando de revisão](commands/revisar-entrega/COMMAND.md):
documentação afetada, evidências por critério e revisor independente. O relatório
fica ignorado em `.agent-tests/`; achados e provas pendentes impedem concluir.
Consulte [skills externas](external-skills/README.md) antes de reinventar um
procedimento; ative referências curadas pela tarefa, respeitando a stack decidida.
`preparar-ferramentas` baixa/atualiza ferramentas locais para o SO/arquitetura;
cada ferramenta tem `TOOL.json` e `SCRIPT.mjs` em `.pbai4devs/tools/<nome>`.
Binários e registros de instalação em `.local/`, cache e launchers são ignorados.

O [espelhos.conf](espelhos.conf) registra clientes, layouts e pontos nativos.
O [catálogo](catalog.json) reúne o inventário geral e os comandos das ferramentas.
Os registros `skills.json`, `rules.json` e `agents.json` indexam as fontes.
Antigravity e Gemini usam os apontamentos em `.agents`, `.agent` e `.gemini`.
Copilot/VS Code usa `.github`; `.vscode` configura o editor. Veja os demais
clientes e seus limites na [compatibilidade](COMPATIBILIDADE.md).
Somente recursos agênticos têm apontamentos; templates, scripts, tools e estado
permanecem exclusivamente em `.pbai4devs`.
O sincronizador também mantém os `.gitignore` locais de `.pbai4devs` e dos clientes.
Use os [modelos de ignore](templates/gitignore/TEMPLATE.md) para alterar a lista
de fontes permitidas; deixe apenas regras gerais no `.gitignore` da raiz.
Documentos de produto também ficam fora dos espelhos. O comando `sincronizar`
reconstrói apontamentos com `--force`; `--check` verifica sem alterações.

Os [comandos](commands/README.md) são entradas dos casos de uso: diagnóstico,
preparo local, atualização de ferramentas, sincronização e verificações.
Para consultas, leia o [comando de status](commands/status-roadmap/COMMAND.md).
Para revisão, use o [revisor](agents/revisor/AGENT.md). Links orientam a leitura;
a descoberta automática depende dos formatos de cada ferramenta.
