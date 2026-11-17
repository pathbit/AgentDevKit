---
name: criar-design-doc
description: Define e revisa o design técnico do produto com o usuário.
---

# Criar design técnico

Siga `.pbai4devs/rules/qualidade/RULE.md` ao criar arquivos Markdown.
Antes de escrever, use `atualizar-documentacao` para ler e reaproveitar documentos
existentes; aplique o template somente às lacunas.

Consulte `.pbai4devs/state/configuracao/ESTADO.md` e as evidências da
preparação. Se ela não estiver concluída e comprovada, suspenda o design e
indique `configurar-projeto`; a ausência do estado não prova que nunca ocorreu.
Com a preparação concluída e comprovada, confira o PRD aprovado e UX/UI
aprovado ou não aplicável com justificativa aprovada. Se faltar evidência,
houver pendência ou conflito, informe o bloqueio e encaminhe à primeira skill
necessária.

Leia o contexto e reúna as dúvidas sobre arquitetura, componentes, fluxos,
integrações, dados, requisitos não funcionais, segurança, testes, implantação,
alternativas, riscos e dependências. Pergunte o que faltar e não invente
escolhas ou métricas. Registre a arquitetura e a tecnologia propostas nesta
etapa; não instale ferramentas nem inicialize a aplicação.
Consulte `usar-skills-externas` para referências oficiais das opções em análise.

Crie ou atualize o arquivo indicado em `documentos.design` usando
`.pbai4devs/templates/design/TEMPLATE.md`, com vínculos ao PRD e UX/UI, decisões
e questões pendentes. Documento novo ou materialmente alterado fica em
`status: rascunho`; sem mudança material, preserve o status e sua aprovação.
Para documento novo ou reaberto, resolva as decisões essenciais e apresente-o
para revisão e aprovação explícita, respeitando aprovações já concedidas. Só
então registre `status: aprovado` e a evidência da aprovação. Reavalie specs
dependentes e reabra apenas as que tenham impacto material comprovado e
autoridade para alterá-las. Na dúvida, preserve-as e registre a revisão pendente.

Quando houver impacto, atualize o roadmap com `gerenciar-roadmap` sem inventar
datas ou entregas. Após a aprovação do design, use `proximos-passos` para
identificar a etapa pendente; planeje os incrementos antes das specs.

Atualize o resumo técnico/links do README e registre ADRs quando aplicável,
usando os modelos e `atualizar-documentacao`. Sincronize apontamentos somente
se recursos dos agentes mudarem.
