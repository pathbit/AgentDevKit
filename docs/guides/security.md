---
description: Segurança com scanners locais, triagem e provas de controles.
language: pt
---

# Segurança local

O kit instala skills, regras, comandos e perfis para revisar segurança.
Os scanners exigem preparo explícito; nenhuma auditoria ou aplicação começa
em segundo plano apenas porque os arquivos de instrução foram instalados.

O [guia operacional][guide] acompanha o hub no projeto consumidor. Ele explica
preparo das ferramentas, bases offline, relatório e triagem, além dos testes
manuais de autorização, isolamento de dados, entradas e abuso.

- [Preparar segurança][prepare]: instalar e verificar os scanners locais.
- [Auditar segurança][audit]: analisar o alvo autorizado e interpretar sinais.
- [Revisar autorização][authorization]: testar identidade e acesso por recurso.
- [Modelar ameaças][threats]: antecipar riscos das fronteiras de confiança.
- [Curadoria](security-references.md): fontes, licenças e ferramentas avaliadas.

Use o [mapa do ecossistema](resources.md) para entender como perfis, skills,
comandos, regras e scripts se conectam. Resultados ficam em `.agent-tests/`;
scanners sozinhos não aprovam a segurança de um produto.

[Wiki](../README.md) · [Ferramentas e testes](tools-and-testing.md)

[guide]: ../../.pbai4devs/skills/seguranca/REFERENCE.md
[prepare]: ../../.pbai4devs/commands/preparar-seguranca/COMMAND.md
[audit]: ../../.pbai4devs/commands/auditar-seguranca/COMMAND.md
[authorization]: ../../.pbai4devs/skills/seguranca/revisar-autorizacao/SKILL.md
[threats]: ../../.pbai4devs/skills/seguranca/modelar-ameacas/SKILL.md
