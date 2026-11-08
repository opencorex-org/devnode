package cli

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/opencorex-org/devnode/internal/config"
)

func TestHelpAndVersion(t *testing.T) {
	for _, args := range [][]string{{"--help"}, {"help"}} {
		var out, errOut bytes.Buffer
		if err := New(strings.NewReader(""), &out, &errOut).Run(context.Background(), args); err != nil {
			t.Fatalf("Run(%v): %v", args, err)
		}
		if !strings.Contains(out.String(), "DevNode controls") {
			t.Fatalf("missing help for %v", args)
		}
	}
	var out bytes.Buffer
	if err := New(strings.NewReader(""), &out, &bytes.Buffer{}).Run(context.Background(), []string{"--version"}); err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(out.String()) != "devnode "+Version {
		t.Fatalf("unexpected version: %q", out.String())
	}
}

func TestConfigInit(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "config.yaml")
	var out bytes.Buffer
	app := New(strings.NewReader(""), &out, &bytes.Buffer{})
	if err := app.Run(context.Background(), []string{"--config", path, "config", "init"}); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0600 {
		t.Fatalf("mode = %o", info.Mode().Perm())
	}
	if err := app.Run(context.Background(), []string{"--config", path, "config", "init"}); err == nil {
		t.Fatal("expected existing config error")
	}
}

func TestNeedsTTY(t *testing.T) {
	if !needsTTY([]string{"exec", "-it", "container", "sh"}) {
		t.Fatal("expected -it to request tty")
	}
	if needsTTY([]string{"run", "--rm", "alpine"}) {
		t.Fatal("unexpected tty")
	}
}

func TestValidAction(t *testing.T) {
	for _, action := range []string{"status", "start", "stop", "restart"} {
		if !validAction(action) {
			t.Errorf("expected %s valid", action)
		}
	}
	for _, action := range []string{"", "remove", "start;reboot"} {
		if validAction(action) {
			t.Errorf("expected %q invalid", action)
		}
	}
}

func TestTunnelCatalog(t *testing.T) {
	if tunnelPorts["postgres"] != 5432 || tunnelPorts["mailpit"] != 8025 {
		t.Fatalf("unexpected tunnel catalog: %#v", tunnelPorts)
	}
	if strings.Contains(tunnelNames(), "postgresql") {
		t.Fatal("aliases should not duplicate tunnel help")
	}
}

func TestResolveProjectAndArgs(t *testing.T) {
	// Explicit project name and subcommand
	p, args, err := resolveProjectAndArgs([]string{"my-app", "install"})
	if err != nil || p != "my-app" || len(args) != 1 || args[0] != "install" {
		t.Fatalf("unexpected resolve: p=%s, args=%v, err=%v", p, args, err)
	}

	// Explicit project name with no args defaults to "install"
	p, args, err = resolveProjectAndArgs([]string{"my-app"})
	if err != nil || p != "my-app" || len(args) != 1 || args[0] != "install" {
		t.Fatalf("unexpected default install: p=%s, args=%v, err=%v", p, args, err)
	}

	// Subcommand provided without project name -> infers from current dir
	cwd, _ := os.Getwd()
	expectedDir := filepath.Base(cwd)
	p, args, err = resolveProjectAndArgs([]string{"add", "express"})
	if err != nil || p != expectedDir || len(args) != 2 || args[0] != "add" || args[1] != "express" {
		t.Fatalf("unexpected inferred project: p=%s (want %s), args=%v, err=%v", p, expectedDir, args, err)
	}

	// Flag provided without project name -> infers from current dir
	p, args, err = resolveProjectAndArgs([]string{"--version"})
	if err != nil || p != expectedDir || len(args) != 1 || args[0] != "--version" {
		t.Fatalf("unexpected flag resolve: p=%s, args=%v, err=%v", p, args, err)
	}
}

func TestSafeProjectName(t *testing.T) {
	valid := []string{"my-app", "test_project", "api.v2", "Project123"}
	for _, name := range valid {
		if !safeProjectName(name) {
			t.Errorf("expected %q to be valid", name)
		}
	}
	invalid := []string{"", ".", "..", "my/app", "test;rm -rf", "project$name", "app`evil`", "name\nnewline"}
	for _, name := range invalid {
		if safeProjectName(name) {
			t.Errorf("expected %q to be invalid", name)
		}
	}
}

func TestSafeSessionName(t *testing.T) {
	for _, name := range []string{"devnode", "work_2", "api-server", "A1"} {
		if !safeSessionName(name) {
			t.Errorf("expected %q to be valid", name)
		}
	}
	for _, name := range []string{"", "has space", "name:window", "../escape", "$(reboot)", strings.Repeat("a", 65)} {
		if safeSessionName(name) {
			t.Errorf("expected %q to be invalid", name)
		}
	}
}

func TestPersistentShellScriptChecksTmux(t *testing.T) {
	for _, want := range []string{"command -v tmux", "tmux new-session -A -s", "sudo apt-get install -y tmux"} {
		if !strings.Contains(persistentShellScript, want) {
			t.Errorf("persistent shell script missing %q", want)
		}
	}
}

func TestSaveDiscoveredHostPreservesConfig(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	original := config.Config{
		Host: "192.168.1.17", User: "opencorex", Port: 2222,
		IdentityFile: "/tmp/devnode-key", ConnectTimeout: 12, PostgresService: "postgresql@16-main",
	}
	updated, err := saveDiscoveredHost(path, original, "192.168.1.19")
	if err != nil {
		t.Fatal(err)
	}
	loaded, err := config.Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Host != "192.168.1.19" || loaded != updated || loaded.User != original.User || loaded.Port != original.Port || loaded.IdentityFile != original.IdentityFile {
		t.Fatalf("configuration was not preserved: original=%+v updated=%+v loaded=%+v", original, updated, loaded)
	}
}
