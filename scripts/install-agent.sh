#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
install_dir=${DEVNODE_INSTALL_DIR:-"$HOME/.local/bin"}

mkdir -p "$install_dir"
cd "$repo_dir"
go build -trimpath -ldflags "-s -w" -o "$install_dir/devnode-agent" ./cmd/devnode-agent
chmod 0755 "$install_dir/devnode-agent"
printf 'Installed Ubuntu pairing agent at %s/devnode-agent\n' "$install_dir"
printf 'Start secure pairing with:\n  %s/devnode-agent pair\n' "$install_dir"

