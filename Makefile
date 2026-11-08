.PHONY: build agent test vet install install-agent version version-check

build:
	go build -o bin/devnode ./cmd/devnode

agent:
	go build -o bin/devnode-agent ./cmd/devnode-agent

test:
	go test ./...

vet:
	go vet ./...

install:
	./scripts/install.sh

install-agent:
	./scripts/install-agent.sh

# Usage: make version VERSION=0.6.0
version:
	@test -n "$(VERSION)" || (echo "usage: make version VERSION=x.y.z" && exit 1)
	./scripts/set-version.sh "$(VERSION)"

version-check:
	./scripts/set-version.sh --check

