---
description: Isolar backups do instalador com um diretório privado em POSIX.
status: aprovado
---

# Diretório privado de backup

O instalador preserva o modo dos arquivos copiados, mas uma cópia pode perder
a proteção da pasta original. Este incremento, autorizado pelo usuário, mantém
o contrato de modos da [spec histórica](../v0.0.8/SPEC.md) e cria cada backup
em uma pasta exclusiva com modo inicial `0700` em POSIX, sujeito ao `umask`.
O [PRD](../../product/prd.md), a [UX](../../product/ux-ui.md), o
[design](../../product/design.md) e o [roadmap](../../product/roadmap.md)
permanecem válidos. A release ainda não foi escolhida.

Criar a pasta exclusiva antes da primeira cópia e antes de alterar conteúdo do
projeto; criar também cada ancestral ausente com modo `0700`, sujeito ao
`umask`. Uma falha impede essas alterações. Não alterar modos ou conteúdo de
pastas existentes, arquivos Git ou `.gitignore`. Preservar os modos dos
arquivos copiados, criar subpastas privadas e arquivos exclusivamente, e
retornar o caminho relativo; o identificador é opaco e pode
variar. Sem arquivos anteriores, não criar uma pasta de backup. Após falha,
resíduos vazios ou parciais são preservados.

O isolamento depende das permissões efetivas, inclusive ACLs, proprietários e
segurança dos ancestrais; modo POSIX não demonstra sigilo contra o proprietário,
usuários privilegiados ou quem já pode acessar a pasta. A prova não garante
proteção no Windows ou contra troca concorrente de diretórios. O sync direto e
a recuperação concorrente continuam fora deste incremento. Backups podem ainda
ser expostos ao Git conforme as regras do projeto. Em POSIX, se o sistema de
arquivos informar permissões amplas para a raiz criada, recusar com `E_BACKUP`;
alguns volumes sem suporte adequado a modos POSIX podem impedir a operação.

## Critérios de aceite

- **AC-001:** Com máscaras `000`, `022` e `077`, um backup de arquivo `0640`
  protegido pela pasta original tem uma nova raiz `0700` ou mais restrita;
  o modo e os bytes da cópia permanecem iguais aos originais. Testar em POSIX
  com projeto sintético e registrar logs em `.agent-tests/backup-privado/`.
- **AC-002:** Pastas e arquivos humanos preexistentes são preservados; sem
  arquivos anteriores não há pasta nova de backup. Falhas de criação ou cópia
  impedem alterações planejadas. Testar modos, bytes e índice Git preparado.
- **AC-003:** Regressões de instalação, modos e preservação passam em macOS e
  Linux; validar Windows em execução real ou registrar como não verificado.
  Testes não comprovam ACLs ou segurança em sistemas de rede.

A recuperação conservadora, testes estritos, revisão independente e validação
multiplataforma continuam necessários antes de qualquer publicação.
