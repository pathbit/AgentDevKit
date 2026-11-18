---
name: revisar-codigo
description: Revisa alterações de código em busca de defeitos, regressões e provas insuficientes.
---

# Revisar código

Examine o diff, o contexto necessário, os critérios e as evidências; preserve
as alterações de outras pessoas. Trabalhe em leitura quando atuar como
[revisor](../../../agents/revisor/AGENT.md) e peça o que faltar.
Procure critérios e testes relevantes antes de afirmar que não existem ou que
um teste é o único. Relate apenas leituras, buscas e execuções comprovadas,
com seu escopo; quando não puder verificar, informe essa limitação.

Investigue correção, contratos, dados, concorrência, falhas, segurança e efeitos
de implantação pertinentes. Use [validação adversarial](../validar-adversarial/SKILL.md)
para refutar suposições e identifique testes de regressão ausentes. Priorize
defeitos reproduzíveis, não preferências de estilo ou mudanças fora do escopo.

Para cada achado, informe arquivo, linha, cenário, impacto e evidência; distinga
certeza de hipótese. Não generalize o impacto além dos casos demonstrados;
afirmações universais exigem prova que inclua os limites do domínio. Considere
arredondamento e valores especiais quando relevantes; sem prova geral, descreva
o impacto com exemplos concretos, sem afirmar que vale para todas as entradas.
Indique o que foi
verificado e os limites. Se não houver
achados, diga isso sem afirmar que o código está livre de defeitos.
