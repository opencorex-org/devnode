# Release a new DevNode version

DevNode currently uses a manual release process. The application version is a
source constant, and release artifacts are built for both Apple Silicon and
Intel Macs.

In the commands below, replace `0.6.0` with the version being released.

## 1. Prepare the release

Start from an up-to-date `main` branch with a clean working tree:

```sh
git switch main
git pull --ff-only
git status --short
```

Choose a [Semantic Versioning](https://semver.org/) number:

- increment the patch version for a backward-compatible fix;
- increment the minor version for a backward-compatible feature; or
- increment the major version for a breaking change.

Update `Version` in `internal/cli/app.go`. Store the number without the `v`
prefix:

```go
const Version = "0.6.0"
```

Review the user-facing documentation and commit the release preparation:

```sh
git add internal/cli/app.go README.md docs
git commit -m "chore: prepare v0.6.0 release"
```

## 2. Validate the source

```sh
gofmt -w cmd/devnode/*.go internal/*/*.go
make test
make vet
make build
./bin/devnode --version
```

The final command must print:

```text
devnode 0.6.0
```

If `gofmt` changes a tracked file, review and commit that change before
continuing. Confirm the working tree is clean:

```sh
git status --short
```

## 3. Build release artifacts

Create optimized, reproducible binaries for Apple Silicon and Intel Macs:

```sh
mkdir -p dist
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags "-s -w" -o dist/devnode_0.6.0_darwin_arm64 ./cmd/devnode
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o dist/devnode_0.6.0_darwin_amd64 ./cmd/devnode
```

Inspect the artifacts and generate their checksums:

```sh
file dist/devnode_0.6.0_darwin_arm64 dist/devnode_0.6.0_darwin_amd64
shasum -a 256 dist/devnode_0.6.0_darwin_arm64 dist/devnode_0.6.0_darwin_amd64 > dist/checksums.txt
cat dist/checksums.txt
```

Run the binary that matches the build machine's architecture:

```sh
uname -m
./dist/devnode_0.6.0_darwin_arm64 --version
```

Use the `amd64` binary instead when `uname -m` prints `x86_64`.

## 4. Tag and push the release

Create an annotated tag only after all checks pass:

```sh
git tag -a v0.6.0 -m "DevNode v0.6.0"
git push origin main
git push origin v0.6.0
```

Do not reuse a published version number. If a release needs a correction,
prepare a new patch version.

## 5. Publish the GitHub release

With the [GitHub CLI](https://cli.github.com/) installed and authenticated:

```sh
gh release create v0.6.0 \
  dist/devnode_0.6.0_darwin_arm64 \
  dist/devnode_0.6.0_darwin_amd64 \
  dist/checksums.txt \
  --title "DevNode v0.6.0" \
  --generate-notes \
  --verify-tag
```

Alternatively, create a release for the tag in the GitHub web interface and
upload the same three files.

## 6. Verify the published release

After publishing:

1. Confirm that the tag and all three artifacts appear on the release page.
2. Download the binary for the current Mac architecture.
3. Compare its SHA-256 value with `checksums.txt`.
4. Run the downloaded binary with `--version` and `--help`.
5. Confirm the release notes describe the important user-facing changes.

