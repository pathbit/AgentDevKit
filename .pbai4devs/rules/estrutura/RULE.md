---
trigger: always_on
description: Organização, concisão e sincronização dos recursos compartilhados.
---

# Estrutura

Use a skill específica ou `criar-recurso`. Reutilize antes de criar. Mantenha
uma origem por recurso, uma pasta por nome e um arquivo principal por tipo.
Escreva instruções curtas; carregue detalhes opcionais só quando necessários.

Após criar, alterar, renomear ou remover recursos do hub, execute
`sincronizar-agentes` e seu `--check`. Registre novos clientes agênticos em
`.pbai4devs/espelhos.conf`, sem registrar tools como destinos de espelhamento.
Documentos de produto fora do hub seguem seus próprios índices; alterá-los
não exige sincronizar os agentes. Os espelhos contêm metadados e apontamentos.
Espelhe apenas os principais `SKILL.md`, `AGENT.md`, `COMMAND.md` e `RULE.md`.
Não replique templates, scripts, tools, estado, testes, docs ou guias.
Repare com `--force` quando necessário: os destinos gerenciados podem ser
sobrescritos e limpos; preserve a origem e os arquivos nativos fora desse escopo.
Cada pasta de primeiro nível de `.pbai4devs` tem um README curto sobre seu uso.
Cada pasta criada em `docs/`, incluindo ancestrais necessários, tem um README
conciso sobre finalidade e público; preserve os arquivos existentes.
Guias `README.md` e `INSTRUCTIONS.md` ficam só em `.pbai4devs`, sem espelhamento.
Automações seguem `executar-script`: identifique SO, runtimes e conectores;
reutilize scripts e ferramentas instaladas antes de gerar código na conversa.
Enquanto configurar os agentes, mantenha os documentos de produto como modelos.
Testes das automações ficam junto de cada script em `tests/`; não crie uma
pasta `.pbai4devs/tests`. Em tools, versione definições e scripts por ferramenta;
downloads e registros ficam em `<nome>/.local/`, cache em `.cache/`, launchers em
`bin/`. Não duplique o instalador nem espelhe esses recursos nas ferramentas.
Mantenha os `.gitignore` locais pelo sincronizador. Ao criar um tipo ou arquivo
fora das listas permitidas, atualize os modelos antes de verificar com Git.
