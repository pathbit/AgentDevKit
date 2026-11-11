#!/bin/sh
# Bootstrap local: nao requer Node, sudo nem alteracoes permanentes no PATH.
set -eu

die() { printf '%s\n' "bootstrap: $*" >&2; exit 1; }
runtime_only=false
if [ "${1:-}" = --runtime-only ]; then
  [ "$#" -eq 1 ] || die '--runtime-only nao aceita selecao ou outros argumentos.'
  runtime_only=true
  shift
fi
script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
project=$(CDPATH='' cd -- "$script_dir/../../.." && pwd -P)
manager="$script_dir/SCRIPT.mjs"
[ -f "$manager" ] || die "SCRIPT.mjs ausente: $manager"

node_ok() {
  [ -x "$1" ] && "$1" -e 'if(process.versions.bun || Number(process.versions.node.split(".")[0]) < 24) process.exit(1)' >/dev/null 2>&1
}
npm_ok() {
  npm_version=$("$@" --version 2>/dev/null) || return 1
  "$chosen_node" -e 'if(!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(process.argv[1])) process.exit(1)' "$npm_version" >/dev/null 2>&1
}
run_setup() {
  printf 'node=%s\n' "$chosen_node"
  [ "$runtime_only" = false ] || exit 0
  PATH="$(dirname -- "$chosen_node"):$PATH"; export PATH
  exec "$chosen_node" "$manager" setup "$@"
}

chosen_node=$(command -v node 2>/dev/null || :)
if [ -n "$chosen_node" ] && node_ok "$chosen_node"; then
  chosen_npm=$(command -v npm 2>/dev/null || :)
  if [ -n "$chosen_npm" ] && npm_ok "$chosen_npm"; then
    chosen_node=$("$chosen_node" -p 'process.execPath')
    run_setup "$@"
  fi
fi

for utility in uname mkdir mktemp tar gzip awk mv rm; do
  command -v "$utility" >/dev/null 2>&1 || die "Instale o pre-requisito: $utility"
done
case $(uname -s) in Darwin) os=darwin ;; Linux) os=linux ;; *) die 'SO suportado: macOS ou Linux.' ;; esac
case $(uname -m) in arm64|aarch64) arch=arm64 ;; x86_64|amd64) arch=x64 ;; *) die 'Arquitetura suportada: x64 ou arm64.' ;; esac
platform="$os-$arch"
if [ "$os" = linux ]; then
  libc=unknown
  if command -v ldd >/dev/null 2>&1; then
    libc_info=$(ldd --version 2>&1 || :)
    case "$libc_info" in *musl*) libc=musl ;; *GLIBC*|*GNU*|*glibc*) libc=glibc ;; esac
  fi
  for loader in /lib/ld-musl-*.so.1; do [ ! -e "$loader" ] || libc=musl; done
  if [ "$libc" = unknown ] && command -v getconf >/dev/null 2>&1; then
    case $(getconf GNU_LIBC_VERSION 2>/dev/null || :) in glibc*) libc=glibc ;; esac
  fi
  case "$libc" in musl) platform="$platform-musl" ;; glibc) : ;; *) die 'Nao foi possivel identificar glibc/musl; nenhuma distribuicao foi baixada.' ;; esac
fi

cache="$project/.pbai4devs/tools/.cache/runtime/node"
for directory in "$project/.pbai4devs" "$project/.pbai4devs/tools" "$project/.pbai4devs/tools/.cache" "$project/.pbai4devs/tools/.cache/runtime" "$cache" "$cache/$platform"; do
  [ ! -L "$directory" ] || die "Cache nao pode ser link simbolico: $directory"
  [ ! -e "$directory" ] || [ -d "$directory" ] || die "Cache nao e diretorio: $directory"
done
for installation in "$cache/$platform"/v24.*; do
  [ -d "$installation" ] && [ ! -L "$installation" ] || continue
  safe=yes
  for part in bin bin/node lib lib/node_modules lib/node_modules/npm lib/node_modules/npm/bin lib/node_modules/npm/bin/npm-cli.js; do
    if [ -L "$installation/$part" ]; then safe=no; break; fi
  done
  [ "$safe" = yes ] || continue
  chosen_node="$installation/bin/node"
  if node_ok "$chosen_node" && npm_ok "$chosen_node" "$installation/lib/node_modules/npm/bin/npm-cli.js"; then run_setup "$@"; fi
done

