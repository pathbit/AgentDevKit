---
description: Backup privado e manifesto verificável para a recuperação conservadora.
status: aprovado
---

# Backup e manifesto de recuperação

Este componente isolado prepara cópias do snapshot fornecido pelo chamador e
entrega o hash do manifesto para o [diário](../diario-disco/SPEC.md). A
autorização geral do usuário cobre o incremento. Não altera CLI, sync ou
projetos consumidores; não corrige o rollback. O [PRD](../../product/prd.md),
a [experiência](../../product/ux-ui.md), o [design](../../product/design.md)
e o [roadmap](../../product/roadmap.md) permanecem válidos.

O chamador fornece uma pasta privada, confiável, existente e vazia e uma lista
de entradas com caminho relativo, ação (`create`, `update`, `remove`, `retain`),
tipo anterior (`file`, `directory`, `absent`), modo e bytes de cada arquivo.
O componente valida tudo antes da primeira escrita: caminhos portáveis com
checagem conservadora de caixa e componentes `.git` e `.agent-tests`, entradas únicas,
tipos e ações coerentes, modos POSIX, bytes sem `SharedArrayBuffer` e limites de
4.096 entradas, 32 MiB por arquivo, 128 MiB no total e 4 MiB no manifesto.
Recusar formato ou conteúdo desconhecido, sem imprimir nomes ou bytes.
Também recusar caracteres e nomes reservados, espaços ou pontos finais e
componentes longos. A comparação de caixa e normalização não substitui uma
prova de aliases em cada sistema de arquivos e pode recusar nomes distintos.
Ela rejeita os aliases Unicode reproduzidos para `ß`, sigma e `ſ`, mas não
implementa todo o [case folding Unicode][case-folding] nem a comparação nativa
de cada volume. A integração deve recusar o que não puder validar com segurança.

Gerar cópias exclusivas em `blobs/`, com nomes numéricos independentes dos
caminhos do projeto. Em POSIX, a pasta nasce com `0700`, sujeito ao `umask`;
cada cópia nasce com até `0600` e recebe modo `0600` antes do `fsync`. O modo
original fica no manifesto. Sincronizar cada cópia,
a pasta e o manifesto antes de retornar. O manifesto canônico UTF-8 contém os
caminhos, ações, tipos, modos, tamanhos, hashes SHA-256 e nomes das cópias. Seu
hash completo, inclusive a quebra de linha final, identifica o conteúdo a ser
informado ao diário. Não sobrescrever nem remover resíduos após falhas.
Se a sincronização falhar depois da gravação do manifesto, ele pode permanecer
visível e até verificável apesar do erro; isso não transforma a preparação em
sucesso nem comprova durabilidade.

Uma verificação separada recebe o hash esperado e rejeita dados truncados,
alterados, não canônicos, entradas extras, links, permissões amplas ou tipos
inesperados. Ela exige `0700` em `blobs/`, `0600` nos arquivos e confere
tamanho e hash das cópias, sem restaurar arquivos.
Quando o Node informa o usuário efetivo, a pasta e as cópias devem pertencer a
esse usuário. Proprietário original, grupo, ACLs, atributos extras, datas e
bits especiais do projeto não são registrados neste componente.
O modo fornecido deve estar entre `0000` e `0777`; se o original tiver bits
especiais, o planejador deve identificá-los e não descartá-los silenciosamente.
Resultados e erros não expõem conteúdo ou nomes. A leitura pode atualizar
metadados de acesso. No Windows, preparação e verificação são recusadas até
validação real; ACLs, ancestral seguro e resistência a quedas de energia não
são comprovados pelos bits POSIX ou pelo `fsync`.

O componente não lê o projeto nem prova que o snapshot é completo, atual ou
que arquivos com hardlinks, links simbólicos ou tipos especiais foram tratados
com segurança pelo planejador. O manifesto registra ações, mas não contém o
conteúdo ou hash planejado para depois da operação. Ele não fornece autenticação,
restauração, retenção ou exclusão de dados. A verificação não pode detectar
uma substituição conjunta do manifesto e do hash por quem os controla. As
rechecagens detectam algumas alterações durante a leitura, mas não tornam o
backup uma visão atômica de um diretório sujeito a escritores concorrentes. Antes
da integração, esses limites, a identificação do projeto, a captura completa
e a coordenação com processos antigos precisam ser resolvidos.
O formato atual recusa um arquivo anterior com descendentes, inclusive uma
troca planejada de arquivo por diretório. Um `umask` que retire acesso do dono
pode impedir a escrita e deixar um resíduo privado, que não é removido.

## Critérios de aceite

- **AC-001:** Preparar e verificar snapshot sintético com arquivos vazios e
  binários, diretórios e ausências preserva bytes e modos no manifesto, sem
  modificar os arquivos públicos da fixture.
- **AC-002:** Entradas inválidas, colisões, paths perigosos, formatos não
  suportados e limites são recusados antes de escrever. Falhas posteriores
  preservam resíduos, não sobrescrevem outros arquivos e não produzem sucesso.
- **AC-003:** Modificação, truncamento, remoção, link ou arquivo extra no
  backup e manifesto incorreto são detectados, sem divulgar conteúdo.
- **AC-004:** Um teste associa o hash verificado ao `begin` do diário; ele não
  afirma que a CLI usa esse mecanismo nem que o snapshot é completo.
- **AC-005:** Provas passam em macOS e Linux; Windows real fica não verificado.
  Código de teste é versionado e evidências ficam em
  `.agent-tests/manifesto-recuperacao/`.

[case-folding]: https://www.unicode.org/faq/casemap_charprop.html
