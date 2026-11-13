---
description: Nome em inglês para a pasta de estado compartilhado.
---

# Pasta de estado

A pasta de primeiro nível passa de `.pbai4devs/estado` para
`.pbai4devs/state`. Ela contém estado de instalação e configuração, não
memória de conversas. Os nomes internos permanecem iguais.

## Critérios de aceite

- AC-001: Instalações novas usam `state` e recursos, documentação, exclusões
  e pacote apontam para ela, sem expor estado local no pacote ou no Git.
- AC-002: A atualização de instalações antigas preserva seleção, idioma,
  decisões, conteúdo humano e permissões; conflitos e links inseguros não
  causam perda ou sobrescrita silenciosa.
- AC-003: Simulação, repetição, falhas e recuperação preservam arquivos,
  índice Git e `.gitignore` do projeto. Scripts independentes identificam
  instalações antigas e novas de forma coerente.
- AC-004: Testes locais, CI em Linux, Windows e macOS e revisão independente
  verificam o comportamento e os limites da migração.