if command -v curl >/dev/null 2>&1; then downloader=curl
elif command -v wget >/dev/null 2>&1; then downloader=wget
else die 'Instale curl ou wget para baixar Node.js.'; fi
if command -v shasum >/dev/null 2>&1; then hasher=shasum
elif command -v sha256sum >/dev/null 2>&1; then hasher=sha256sum
else die 'Instale shasum ou sha256sum para verificar SHA-256.'; fi
download() {
  if [ "$downloader" = curl ]; then curl --fail --show-error --silent --location --proto '=https' --proto-redir '=https' --connect-timeout 20 --max-time 300 --output "$2" "$1"
  else wget --https-only --timeout=30 --tries=2 --output-document="$2" "$1"; fi
}

mkdir -p "$cache/$platform"
stage=$(mktemp -d "$cache/$platform/.stage.XXXXXX")
backup=; target=
cleanup() {
  if [ -n "$backup" ] && [ -d "$backup" ] && [ ! -e "$target" ]; then mv -- "$backup" "$target"; fi
  [ -z "${stage:-}" ] || rm -rf -- "$stage"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP
download 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' "$stage/SHASUMS256.txt" || die 'Falha ao baixar o manifesto oficial do Node 24 LTS.'
selection=$(awk -v platform="$platform" '
  NF == 2 && $1 ~ /^[0-9a-fA-F]+$/ && length($1) == 64 && $2 ~ /^node-v24\.[0-9]+\.[0-9]+-/ {
    file=$2; sub(/^node-v24\.[0-9]+\.[0-9]+-/, "", file)
    if(file == platform ".tar.gz") { print tolower($1), $2; count++ }
  }
  END { if(count != 1) exit 1 }
' "$stage/SHASUMS256.txt") || die "Distribuicao oficial Node 24 indisponivel para $platform."
expected=${selection%% *}; filename=${selection#* }
top=${filename%.tar.gz}; version=${top#node-}; version=${version%-"$platform"}
download "https://nodejs.org/dist/$version/$filename" "$stage/$filename" || die 'Falha ao baixar o arquivo oficial do Node.'
if [ "$hasher" = shasum ]; then actual=$(shasum -a 256 "$stage/$filename")
else actual=$(sha256sum "$stage/$filename"); fi
actual=${actual%% *}
[ "$actual" = "$expected" ] || die 'SHA-256 divergente; arquivo recusado.'

tar -tzf "$stage/$filename" > "$stage/members" || die 'Arquivo tar invalido.'
awk -v top="$top" '
  $0 != top && $0 != top "/" && index($0, top "/") != 1 { bad=1 }
  /^\// || /\\/ || /(^|\/)\.\.(\/|$)/ { bad=1 }
  END { exit bad }
' "$stage/members" || die 'Arquivo tar contem caminhos fora da distribuicao.'
tar -tvzf "$stage/$filename" > "$stage/details" || die 'Nao foi possivel inspecionar o arquivo tar.'
# Links simbolicos do npm sao permitidos apenas quando resolvem dentro da raiz.
awk -v top="$top" '
  FNR==NR { members[FNR]=$0; next }
  substr($0,1,1)=="h" || / link to / { bad=1 }
  substr($0,1,1)=="l" {
    marker=index($0," -> "); if(!marker) { bad=1; next }
    target=substr($0,marker+4); if(target ~ /^\// || target ~ /\\/) { bad=1; next }
    member=members[FNR]; if(member==top || member==top "/") { bad=1; next }; sub(/\/[^\/]*$/, "", member)
    count=split(member "/" target, parts, "/"); depth=0
    for(i=1;i<=count;i++) {
      if(parts[i]=="..") depth--; else if(parts[i]!="." && parts[i]!="") depth++
      if(depth<1) bad=1
    }
  }
  END { exit bad }
' "$stage/members" "$stage/details" || die 'Arquivo tar contem links inseguros.'
mkdir "$stage/unpack"
tar -xzf "$stage/$filename" -C "$stage/unpack" || die 'Falha ao extrair Node.'
installation="$stage/unpack/$top"; chosen_node="$installation/bin/node"
if ! node_ok "$chosen_node" || ! npm_ok "$chosen_node" "$installation/lib/node_modules/npm/bin/npm-cli.js"; then
  die 'Node/npm extraidos falharam na verificacao.'
fi
target="$cache/$platform/$version"
[ ! -L "$target" ] || die "Destino nao pode ser link: $target"
# Nunca sobrescreve a instalacao anterior antes de validar a nova.
backup=
if [ -e "$target" ]; then backup="$stage/previous"; mv -- "$target" "$backup"; fi
if ! mv -- "$installation" "$target"; then
  [ -z "$backup" ] || mv -- "$backup" "$target"
  die 'Falha ao promover Node; instalacao anterior preservada.'
fi
chosen_node="$target/bin/node"
cleanup; stage=
trap - EXIT INT TERM HUP
run_setup "$@"
