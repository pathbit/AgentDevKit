---
name: configurar-projeto
description: Prepara um projeto e configura a tecnologia após decidir o produto.
---

# Configurar projeto

Inspecione somente este repositório. Se a intenção for rodar ou reparar um
projeto existente na máquina, use `preparar-dev`; não reinicie seu planejamento.
Enquanto o usuário configurar apenas os agentes, mantenha modelos em
`.pbai4devs/templates/`, sem criar produto, `docs/` ou aplicação.
Antes das ferramentas, confira a seleção de clientes no pedido ou estado do kit.
Se faltar, pergunte quais usa e aplique pela CLI com `--agents` ou `agents`.
Não deduza pelo aplicativo, SO ou pastas; sem resposta disponível, use `all`.
Depois, siga `instalar-ferramentas`: confira Node/npm antes dos scripts, prepare
as ferramentas e rode o diagnóstico. Isso não escolhe a stack da aplicação.

## Preparar o projeto

Antes de criar estado ou documentos, faça o inventário de `atualizar-documentacao`.
Mapeie os documentos já existentes aos seus papéis, sem reiniciar o produto.
Reúna dúvidas no início e aproveite decisões existentes. Quando o projeto
começar, crie ou retome `.pbai4devs/state/configuracao/ESTADO.md` pelo modelo.
Combine os arquivos `prd`, `ux_ui`, `design`, `roadmap` e diretórios `releases`,
`specs`, `tarefas` e documentos de apoio aplicáveis. Crie/evolua o README
da raiz pelos [modelos da fase](../../../templates/README.md), preservando os
fatos existentes; cada pasta de documentos terá seu README. Registre evidências
da preparação e encaminhe a
`criar-prd` → `criar-ux-ui` → `criar-design-doc` → roadmap → spec.
Não escolha stack nem inicialize código antes dessas decisões.

## Configurar a tecnologia

Exija PRD, design e spec aprovados; UX/UI aprovado ou não aplicável com
justificativa aprovada. Siga o plano aprovado em `implementar-spec`, respeitando
aprovações já dadas.

1. Use `executar-script` com `inspecionar-projeto` e `diagnosticar-ambiente`
   para identificar estrutura, SO, arquitetura e ferramentas.
   Reúna as perguntas do [modelo de ambiente][ambiente]
   antes de instalar. Decisões materiais faltantes voltam ao design.
2. Prepare as ferramentas definidas em `.pbai4devs/tools/<nome>/TOOL.json` com
   `preparar-ferramentas`; confira versões e compatibilidade com SO/arquitetura.
   Reutilize instalações e lockfiles; não repita init nem troque a stack.
3. Aplique a [estrutura e o ambiente obrigatórios][estrutura],
   preenchendo os modelos de Makefile, Compose e dockerignore. Configure os
   serviços reais, healthchecks, portas, volumes e comandos da tecnologia.
4. Configure VS Code e recomende EditorConfig, sem regras conflitantes.
   Termine `.gitignore` com o modelo CUSTOM IGNORE e os padrões da tecnologia;
   confirme que templates, scripts, testes e fixtures continuam versionáveis.
5. Documente versões, estrutura, setup, comandos, origem do template/init e
   decisões no README/estado. Use `atualizar-documentacao` para contribuição,
   configuração e ADRs aplicáveis. Preserve arquivos e convenções existentes.
6. Use `verificar-trabalho`: valide Compose, build, saúde dos serviços e testes
   acordados; confira a estrutura com `inspecionar-projeto --check`.
   Com aplicação, prove o fluxo real no navegador/desktop conforme
   seu tipo; sem aplicação, registre a prova funcional pendente. Marque
   `configuracao_tecnica: concluido` somente com evidência da configuração.

Após alterações técnicas, conclua `revisar-entrega`. Sincronize apontamentos
somente quando recursos dos agentes forem alterados.

[ambiente]: ../../../templates/ambiente-local/TEMPLATE.md
[estrutura]: ../../../rules/ambiente-local/RULE.md
