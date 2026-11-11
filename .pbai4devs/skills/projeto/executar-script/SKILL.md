---
name: executar-script
description: Identifica ferramentas instaladas e executa scripts pelo interpretador compatível.
---

# Executar script

No início, confira Node.js 24+ e npm. Com Node 18+, execute o
[bootstrap JavaScript](../../../scripts/preparar-ferramentas/BOOTSTRAP.md)
com `--runtime-only` para preparar o núcleo. Sem Node, instale-o primeiro
pelo mecanismo nativo do SO. Preserve a operação originalmente solicitada.
Faça o preparo pelo usuário e reutilize o caminho absoluto informado, sem
depender de PATH global. Execute
`diagnosticar-ambiente` pelo seletor de [scripts](../../../scripts/README.md).
Reutilize a verificação enquanto o ambiente não mudar.

Prefira scripts existentes a reconstruir automações na conversa. Use
`--plan <nome-ou-caminho>` para consultar a execução e confira pré-requisitos,
efeitos e autorização da tarefa. Depois execute com os argumentos originais.
Após o preparo, automações usam `.mjs`, iguais em todos os sistemas. O seletor usa
o Node atual, preserva argumentos e códigos de saída e não instala dependências.

Se indicar `playwright-mcp`, use o conector conforme a
[referência](../../../scripts/testar-navegador/REFERENCE.md). Não execute esse
arquivo como Node. Sem o conector exigido, informe o pré-requisito.

Versione automações reutilizáveis e seus testes; salve somente diagnósticos,
relatórios e capturas em `.agent-tests/`. Resuma comando, resultado e falhas;
leia saídas completas apenas para investigar problemas.
