.PHONY: build agent test vet install install-agent

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

