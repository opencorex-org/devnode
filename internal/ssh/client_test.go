package ssh

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/opencorex-org/devnode/internal/config"
)

func TestJoinCommand(t *testing.T) {
	got := JoinCommand([]string{"printf", "%s", "hello world", "it's safe"})
	want := `'printf' '%s' 'hello world' 'it'"'"'s safe'`
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestHostVerificationError(t *testing.T) {
	if !IsHostVerificationError(errors.New("ssh: exit status 255: Host key verification failed.")) {
		t.Fatal("host-key failure was not recognized")
	}
	if IsHostVerificationError(errors.New("ssh: connect to host server: Host is down")) {
		t.Fatal("ordinary connection failure was mistaken for a host-key failure")
	}
}

func TestHostCheckCommandIsInteractive(t *testing.T) {
	c := Client{Config: config.Config{Host: "192.168.1.19", User: "dev", Port: 22, ConnectTimeout: 8}}
	cmd := c.HostCheckCommand(context.Background())
	if !slices.Contains(cmd.Args, "dev@192.168.1.19") || slices.Contains(cmd.Args, "BatchMode=yes") || cmd.Stdin != nil {
		t.Fatalf("unexpected host-check command: %#v", cmd.Args)
	}
}

func TestBaseArgsIncludeKeepalives(t *testing.T) {
	c := Client{Config: config.Config{Port: 22, ConnectTimeout: 8}}
	args := c.baseArgs(false)
	for _, option := range []string{"ServerAliveInterval=30", "ServerAliveCountMax=3", "TCPKeepAlive=yes"} {
		if !slices.Contains(args, option) {
			t.Errorf("SSH arguments missing %q: %#v", option, args)
		}
	}
}
