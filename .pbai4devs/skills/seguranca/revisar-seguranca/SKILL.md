---
name: revisar-seguranca
description: Revisa riscos de segurança com análise local, contexto e provas.
---

# Revisar segurança

Defina o escopo: mudança ou projeto, dados sensíveis, stack e ambiente autorizado.
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

Registre achado, evidência, impacto, confiança e estado da triagem, sem valores
secretos. Diferencie vulnerabilidade confirmada, suspeita e falso positivo.
Prove cenários de API pelo terminal e fluxos web no navegador local autorizado,
seguindo [verificar-trabalho](../../projeto/verificar-trabalho/SKILL.md).
Salve o relatório em `.agent-tests/security/`; não declare o produto seguro
com base apenas em scanners. Encaminhe correções à skill correspondente.
