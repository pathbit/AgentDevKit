---
description: Finalidade e criação de skills compartilhadas.
---

# Skills

São procedimentos reutilizáveis, organizados por assunto. Cada skill usa
`<grupo>/<nome>/SKILL.md` com nome e descrição no YAML. A skill orienta decisões;
o agente responsável pode acionar comandos, scripts e outros perfis conforme
as capacidades do cliente.

- `git`: operações de versionamento.
- `projeto`: configuração, criação e manutenção dos recursos.
- `produto`: PRD, experiência e design técnico.
- `specs`: especificações, roadmap e implementação.
- `seguranca`: [revisão](seguranca/revisar-seguranca/SKILL.md),
  [autorização](seguranca/revisar-autorizacao/SKILL.md),
  [ameaças](seguranca/modelar-ameacas/SKILL.md) e
  [correção](seguranca/corrigir-vulnerabilidade/SKILL.md).

Use `criar-skill` quando uma tarefa recorrente precisar de decisões próprias;
use `criar-recurso` para encontrar um fluxo existente antes de criar outro.
Mantenha instruções essenciais no arquivo e detalhes opcionais em referências.
Use `usar-skills-externas` para referências curadas, `atualizar-documentacao`
para manter os documentos e `revisar-entrega` para concluir implementações.
Use [proximos-passos](projeto/proximos-passos/SKILL.md) para orientar a
continuidade conforme a fase e as pendências reais.

O [guia compartilhado](../INSTRUCTIONS.md) orienta o uso das skills.
As skills de segurança integram a instalação do kit; os scanners exigem
[preparo explícito](../commands/preparar-seguranca/COMMAND.md).
Ao alterar o inventário, sincronize os índices e apontamentos locais.
