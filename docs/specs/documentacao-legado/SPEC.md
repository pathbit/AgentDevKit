---
description: Descoberta e documentação do comportamento de um sistema existente.
status: rascunho
---

# Documentar um sistema legado

A equipe precisa recuperar conhecimento do código e dos testes e registrar
o resultado nos documentos que já usa. O objetivo inicial decide se vale
mapear comportamento, preparar o ambiente ou planejar uma evolução.

## Critérios de aceite

- **AC-001** A pergunta inicial e a opção explícita encaminham o propósito de
  documentação. `next --intent document` indica o levantamento e, quando
  instalado, a skill responsável. Execução não interativa continua possível.
- **AC-002** A CLI gera um rascunho em Markdown e dados em JSON antes ou após
  instalar o kit. Registra evidências e lacunas dentro de limites de busca.
  Preserva o código, os documentos e o estado Git. Respeita a recuperação.
- **AC-003** A skill, o comando e o perfil documentador reutilizam documentos
  e modelos nativos. Um fluxo legado é documentado com referências cruzadas
  entre comportamento, código e testes. Inferências ficam identificadas.
- **AC-004** O pacote passa pela revisão de recursos, testes da CLI, ensaios
  em projetos existentes e novos e verificação de distribuição.
