---
name: gerenciar-roadmap
description: Consulta o status e organiza specs e entregas em releases.
---

# Gerenciar roadmap

Leia o estado do projeto e seus caminhos. Numa consulta, não altere arquivos:
mostre preparação, releases, specs e tarefas com dependências e bloqueios.
Use `[ ]`, `[-]` e `[x]` conforme evidências; informe estados desconhecidos.
Sem roadmap, diga que ainda não foi criado. Não conclua entregas sem prova.

Ao planejar ou atualizar, use o modelo de roadmap no caminho acordado. Registre
objetivos, prioridades, etapas, dependências e pendências de PRD, UX/UI e design.
Mantenha referências e estados coerentes ao aprovar ou revisar documentos;
não invente escopo, datas ou releases. Identifique as specs do primeiro entregável
pelas dependências e pergunte por decisões faltantes.

Para uma release planejada, combine nome, prioridades e dependências. Use slug
em minúsculas sem acentos, números e hífens e o modelo de release em
`<documentos.releases>/<slug>/RELEASE.md`. Vincule specs e tarefas, preserve
outros itens e só conclua após entregas e verificações completas. A preparação
inicial não exige definir uma release.

Siga a regra de qualidade. Após alterações, use `sincronizar-agentes` e informe
arquivos e pendências; uma consulta não executa essa sincronização.
