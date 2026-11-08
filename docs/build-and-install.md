# Build and install DevNode

## Requirements

- macOS
- Go 1.25 or newer
- Git
- OpenSSH, which is included with macOS

Confirm the tools are available:

```sh
go version
git --version
ssh -V
```

## Get the source

```sh
git clone https://github.com/lahiruudayakumara/devnode.git
cd devnode
go mod download
```

## Run the development checks

Run the unit tests and static analysis before building:

```sh
make test
make vet
```

## Build a local binary

```sh
make build
```

The binary is written to `bin/devnode`. Check it with:

```sh
./bin/devnode --version
./bin/devnode --help
```

The version printed by the binary comes from `Version` in
`internal/cli/app.go`.

## Install from source

```sh
make install
```

The installer:

- builds an optimized binary at `~/.local/bin/devnode`;
- creates `~/.config/devnode/config.yaml` when it does not exist;
- preserves an existing configuration; and
- adds `~/.local/bin` to `PATH` in `~/.zshrc` when needed.

Open a new terminal after the first installation, then run:

```sh
devnode setup
```

To install the binary somewhere else, set `DEVNODE_INSTALL_DIR`:

```sh
DEVNODE_INSTALL_DIR=/usr/local/bin ./scripts/install.sh
```

The destination must be writable by the current user. The installer also
accepts `DEVNODE_CONFIG`, `DEVNODE_HOST`, `DEVNODE_USER`, and `DEVNODE_PORT`.

## Rebuild after a code change

```sh
gofmt -w cmd/devnode/*.go internal/*/*.go
make test
make vet
make build
./bin/devnode --version
```

`gofmt` rewrites changed Go files in place. Review those changes before
committing them.

## Common problems

### The Go version is too old

Install Go 1.25 or newer, then confirm `go version` reports the expected
toolchain.

### `devnode` is not found after installation

Open a new terminal or reload the shell configuration:

```sh
source ~/.zshrc
```

Then confirm that the installation directory is on `PATH`:

```sh
command -v devnode
```

