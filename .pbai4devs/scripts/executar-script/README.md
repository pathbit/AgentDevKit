---
description: Executor comum dos scripts Node do projeto.
---

# Executar script

Use Node 24+ com o nome de uma pasta em `.pbai4devs/scripts/`, uma pasta do
repositório ou o caminho de um arquivo `.mjs`. O comando funciona nos três SOs:

```console
cd .pbai4devs/scripts/preparar-ferramentas
node BOOTSTRAP.mjs --executar --plan preparar-ferramentas
node BOOTSTRAP.mjs --executar preparar-ferramentas list
cd ../../..
```

`--executar` prepara Node/npm, diagnostica e só então chama o seletor. Falha
no diagnóstico interrompe a operação, inclusive se houver configuração de
ferramenta inválida sem relação com o alvo; inspecione a falha. Diagnóstico com
sucesso indica inventário concluído, não que todas as dependências do alvo estão
prontas. Com `--no-install`, o bootstrap usa o runtime atual, o primeiro Node
do PATH ou o cache, desde que compatível, sem baixar ou instalar o runtime.
Essa opção não restringe rede nem
instalações pelo diagnóstico ou script filho. O plano também não baixa, instala
nem diagnostica, e usa as mesmas opções de runtime.
O alvo, seus argumentos e o código de saída são preservados.
Na saída padrão, `--executar` reúne o caminho do runtime, o diagnóstico, o
cabeçalho do seletor e a saída do alvo; ela não é um JSON único nem uma saída
bruta do alvo. O seletor direto também inclui seu próprio cabeçalho.

Com Node 24+ já disponível, o seletor pode ser chamado diretamente:

```console
node .pbai4devs/scripts/executar-script/SCRIPT.mjs --plan preparar-ferramentas
node .pbai4devs/scripts/executar-script/SCRIPT.mjs preparar-ferramentas list
```

`--plan` mostra o arquivo sem executá-lo. Os argumentos e o código de saída
são preservados; falhas não tentam outro runtime. Scripts shell/Python e links
simbólicos são recusados. Arquivos `.js`/`.cjs` existentes usam o mesmo Node.

Com Node 18+, o [bootstrap JavaScript](../preparar-ferramentas/BOOTSTRAP.md)
aceita `--runtime-only` e prepara Node 24+ antes da operação solicitada.
Sem Node/npm, o agente instala primeiro o runtime pelo mecanismo do SO.
O modo padrão do bootstrap prepara também as ferramentas; reserve-o ao setup.

`testar-navegador` mantém o executor Playwright indicado em `SCRIPT.conf`;
sem `--plan`, retorna 69 para o agente usar o conector, sem executar o arquivo.
Quando presente, `SCRIPT.conf` exige uma única entrada `executor=node` ou
`executor=playwright-mcp`; comentários `#` são permitidos. Configurações vazias,
desconhecidas ou duplicadas falham antes de executar qualquer script.
