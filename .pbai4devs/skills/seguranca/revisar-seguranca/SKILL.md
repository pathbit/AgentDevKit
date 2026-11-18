---
name: revisar-seguranca
description: Revisa riscos de segurança com análise local, contexto e provas.
---

# Revisar segurança

Delimite a mudança ou o projeto, os dados sensíveis, a stack e o ambiente autorizado.
Leia as regras de [segurança](../../../rules/seguranca/RULE.md) e
[execução local](../../../rules/execucao-local/RULE.md). Não amplie o alvo.

Use [auditar-seguranca](../../../commands/auditar-seguranca/COMMAND.md) para
os scanners disponíveis e o [auditor](../../../agents/auditor-seguranca/AGENT.md)
para interpretar os resultados. Uma ferramenta ausente ou base indisponível
gera pendência; resultado vazio não substitui análise de contexto.

Revise também autenticação, autorização por recurso, isolamento de dados,
segredos e entradas conforme o [guia](../REFERENCE.md).
Use [revisar-autorizacao](../revisar-autorizacao/SKILL.md) para permissões e
[modelar-ameacas](../modelar-ameacas/SKILL.md) quando houver novas fronteiras.
Use [validação adversarial](../../qualidade/validar-adversarial/SKILL.md) para
selecionar testes negativos dos controles com dados sintéticos. Confira os
resultados na API ou na interface local conforme
[verificar-trabalho](../../projeto/verificar-trabalho/SKILL.md).

## Relatório de segurança

Apresente o relatório na conversa e salve uma cópia em `.agent-tests/security/`.
Quando houver uma execução do scanner, cite seu `report.json` como evidência
e preserve o original. A revisão termina no diagnóstico e nas recomendações.

1. **Resumo e escopo.** Identifique a revisão ou os caminhos examinados, o
   ambiente e as verificações executadas. Conte os achados confirmados por
   gravidade. Se forem zero, diga em qual escopo. Liste separadamente as
   suspeitas e os falsos positivos, com a justificativa da triagem.
2. **Achados por risco.** Para cada achado, dê um identificador, o controle
   afetado, a precondição, a probabilidade e o impacto sobre pessoas, dados
   ou serviço. Justifique a gravidade (crítica, alta, média ou baixa) com
   esses fatos. Registre a confiança na conclusão e a evidência que a sustenta
   (arquivo e linha, configuração ou resultado de teste). Omita credenciais
   e dados pessoais. Para uma suspeita, indique qual evidência falta.
3. **O que corrigir primeiro.** Ordene as ações pelos identificadores dos
   achados. Explique a urgência do primeiro item considerando exposição e
   impacto. Para cada ação, descreva a correção, o esforço estimado e como
   verificar o controle depois. Se só houver suspeitas, priorize obter a
   prova que falta. Encaminhe reparos autorizados a
   [corrigir-vulnerabilidade](../corrigir-vulnerabilidade/SKILL.md).
4. **Não avaliado.** Identifique controles, caminhos ou ambientes fora do
   escopo e verificações incompletas. Registre o motivo e o que permitiria
   avaliar cada pendência. Identifique à parte itens não aplicáveis à stack
   e justifique. Vincule a conclusão à cobertura efetivamente obtida.
