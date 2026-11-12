---
name: criar-design-doc
description: Define e revisa o design técnico do produto com o usuário.
---

# Criar design técnico

Siga `.pbai4devs/rules/qualidade/RULE.md` ao criar arquivos Markdown.
Antes de escrever, use `atualizar-documentacao` para ler e reaproveitar documentos
existentes; aplique o template somente às lacunas.

Consulte `.pbai4devs/estado/configuracao/ESTADO.md` e confira o PRD aprovado
e UX/UI aprovado ou não aplicável com justificativa,
incluindo a evidência das decisões. Se faltar, estiver pendente ou houver
conflito, informe o bloqueio e encaminhe à skill correspondente.

Leia o contexto e reúna as dúvidas sobre arquitetura, componentes, fluxos,
integrações, dados, requisitos não funcionais, segurança, testes, implantação,
alternativas, riscos e dependências. Pergunte o que faltar e não invente
escolhas ou métricas. Registre a arquitetura e a tecnologia propostas nesta
etapa; não instale ferramentas nem inicialize a aplicação.
Consulte `usar-skills-externas` para referências oficiais das opções em análise.

Crie ou atualize o arquivo indicado em `documentos.design` usando
`.pbai4devs/templates/design/TEMPLATE.md`, com `status: rascunho`, vínculos ao PRD
e UX/UI, decisões e questões pendentes. Apresente
para revisão após resolver as decisões essenciais e peça aprovação explícita;
só depois registre `status: aprovado` e a evidência da aprovação. Mudanças
materiais exigem voltar a `rascunho` e nova aprovação. Reavalie specs
dependentes, registre o impacto e retorne a `rascunho` as afetadas para revisão
e nova aprovação.

Atualize o roadmap com `gerenciar-roadmap` sem inventar datas ou entregas. Com os
pré-requisitos aprovados, planeje os incrementos no roadmap antes de usar
`criar-spec` e `implementar-spec`.

Atualize o resumo técnico/links do README e registre ADRs quando aplicável,
usando os modelos e `atualizar-documentacao`. Sincronize apontamentos somente
se recursos dos agentes mudarem.
