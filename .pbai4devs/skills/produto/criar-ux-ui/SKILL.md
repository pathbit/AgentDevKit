---
name: criar-ux-ui
description: Define ou justifica a não aplicação de UX e interface com o usuário.
---

# Criar UX/UI

Siga `.pbai4devs/rules/qualidade/RULE.md` ao criar arquivos Markdown.
Antes de escrever, use `atualizar-documentacao` para ler e reaproveitar documentos
existentes; aplique o template somente às lacunas.

Consulte `.pbai4devs/estado/configuracao/ESTADO.md` e confira o PRD
com `status: aprovado` e a
aprovação registrada. Se faltar, estiver pendente ou for insuficiente, informe
o bloqueio e encaminhe a `criar-prd`.

Leia o contexto e pergunte em conjunto o que faltar sobre usuários, jornadas,
interfaces, acessibilidade, plataformas, estados, referências e validação. Se
não houver interface, confirme com o usuário se UX/UI não se aplica e registre
os motivos; não presuma. Não invente decisões ou métricas.

Crie ou atualize o arquivo indicado em `documentos.ux_ui` usando
`.pbai4devs/templates/ux-ui/TEMPLATE.md`, com
`status: rascunho`, vínculo ao PRD, decisões e critérios de validação.
Apresente para revisão
e peça aprovação explícita após resolver as decisões essenciais. Registre
`status: aprovado` ou `status: nao-aplicavel`, conforme a decisão, e a evidência
da aprovação. Mudanças materiais exigem retornar a `rascunho` e nova aprovação.
Reavalie design e specs dependentes; registre o impacto e retorne a `rascunho`
os documentos afetados para revisão e nova aprovação.

Atualize o roadmap com `gerenciar-roadmap` sem inventar datas ou entregas. A
próxima etapa é `criar-design-doc`.

Use `atualizar-documentacao` para refletir jornadas e links afetados no README
e documentos relacionados. Sincronize somente recursos dos agentes alterados.
