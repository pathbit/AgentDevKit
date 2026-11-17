---
name: criar-ux-ui
description: Define ou justifica a não aplicação de UX e interface com o usuário.
---

# Criar UX/UI

Siga `.pbai4devs/rules/qualidade/RULE.md` ao criar arquivos Markdown.
Antes de escrever, use `atualizar-documentacao` para ler e reaproveitar documentos
existentes; aplique o template somente às lacunas.
Ao relatar o estado atual, diferencie o documento lido das seções e dos
marcadores do template; não atribua ao projeto conteúdo que não verificou.

Consulte `.pbai4devs/state/configuracao/ESTADO.md` e as evidências da
preparação. Se ela não estiver concluída e comprovada, suspenda o trabalho de UX
e indique `configurar-projeto` como próxima etapa. A ausência do estado não
prova que a preparação nunca ocorreu; peça apenas o necessário para verificá-la.
Com a preparação concluída e comprovada, confira o PRD com `status: aprovado`
e a aprovação registrada. Se o PRD faltar, estiver pendente ou for insuficiente,
informe o bloqueio e encaminhe a `criar-prd`.

Leia o contexto e pergunte em conjunto o que faltar sobre usuários, jornadas,
interfaces, acessibilidade, plataformas, estados, referências e validação. Se
não houver interface, confirme com o usuário se UX/UI não se aplica e registre
os motivos; não presuma. Não invente decisões ou métricas.

Crie ou atualize o arquivo indicado em `documentos.ux_ui` usando
`.pbai4devs/templates/ux-ui/TEMPLATE.md`, com vínculo ao PRD, decisões e
critérios de validação. Documento novo ou materialmente alterado fica em
`status: rascunho`; sem mudança material, preserve o status e sua aprovação.
Para documento novo ou reaberto, resolva as decisões essenciais e apresente-o
para revisão e aprovação explícita, respeitando aprovações já concedidas. Só
então registre `status: aprovado` ou
`status: nao-aplicavel`, conforme a decisão, e a evidência da aprovação.
Reavalie design e specs dependentes; reabra apenas documentos com impacto
material comprovado e autoridade para alterá-los. Na dúvida, preserve-os e
registre a revisão pendente.

Quando houver impacto, atualize o roadmap com `gerenciar-roadmap`, sem inventar
datas ou entregas.
Após a aprovação de UX/UI ou da justificativa de não aplicação, use
`proximos-passos` para identificar a próxima etapa pendente, sem reabrir
documentos válidos.

Use `atualizar-documentacao` para refletir jornadas e links afetados no README
e documentos relacionados. Sincronize somente recursos dos agentes alterados.
