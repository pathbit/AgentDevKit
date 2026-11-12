---
description: Testes do pacote, instalação e distribuição do AgentDevKit.
---

# Testes do pacote

Execute `npm test` na raiz. Testes e fixtures são versionados; resultados
temporários ficam em `.agent-tests/`. `npm run test:distribution` testa o
pacote real, incluindo instalação, atualização e preservação de arquivos.
Estes testes não são copiados para os projetos atendidos.

Para verificar o pacote publicado em projetos reais, execute:

```console
npm run test:oss -- --version 0.0.8
```

O teste clona os commits de [Express, Zod e Chi](fixtures/oss-projects.json).
Confere arquivos, permissões, links, staging, instalação, atualização e ignores.
Uma referência Markdown curta também comprova a preservação de arquivos
humanos.
Clones e evidências ficam em `tmp/oss-compatibility/`, ignorado pelo Git.
Exige rede; não roda no `npm test` padrão nem executa as aplicações clonadas.
Use `--project express` para um caso e `--help` para todas as opções.
Para testar um candidato local, acrescente `--tarball caminho/pacote.tgz`
e informe sua versão. O relatório distingue candidato de pacote público.
Um bloqueio por configuração preexistente aparece no relatório como falha,
com os arquivos preservados; não equivale a uma instalação bem-sucedida.
O processo retorna `1` se algum cenário falhar ou bloquear. No commit fixado
do Zod, `CLAUDE.md` é um link simbólico e a instalação é recusada sem removê-lo.
