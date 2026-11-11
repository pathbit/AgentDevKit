---
name: criar-agente
description: Cria ou atualiza perfis compartilhados de agentes e apontamentos.
---

# Criar agente

Defina papel, quando delegar, entrada, resultado, ferramentas e limites. Crie
ou atualize `.pbai4devs/agents/<nome>/AGENT.md`, com metadados apropriados e perfil
conciso. Preserve instruções e permissões existentes.

Mapeie modo e permissões nos YAMLs nativos ao lado da fonte, registrados no
manifesto; mantenha o cabeçalho compartilhado portátil. Quando houver suporte,
valide-os e informe diferenças de descoberta. Quando o formato não for
reconhecido, peça a leitura explícita da origem.
Para Antigravity e Gemini, mantenha os YAMLs específicos junto ao `AGENT.md`
e registre os destinos no manifesto. A sincronização gera apenas os apontamentos.

Atualize índice/guia, siga as regras de estrutura e qualidade e finalize com
`sincronizar-agentes`, inclusive após renomear ou remover perfis.
