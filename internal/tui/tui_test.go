package tui

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"
	"github.com/lahiruudayakumara/devnode/internal/config"
	devssh "github.com/lahiruudayakumara/devnode/internal/ssh"
	"github.com/lahiruudayakumara/devnode/internal/status"
)

func TestViewAndNavigation(t *testing.T) {
	m := model{width: 100, height: 30, interval: 2 * time.Second, target: "dev@server", netRXRate: 2048, netTXRate: 1024, snapshot: status.Snapshot{Host: "server", IP: "192.168.1.17", OS: "Ubuntu", CPU: 40, Memory: 50, Disk: 20, NetRX: 1073741824, NetTX: 524288, NetAvailable: true, Services: map[string]status.Service{"docker": {State: "active", Source: "systemd"}, "ros2": {State: "installed", Source: "native"}}, Tools: map[string]string{"node": "v20.11.0", "npm": "10.2.4", "pnpm": "8.15.1"}}}
	view := m.View().Content
	for _, want := range []string{"DEVNODE", "ONLINE", "NET", "2.0 KiB/s", "1.0 GiB total", "DEV RUNTIMES", "Node.js", "v20.11.0", "npm", "10.2.4", "pnpm", "8.15.1", "ESSENTIAL SERVICES", "ROS 2"} {
		if !strings.Contains(view, want) {
			t.Errorf("view missing %q", want)
		}
	}
	next, _ := m.Update(tea.KeyPressMsg{Code: tea.KeyTab})
	if next.(model).tab != 1 {
		t.Fatalf("tab = %d", next.(model).tab)
	}
}

func TestFetchCalculatesNetworkRates(t *testing.T) {
	start := time.Date(2026, 10, 21, 12, 0, 0, 0, time.UTC)
	m := model{
		interval: 2 * time.Second,
		updated:  start,
		snapshot: status.Snapshot{NetRX: 1000, NetTX: 2000, NetAvailable: true},
	}
	next, _ := m.Update(fetchMsg{
		at:       start.Add(2 * time.Second),
		snapshot: status.Snapshot{NetRX: 5000, NetTX: 3000, NetAvailable: true},
	})
	got := next.(model)
	if got.netRXRate != 2000 || got.netTXRate != 500 {
		t.Fatalf("rates = %.0f/%.0f B/s", got.netRXRate, got.netTXRate)
	}
}

func TestConnectionFailurePausesAfterFiveAttempts(t *testing.T) {
	m := model{interval: time.Second, width: 80, height: 24}
	for attempt := 1; attempt <= 5; attempt++ {
		next, cmd := m.Update(fetchMsg{err: fmt.Errorf("host is down"), at: time.Now()})
		m = next.(model)
		if attempt < 5 && cmd == nil {
			t.Fatalf("attempt %d did not schedule an automatic retry", attempt)
		}
		if attempt == 5 && cmd != nil {
			t.Fatal("fifth failure should pause automatic retries")
		}
	}
	view := m.View().Content
	for _, want := range []string{"paused after 5 failed attempts", "[r] Retry current IP", "[i] Change IP"} {
		if !strings.Contains(view, want) {
			t.Errorf("view missing %q", want)
		}
	}
	next, cmd := m.Update(tea.KeyPressMsg{Code: 'r', Text: "r"})
	m = next.(model)
	if cmd == nil || !m.loading || m.target != "" {
		t.Fatal("retry option did not retry the current target")
	}
}

func TestChangeIPAfterConnectionFailures(t *testing.T) {
	m := model{
		cfg:            config.Config{Host: "192.168.1.17", User: "dev", Port: 22, ConnectTimeout: 8, PostgresService: "postgresql"},
		client:         devssh.Client{Config: config.Config{Host: "192.168.1.17"}},
		target:         "dev@192.168.1.17",
		failedAttempts: 5,
		err:            fmt.Errorf("host is down"),
	}
	next, _ := m.Update(tea.KeyPressMsg{Code: 'i', Text: "i"})
	m = next.(model)
	if !m.editingHost {
		t.Fatal("change-IP prompt did not open")
	}
	for _, r := range "192.168.1.42" {
		next, _ = m.Update(tea.KeyPressMsg{Code: r, Text: string(r)})
		m = next.(model)
	}
	next, cmd := m.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	m = next.(model)
	if cmd == nil || m.cfg.Host != "192.168.1.42" || m.client.Config.Host != "192.168.1.42" || m.target != "dev@192.168.1.42" {
		t.Fatalf("new host was not applied: cfg=%q client=%q target=%q", m.cfg.Host, m.client.Config.Host, m.target)
	}
}

func TestHostVerificationPausesImmediately(t *testing.T) {
	m := model{
		interval: time.Second,
		target:   "dev@192.168.1.19",
		ctx:      context.Background(),
		client: devssh.Client{Config: config.Config{
			Host: "192.168.1.19", User: "dev", Port: 22, ConnectTimeout: 8,
		}},
	}
	next, cmd := m.Update(fetchMsg{err: fmt.Errorf("ssh: exit status 255: Host key verification failed."), at: time.Now()})
	m = next.(model)
	if cmd != nil || !m.verifyHostKey || m.failedAttempts != 1 {
		t.Fatal("host verification should pause retries immediately")
	}
	view := m.View().Content
	if !strings.Contains(view, "[v] Verify host key") || !strings.Contains(view, "dev@192.168.1.19") {
		t.Fatalf("verification guidance missing:\n%s", view)
	}
	next, cmd = m.Update(tea.KeyPressMsg{Code: 'v', Text: "v"})
	if cmd == nil || !next.(model).verifyHostKey {
		t.Fatal("verify option did not start the interactive SSH command")
	}
}

func TestDiscoveryResultUpdatesHostAndReconnects(t *testing.T) {
	m := model{
		ctx:           context.Background(),
		cfg:           config.Config{Host: "192.168.1.17", User: "dev", Port: 22, ConnectTimeout: 8, PostgresService: "postgresql"},
		client:        devssh.Client{Config: config.Config{Host: "192.168.1.17", User: "dev", Port: 22, ConnectTimeout: 8, PostgresService: "postgresql"}},
		searchingHost: true,
	}
	next, cmd := m.Update(discoveryMsg{host: "192.168.1.19"})
	m = next.(model)
	if cmd == nil || m.searchingHost || m.cfg.Host != "192.168.1.19" || m.client.Config.Host != "192.168.1.19" || m.target != "dev@192.168.1.19" {
		t.Fatalf("discovered host was not applied: %+v", m)
	}
}
