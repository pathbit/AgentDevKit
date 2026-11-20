---
name: verificar-trabalho
description: Comprova uma alteração pronta com testes e execução real e registra evidências por critério.
---

# Verificar trabalho

Reúna critérios, impacto e provas existentes. Reutilize provas do mesmo estado
e ambiente quando cobrirem o critério. Execute o que faltar ou estiver desatualizado.
Use `executar-script` para identificar ferramentas e
`usar-skills-externas` para referências pertinentes à stack existente.
Quando precisar definir os casos, use
[planejar-qa](../../qualidade/planejar-qa/SKILL.md). Para uma suspeita de falha
específica, use [validar-adversarial](../../qualidade/validar-adversarial/SKILL.md).

1. **Estrutura:** para recursos dos agentes, execute `verificar-recursos`;
   ele confere espelhos, frontmatter/H1 e links, além do Markdown lint quando
   instalado. Sincronize os apontamentos antes da verificação.
2. **Comportamento:** execute testes relevantes, lint, tipos e build definidos
   no projeto; para automações dos agentes, execute `testar-infraestrutura`.
   Ao alterar catálogo, sincronizador, instalador ou cópia de projetos, execute
   também `testar-maturidade run` e confira os cenários na pasta temporária informada.
   Confira resultados e códigos de saída; não instale ferramentas
   ou invente metas de cobertura sem decisões do projeto.
3. **Navegador:** obrigatório para alterações que afetem a web. Abra a URL
   real e percorra o fluxo na matriz de navegadores do projeto. Confira
   resultados visíveis, console e rede em desktop e celular quando aplicável.
   Siga o [comando testar-navegador][navegador] para escolher a ferramenta.
4. **Desktop/artefato:** abra a aplicação ou o arquivo gerado com a ferramenta
   adequada, como agent-desktop ou um conector compatível; execute o fluxo
   afetado ou renderize e inspecione o resultado.

Relate cada critério como **passou**, **falhou** ou **não verificado**, com
evidência e limites. Se uma prova foi pulada, registre o motivo e o ambiente
ou recurso necessário para executá-la. Comportamento só passa com execução
que cubra o critério inteiro. Inspeção estática, fixtures e capturas podem
complementar a prova.
Se estiver validando, devolva falhas ao responsável pela implementação.
Quem implementa resolve falhas no escopo e versiona testes e fixtures.
Mantenha resultados em destino ignorado. Use IDs como AC-001 e salve as provas em
`.agent-tests/<referencia>/<execucao>/`. Devolva as provas ao fluxo que
solicitou a verificação. Revisão pendente ou critério sem prova impedem
concluir uma entrega.

Para o catálogo Vercel, execute o teste funcional
`node .pbai4devs/scripts/preparar-ferramentas/tests/SMOKE_VERCEL.mjs` após instalar
as ferramentas citadas nele. Ele verifica descoberta, shell virtual e roteiros;
probes de Portless não comprovam proxy/TLS, nem dry-run comprova vídeo gravado.

[navegador]: ../../../commands/testar-navegador/COMMAND.md
