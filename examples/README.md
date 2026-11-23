---
description: Exemplos locais dos agentes e dos estágios de um projeto.
---

# Exemplos

## Instalação em projetos sintéticos

Estas receitas usam Git, Node.js 24+ e um tarball local criado da cópia atual do
AgentDevKit. O pacote aceita Node.js 18+; com Node 18–23, o launcher pode precisar
preparar Node 24 antes da execução. Para este exemplo offline, use Node 24+; veja
os [pré-requisitos](../docs/guides/prerequisites.md).

Use diretórios temporários fora de qualquer repositório Git. As receitas mostram
a instalação e a consulta ao próximo passo, sem simular aprovação de produto; não
as execute em um projeto real. Use um shell POSIX. As receitas foram verificadas
no macOS; a execução no Windows com Git Bash ainda não foi validada.

Na raiz do AgentDevKit, crie uma pasta temporária para o pacote e use o caminho
impresso no comando seguinte:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-pacote-')))"
npm pack --offline --ignore-scripts --pack-destination "<pasta-do-pacote>"
```

Substitua `<pacote-local.tgz>` abaixo pelo caminho absoluto do arquivo gerado.
O tarball pode conter mudanças locais ainda não publicadas; estas receitas não
comprovam o comportamento da versão publicada. O modo offline limita o npm,
mas não impede acesso à rede por outros processos. Para a instalação pública,
consulte o [guia de instalação](../docs/guides/installation.md).

### Projeto novo

Crie outra pasta temporária com o primeiro comando e entre no caminho impresso.
Confirme que ela está fora de qualquer repositório Git antes de inicializá-la:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-novo-')))"
cd "<pasta-do-projeto-novo>"
git init
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit init --agents codex,claude --lang pt --yes
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit next --intent product --lang pt --json
```

Consulte a skill indicada no campo `next` e responda às perguntas para preparar
o projeto e definir o produto. A instalação não cria PRD nem aprova decisões.

### Projeto existente

Crie outra pasta temporária, confirme que está fora de qualquer repositório Git,
entre nela e gere apenas os arquivos fictícios:

```sh
node -e "const f=require('node:fs'),o=require('node:os'),p=require('node:path');console.log(f.mkdtempSync(p.join(o.tmpdir(),'adk-existente-')))"
cd "<pasta-do-projeto-existente>"
git init
node -e "const f=require('node:fs');\
f.mkdirSync('.claude');\
f.writeFileSync('AGENTS.md',\
'# Instruções existentes\n\nRegra sintética preservada.\n');\
f.writeFileSync('.claude/settings.json',\
JSON.stringify({env:{EXEMPLO:'local'}},null,2)+'\n');\
f.writeFileSync('.gitignore','cache-do-projeto/\n');\
f.writeFileSync('exemplo.txt','conteúdo preparado\n')"
git add -- exemplo.txt
git diff --cached -- exemplo.txt
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit init --agents codex,claude --lang pt --yes
npm exec --offline --yes --package "<pacote-local.tgz>" -- \
  agentdevkit next --intent run --lang pt --json
git diff --cached -- exemplo.txt
```

Confira `AGENTS.md`, `.claude/settings.json` e `.gitignore` na pasta
sintética e compare as duas saídas de `git diff --cached`. A orientação humana
deve continuar presente, mesmo se o kit acrescentar um bloco ao `AGENTS.md`;
as outras configurações e o conteúdo preparado devem ser preservados. Use a
skill indicada em `next` para a etapa pendente e, ao preparar a execução de um
projeto existente, siga `preparar-dev`.

Os comandos geram pastas novas e não removem exemplos anteriores. O código de
aplicações e os dados desses projetos são fictícios e não fazem parte do Git do
AgentDevKit.

## Dois projetos do zero, com três specs

Os exemplos criam uma API HTTP de tarefas em memória e uma calculadora de
terminal. Cada projeto recebe PRD, decisão de UX, design e roadmap; depois,
cada uma das três specs é escrita, implementada e testada em sequência.
São produtos didáticos: aprovações e revisão são simuladas e não substituem
decisões nem revisão humana em um projeto real.

Na raiz deste repositório, com Git, rede e Node.js 24+ com npm:

```sh
node tests/example-workflows.mjs
```

O comando instala a versão pública do `@pathbit/agentdevkit` indicada no
`package.json` deste repositório, com os
clientes Codex, Claude e Copilot em dois projetos Git novos. Cria uma pasta
exclusiva no diretório temporário do sistema, fora de Git, e informa o caminho
do relatório.
Nenhuma pasta anterior é apagada. Para testar outra versão publicada, passe o
número da versão como argumento.

Para validar um tarball local sem consultar o registry npm, use
`node tests/example-workflows.mjs 0.0.30 --tarball /caminho/pacote.tgz`.
Informe a versão exata do tarball; sem versão, usa a de `package.json`.
O modo offline do npm não bloqueia rede de outros processos. `--output` aceita
uma pasta nova com pai existente, fora de Git ou em `tmp/`, `temp/`,
`.agent-tests/` e `examples/generated/` da origem, desde que ignorada e sem
arquivos staged. `git add -f` ou mudanças concorrentes nas regras de ignore
podem versionar os exemplos.

1. Abra `REPORT.json` na pasta informada e escolha `api-tarefas` ou
   `cli-calculadora`.
