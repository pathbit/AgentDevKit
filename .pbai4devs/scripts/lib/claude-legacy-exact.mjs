// Subconjunto conservador: duas chaves, ordem/espacos/LF fixos e descrição YAML
// simples restrita. Não tenta reconhecer YAML geral nem demonstra autoria.
export function isLegacyExact(sourceBytes, wrapperBytes, generatedBytes, name) {
  if (!Buffer.isBuffer(sourceBytes) || !Buffer.isBuffer(wrapperBytes) || !Buffer.isBuffer(generatedBytes) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return false;
  const source = sourceBytes.toString('utf8');
  if (!Buffer.from(source,'utf8').equals(sourceBytes)) return false;
  const match=source.match(/^---\ntrigger: always_on\ndescription: ([\p{L}][\p{L}\p{N} .,-]*)\n---\n/u);
  if (!match) return false;
  const description=match[1];
  if(description!==description.trim() || /^(?:null|true|false|yes|no|on|off|y|n)$/i.test(description)) return false;
  const title=source.match(/^# [^\r\n]+$/m)?.[0];
  if(!title)return false;
  const body=`\n${title}\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/${name}/RULE.md).\n`;
  const old=Buffer.from(match[0]+body);
  const current=Buffer.from(`---\ndescription: ${JSON.stringify(description)}\n---\n`+body);
  return wrapperBytes.equals(old) && generatedBytes.equals(current);
}
