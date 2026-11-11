---
description: Testes do pacote, instalação e distribuição do AgentDevKit.
---

# Testes do pacote

Execute `npm test` na raiz. Testes e fixtures são versionados; resultados
temporários ficam em `.agent-tests/`. `npm run test:distribution` testa o
pacote real, incluindo instalação, atualização e preservação de arquivos.
Estes testes não são copiados para os projetos atendidos.
