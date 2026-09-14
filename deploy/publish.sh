#!/usr/bin/env bash
set -euo pipefail
base=/opt/ourtaiko-fanmade
site=/opt/1panel/www/sites/fanmade.ourtaiko.org
export PATH="$base/toolchains/node/bin:$base/toolchains/pnpm/bin:$PATH"
cd "$base/src/frontend"
test -z "$(git status --porcelain)" || { echo 'Frontend checkout has local changes'; exit 1; }
git pull --ff-only origin main
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm build
revision=$(git rev-parse HEAD)
release="$site/releases/$revision"
if ! sudo test -d "$release"; then
  sudo install -d -m 755 "$release"
  sudo cp -R dist/. "$release/"
  sudo chmod -R a+rX "$release"
fi
if sudo test -d "$site/index" && ! sudo test -L "$site/index"; then
  if sudo test -e "$site/index.initial"; then
    echo 'Existing index.initial needs manual review'
    exit 1
  fi
  sudo mv "$site/index" "$site/index.initial"
fi
sudo ln -s "releases/$revision" "$site/index.next"
sudo mv -Tf "$site/index.next" "$site/index"
echo "Published frontend $revision"