2. Leia `docs/PRD.md`, `docs/UX.md`, `docs/DESIGN.md` e `docs/ROADMAP.md`.
3. Leia `docs/specs/01/SPEC.md`, `02/SPEC.md` e `03/SPEC.md`; os testes de
   cada etapa ficam em `tests/` e os resultados em `.agent-tests/`.
4. Dentro do projeto escolhido, rode `node --test tests/*.test.mjs`. Para a
   calculadora, experimente `node src/calc.mjs sum 2 3` e
   `node src/calc.mjs mean 2 4`.

A API é exercitada em uma porta local temporária pelos testes; ela não persiste
dados e não é um serviço pronto para produção. O código do gerador é versionado;
por padrão, projetos, caches e relatórios ficam fora do checkout do AgentDevKit.

### Reproduzir manualmente com um agente

Crie uma pasta temporária fora de qualquer repositório Git e entre nela. O comando
abaixo imprime um caminho novo; use `cd` com o caminho retornado:

```sh
node -e "const fs=require('node:fs'),os=require('node:os'),p=require('node:path');console.log(fs.mkdtempSync(p.join(os.tmpdir(),'agentdevkit-manual-')))"
```

Confirme que a pasta escolhida não pertence a um repositório Git e execute:

```sh
git init
npm init -y
npx --yes @pathbit/agentdevkit init --agents codex,claude,copilot --lang pt --yes
```

No agente escolhido, execute as etapas e responda às perguntas antes de avançar:

1. Peça `configurar-projeto`, depois `criar-prd`: defina uma API para criar e
   listar tarefas em memória. Use `criar-ux-ui` para justificar a ausência de
   interface visual e `criar-design-doc` para decidir o desenho técnico.
2. Peça `gerenciar-roadmap` para ordenar três incrementos: saúde da API,
   criação de tarefas e listagem de tarefas. Revise as decisões propostas.
3. Para cada incremento, peça `criar-spec`, responda às dúvidas e revise os
   critérios. Peça `implementar-spec` e valide os testes antes da próxima spec.
4. Compare seus arquivos e resultados com `api-tarefas` no exemplo automático.
   Para repetir com a calculadora, use as specs soma, média e validação de entrada.

As decisões do projeto manual são suas; o gerador automático usa dados sintéticos.

## Projetos reais existentes

Para verificar a instalação em clones públicos fixados, na raiz do repositório:

```sh
npm run test:oss
```

A [matriz de projetos](../tests/fixtures/oss-projects.json) registra os commits
de Hibernate ORM, EF6, Rust, Go, Tailcat, Express e Requests, além de Zod e Chi.
Para um projeto só, use por exemplo `npm run test:oss -- --project express`.
Os clones e relatórios ficam em uma pasta nova dentro de `tmp/oss-compatibility/`.
O teste valida o kit, incluindo preservação de arquivos e índice Git; ele não
compila nem executa as aplicações clonadas. Requer rede e pode baixar projetos
grandes. Para outras opções e limites, consulte [testes](../tests/README.md).

## Cenários de maturidade

Na raiz do AgentDevKit, com Node.js 24+ e Git:

```sh
npm run examples
npm run test:examples
```

O primeiro comando prepara oito projetos; o segundo prepara e testa outros
oito em uma pasta temporária nova fora de Git. Cada comando informa o caminho.
Para executar apenas um cenário:

```sh
npm run test:examples -- --case somente-agentes
```

As cópias mostram os clientes selecionados na origem e seus apontamentos:

```text
<pasta temporária>/agentdevkit-maturity-<id>/
├── README.md                    índice dos cenários
├── REPORT.json                  prepared, passed ou failed
└── somente-agentes/
    ├── .pbai4devs/              recursos compartilhados
    ├── .claude/                 apontamentos do Claude
    ├── .codex/                  apontamentos do Codex
    ├── .cursor/                 apontamentos do Cursor
    ├── .github/                 apontamentos do Copilot
    └── .opencode/               apontamentos do OpenCode
```

Com todos os clientes selecionados, o kit também gera `.agents`, `.zcode`,
`.kimi-code`, `.minimax`, `.mimocode` e `.dsh`. Os exemplos podem copiar
configurações existentes do projeto, como `.vscode`. Os templates e assets do
gerador são a fonte versionada.

| Cenário | Conteúdo |
| --- | --- |
| somente-agentes | Recursos compartilhados, sem aplicação |
| descoberta | PRD em rascunho |
| planejado | Produto e design definidos, sem código |
| app-inicial | API com estrutura incompleta |
| app-configurada | API, planejamento e configuração |
| manutencao | Aplicação com histórico sintético de release |
| legado | Layout e configurações preexistentes |
| monorepo | Dois módulos e caminhos com espaços |

Cada execução cria uma pasta própria e preserva projetos e relatórios anteriores,
inclusive arquivos humanos adicionados a eles. Um destino explícito existente
é recusado antes de qualquer alteração.

Os testes exercitam scripts e APIs locais. Aprovações de produto e pareceres
do gate são dados sintéticos; não comprovam revisão humana, Docker, interface
visual, implantação ou outros sistemas operacionais.

Detalhes: [testar maturidade](../.pbai4devs/scripts/testar-maturidade/README.md).
