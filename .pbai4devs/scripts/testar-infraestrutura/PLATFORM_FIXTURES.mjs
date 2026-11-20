const nativeReasons = {
  win32: 'Requer Windows para verificar a resolução de alias 8.3.',
  darwin: 'Requer macOS para verificar ACLs e atributos nativos.',
  linux: 'Requer Linux para verificar atributos e diagnósticos nativos.',
};

// Os perfis nativos do CI exercitam os mesmos casos nas plataformas exigidas.
export const platformFixtures = [
  {
    native: 'win32',
    platforms: ['linux', 'darwin'],
    suite: 'sincronizar-agentes',
    file: 'LOCAL_IGNORE.mjs',
    names: ['Windows normaliza o alias temporário 8.3 antes de comparar a raiz Git'],
  },
  {
    native: 'darwin',
    platforms: ['linux'],
    suite: 'sincronizar-agentes',
    file: 'PRESERVATION.mjs',
    names: ['sync recusa apontamento CRLF com xattr no macOS', 'sync recusa apontamento CRLF com acl no macOS'],
  },
  {
    native: 'darwin',
    platforms: ['linux'],
    suite: 'testar-infraestrutura',
    file: 'TEST.mjs',
    names: [
      'ACL herdada no diretório de logs interrompe antes de executar suítes',
      'ACL de logs não verificável interrompe sem expor diagnóstico',
      'ACL de logs não verificável após a suíte impede gravar saída',
    ],
  },
  {
    native: 'linux',
    platforms: ['darwin'],
    suite: 'sincronizar-agentes',
    file: 'PRESERVATION.mjs',
    names: [
      'sync preserva atributo Linux ao atualizar referência CRLF ou recusa sem alterar',
      'sync preserva atributo Linux em atualização comum ou recusa sem alterar',
      'sync avisa quando metadados Linux não foram verificados',
    ],
  },
];

export function nativeSkipReason(native, platform = process.platform) {
  return platform === native ? false : nativeReasons[native];
}

export const platformFixturePath = ({ suite, file }) => `.pbai4devs/scripts/${suite}/tests/${file}`;

export function expectedPlatformFixture(suite, skip, platform) {
  if (skip?.kind !== 'test' || skip.event !== 'test:pass' || skip.booleanSkip !== false || skip.todo !== false) return undefined;
  return platformFixtures.find(fixture => fixture.suite === suite
    && fixture.platforms.includes(platform)
    && skip.file === platformFixturePath(fixture)
    && fixture.names.includes(skip.name)
    && skip.reason === nativeSkipReason(fixture.native, platform));
}
