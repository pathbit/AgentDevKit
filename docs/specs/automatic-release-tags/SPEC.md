---
description: Criação e publicação seguras de tags de versões verificadas.
---

# Tags automáticas de release

## Critérios de aceite

- AC-001: A CI cria `v<versão>` no commit da branch principal somente após
  toda a matriz passar e inicia a publicação do mesmo commit.
- AC-002: Alterações sem nova versão não duplicam publicações; tags existentes
  nunca são movidas e colisões ou regressões de versão impedem a publicação.
- AC-003: A release e os dois pacotes usam o mesmo artefato e a mesma versão
  da tag; a publicação exige o CI completo aprovado.
- AC-004: Testes verificam eventos indevidos, falhas, colisões, retomada e
  corridas sem criar tags ou publicar pacotes reais.
