---
description: Evoluir documentos existentes e criar somente o que falta.
---

# Documentação sem perder o contexto

O pacote instala as skills e suas ferramentas. O agente usa esses recursos
para ler o projeto, propor complementos e editar os documentos autorizados.

## Começar pelo que existe

Depois de instalar o kit, peça ao seu agente:

```text
Use atualizar-documentacao. Primeiro inventarie e leia os documentos existentes.
Proponha complementos por arquivo, preservando conteúdo, nomes e decisões.
Organize por índices e links; crie apenas documentos que realmente faltam.
```

O inventário pode ser consultado na raiz do projeto:

```console
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

O campo `documentation` lista documentos encontrados, possíveis papéis e
limitações da busca. Os papéis são indícios: o agente ainda precisa ler e
confirmar o conteúdo. Um nome como `ARCHITECTURE.md` pode servir ao design;
não é necessário renomeá-lo nem recriá-lo em outra pasta.

## Planejar o complemento

| Situação | Ação |
| --- | --- |
| Documento já suficiente | Manter e registrar ausência de impacto. |
| Falta uma informação comprovada | Acrescentar à seção apropriada. |
| Documentos difíceis de encontrar | Criar ou completar índices e links. |
| Documento necessário não existe | Combinar caminho e criar só o necessário. |
| Decisão não encontrada ou contraditória | Perguntar antes de escrever. |

Os templates ajudam a identificar lacunas. Não substituem documentos
existentes. Preserve suas seções, âncoras, fatos e decisões; repetir o fluxo
não deve duplicar conteúdo. Não mova nem exclua arquivos para padronizar.

## Projeto novo ou existente

Em projeto existente, aproveite README, guias, ADRs e documentos de produto.
Preparar o ambiente ou melhorar a documentação não exige reiniciar o produto.

Em projeto novo, descubra produto e experiência antes de arquitetura e specs.
Enquanto o objetivo for apenas configurar agentes, mantenha os modelos sem
inventar PRD, tecnologia ou aprovação. Siga o [fluxo de trabalho](workflow.md).

## Conferir o resultado

Revise o diff e os links. Confirme que o conteúdo anterior foi preservado,
que arquivos fora do plano não mudaram e que não surgiram decisões inventadas.
Use `verificar-trabalho` e `revisar-entrega`; salve as provas em `.agent-tests/`.

[Wiki](../README.md) · [Skill compartilhada][skill] · [Testes][tests]

[skill]: ../../.pbai4devs/skills/projeto/atualizar-documentacao/SKILL.md
[tests]: ../../tests/README.md
