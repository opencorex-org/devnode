package ui

import (
	"bytes"
	"strings"
	"testing"

	"github.com/opencorex-org/devnode/internal/status"
)

func TestDashboardShowsManagerAndInventory(t *testing.T) {
	s := status.Snapshot{
		Host: "devbox", IP: "192.168.1.17", OS: "Ubuntu", Arch: "x86_64",
		CPU: 40, Memory: 50, Disk: 30,
		NetRX: 1073741824, NetTX: 524288, NetAvailable: true,
		Services: map[string]status.Service{
			"postgresql": {State: "running", Source: "docker"},
			"redis":      {State: "inactive", Source: "systemd"},
		},
		Tools: map[string]string{
			"node": "v20.11.0",
			"npm":  "10.2.4",
			"pnpm": "8.15.1",
		},
	}
	var out bytes.Buffer
	Dashboard(&out, "dev@devbox", s, false)
	got := out.String()
	for _, want := range []string{"DEVNODE SERVER", "Network", "1.0 GiB received", "512.0 KiB sent", "DEVELOPMENT RUNTIMES", "Node.js", "v20.11.0", "npm", "10.2.4", "pnpm", "8.15.1", "PostgreSQL", "Running", "[docker]", "[systemd]", "IOT & ROBOTICS", "ROS 2"} {
		if !strings.Contains(got, want) {
			t.Errorf("dashboard missing %q\n%s", want, got)
		}
	}
}
