---
description: Desenvolvimento e verificação do AgentDevKit.
---

# Contribuir

Use Node.js 24+ e npm. A aplicação está em `src/` e `bin/`; recursos
distribuídos ficam em `.pbai4devs`. Altere a fonte e seu adaptador, mantendo
os arquivos gerados sob responsabilidade da sincronização.

```sh
npm ci
npm test
npm run test:infra
npm run check
npm pack --ignore-scripts
```

Teste alterações em diretórios isolados, com projetos vazios e existentes.
Inclua preservação de arquivos próprios e resultados repetidos. Distribuição
precisa ser testada pelo tarball real, sem depender do checkout.

Versione código de testes, fixtures e modelos. Mantenha resultados, tarballs,
capturas, instalações de ferramentas e credenciais fora do Git. O diretório
`.agent-tests/` é reservado para essas evidências locais.

Atualize documentos afetados e indique limites das verificações. A publicação
de uma release exige os critérios da spec e revisão concluídos; executar
`npm pack` apenas prepara o arquivo e não publica no npm ou GitHub.
