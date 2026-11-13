---
name: verificar-trabalho
description: Verifica alterações com ferramentas reais e registra evidências por critério de aceite.
---

# Verificar trabalho

Reúna os critérios e o impacto da alteração. Use `executar-script` para
identificar ferramentas disponíveis e selecione os níveis aplicáveis. Use
`usar-skills-externas` para referências pertinentes, sem adotar uma stack nova:
[planejar-qa](../../qualidade/planejar-qa/SKILL.md) organiza casos por risco;
[validar-adversarial](../../qualidade/validar-adversarial/SKILL.md) questiona
as hipóteses e provas relevantes, no ambiente autorizado.

1. **Estrutura:** para recursos dos agentes, execute `verificar-recursos`;
   ele confere espelhos, frontmatter/H1 e links, além do Markdown lint quando
   instalado. Sincronize os apontamentos antes da verificação.
2. **Comportamento:** execute testes relevantes, lint, tipos e build definidos
   no projeto; para automações dos agentes, execute `testar-infraestrutura`.
   Ao alterar catálogo, sincronizador, instalador ou cópia de projetos, execute
   também `testar-maturidade run` e confira os cenários em `examples/generated/`.
   Confira resultados e códigos de saída; não instale ferramentas
   ou invente metas de cobertura sem decisões do projeto.
3. **Navegador:** obrigatório para alterações que afetem a web. Abra a URL real
   com Playwright ou agent-browser em Chrome/Chromium. Percorra o fluxo e
   confira resultados
   visíveis, console e rede em desktop e celular quando aplicável. Prefira os
   testes do projeto; com conector Playwright, reutilize o
   [executor](../../../scripts/testar-navegador/REFERENCE.md).
4. **Desktop/artefato:** abra a aplicação ou o arquivo gerado com a ferramenta
   adequada, como agent-desktop ou um conector compatível; execute o fluxo
   afetado ou renderize e inspecione o resultado.

Não use fixture como prova do produto nem uma captura como única prova
funcional. Sem a ferramenta exigida ou com falhas, marque **não verificado**
ou **falhou**; não declare a entrega verificada. Resolva falhas no escopo.

Versione testes e fixtures. Salve saídas, relatórios e capturas em
`.agent-tests/` ou outro destino ignorado. Relate cada critério como passou,
falhou ou não verificado, com evidência e limitações.
Para uma entrega, use IDs AC-001 e organize as provas em
`.agent-tests/<referencia>/<execucao>/`. Encaminhe os resultados ao comando
`revisar-entrega`; revisão pendente ou critério sem prova impedem a conclusão.

Para o catálogo Vercel, execute o teste funcional
`node .pbai4devs/scripts/preparar-ferramentas/tests/SMOKE_VERCEL.mjs` após instalar
as ferramentas citadas nele. Ele verifica descoberta, shell virtual e roteiros;
probes de Portless não comprovam proxy/TLS, nem dry-run comprova vídeo gravado.
