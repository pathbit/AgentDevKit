---
name: criar-skill
description: Cria ou atualiza skills compartilhadas do projeto.
---

# Criar skill

Crie ou atualize `.pbai4devs/skills/<grupo>/<nome>/SKILL.md`, com `name` e
`description`. Use nome em minúsculas, números e hífens, igual ao da pasta.
Consulte `usar-skills-externas` e os fluxos existentes antes de criar outra
implementação. Mantenha no arquivo só decisões e ações essenciais.
Detalhes opcionais ficam em referências carregadas quando necessários.

Indique a verificação adequada: terminal para lógica/API, navegador para web,
automação para desktop e renderização para artefatos. Diga o que abrir e provar;
reutilize `executar-script` e `verificar-trabalho` em vez de repetir seus fluxos.
Siga a regra de qualidade e informe limitações.

Atualize as referências humanas em `AGENTS.md` e no guia quando mudarem.
Finalize com `sincronizar-agentes` para gerar os JSON e confira `--check`;
não edite índices derivados à mão nem replique instruções.
Apresente a skill para revisão e respeite as aprovações já dadas pelo usuário.
