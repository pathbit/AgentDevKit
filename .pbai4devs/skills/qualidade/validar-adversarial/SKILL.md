---
name: validar-adversarial
description: Busca e verifica falhas plausíveis em requisitos, mudanças e evidências autorizadas.
---

# Validar adversarialmente

Leia o escopo, a mudança e as provas existentes. Formule hipóteses concretas
que possam contrariar cada resultado relevante: dados inválidos, limites,
permissões, estados ausentes, falhas de dependências ou concorrência aplicável.
Priorize pelo impacto e pela chance, não pela quantidade de cenários.

Tente reproduzir ou refutar cada hipótese em ambiente e dados autorizados,
preferindo isolamento e verificações não destrutivas. Use uma revisão
independente quando houver agente disponível e permitido; caso contrário,
registre a limitação e faça uma segunda leitura crítica. Não acesse sistemas,
segredos ou serviços externos sem autorização.

Relate cenário, observação, impacto, localização e confiança; diferencie falha
confirmada, hipótese e teste não executado. Para segurança, encaminhe à
[revisão de segurança](../../seguranca/revisar-seguranca/SKILL.md); correções
exigem nova prova. Não declare ausência de falhas a partir de uma amostra.
