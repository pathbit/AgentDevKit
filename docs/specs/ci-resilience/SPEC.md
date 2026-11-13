---
description: Execução portátil e publicação confiáveis após falhas do CI.
---

# Confiabilidade da pipeline

As verificações devem identificar a causa das falhas e oferecer margem para
runners de velocidades diferentes, sem reduzir a cobertura nem liberar um
pacote antes da aprovação de todos os jobs.

## Critérios de aceite

- AC-001: Os testes portáteis executam em grupos independentes no Windows e
  no macOS; uma falha em qualquer grupo reprova o CI. O comando local continua
  executando todos os grupos e as suítes críticas permanecem cobertas.
- AC-002: Processos de teste e publicação reportam erros e sinais úteis sem
  expor credenciais. Tempo esgotado continua sendo falha.
- AC-003: A release aguarda o CI pelo período configurado com margem para a
  duração e a fila; continua exigindo o artefato do commit e da tentativa
  aprovados e não aceita CI falho ou de outra origem.
- AC-004: Linux, Windows e macOS executam as verificações do CI real; os dois
  registros recebem e verificam o mesmo pacote aprovado, se houver release.
- AC-005: A documentação explica os perfis e como repetir todos os jobs ao
  recuperar o artefato de uma tentativa anterior.

## Verificação

Execute testes de regressão dos limites, falhas, grupos e publicação, além do
perfil completo local. Acompanhe os runners reais e a release até a conclusão;
registre resultados e revisão independente no gate de entrega.
