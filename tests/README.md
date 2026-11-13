---
description: Testes do pacote, instalação e distribuição do AgentDevKit.
---

# Testes do pacote

Execute `npm test` na raiz. Código de testes e fixtures são versionados;
projetos gerados, clones e resultados ficam em `tmp/`, `.agent-tests/`,
`examples/generated/` ou em diretório temporário fora do repositório, sem subir
ao Git.
`npm run test:distribution` testa o
pacote real, incluindo instalação, atualização e preservação de arquivos.
Estes testes não são copiados para os projetos atendidos.

`resource-coverage.test.mjs` confere as referências geradas para os clientes e
as combinações de seleção. A cobertura estrutural não prova que cada recurso
foi executado em todos os clientes; valide também descoberta e uso real.

Para verificar o pacote publicado em projetos reais, execute:

```console
npm run test:oss -- --version 0.0.13
```

O teste clona os commits fixos da [matriz](fixtures/oss-projects.json):
Hibernate ORM, EF6, Rust, Go, Tailcat, Express, Requests, Zod e Chi.
Confere arquivos, permissões, links, staging, instalação, atualização e ignores.
Inclui uma skill própria, uma referência Markdown curta, configuração local
e um agente humano com nome igual ao do kit. Confere também a sincronização
independente e `--force` sem remover esses recursos.
Clones e evidências ficam em `tmp/oss-compatibility/`, ignorado pelo Git.
Exige rede; não roda no `npm test` padrão nem executa as aplicações clonadas.
Use `--project express` para um caso e `--help` para todas as opções.
Para testar um candidato local, acrescente `--tarball caminho/pacote.tgz`
e informe sua versão. O relatório distingue candidato de pacote público.
Um bloqueio por configuração preexistente aparece no relatório como falha,
com os arquivos preservados; não equivale a uma instalação bem-sucedida.
O processo retorna `1` se algum cenário falhar ou bloquear. No Zod, confere
a preservação dos links `CLAUDE.md`, `README.md` e `.codex/skills`, enquanto
os apontamentos disponíveis são instalados nas demais rotas nativas.
O EF6 pode bloquear a instalação quando uma exceção do `.gitignore` existente
expõe caches de testes; o diagnóstico preserva esse arquivo e o índice Git.

## Fluxo documental

```console
npm run test:docs -- --version 0.0.13
```

O runner reutiliza a matriz OSS e consulta o inventário do pacote instalado.
Registra um plano aditivo, acrescenta um trecho controlado a um README regular
e cria um índice de links. Depois repete a manutenção do kit e compara conteúdo,
arquivos fora do plano e Git. Também verifica um projeto vazio sem inventar PRD,
design ou aprovação. Aceita `--tarball` para validar um candidato.

Esses complementos são fixtures do harness: comprovam inventário e preservação,
não a qualidade da autoria autônoma por um modelo. Um exercício real do agente
deve ler a skill e a documentação, propor o complemento e passar pela revisão.
