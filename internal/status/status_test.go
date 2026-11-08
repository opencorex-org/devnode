package status

import (
	"strings"
	"testing"
)

func TestParse(t *testing.T) {
	s, err := Parse("HOST=devbox\nOS=Ubuntu 26.04 LTS\nARCH=x86_64\nIP=192.168.1.17\nUPTIME=up 4 hours\nCPU=71\nMEMORY=50\nDISK=30\nNET_RX=1073741824\nNET_TX=524288\nSERVICE_docker=active|systemd\nSERVICE_redis=running|docker\nSERVICE_ros2=installed|native\nTOOL_node=v20.11.0\nTOOL_npm=10.2.4\nTOOL_pnpm=8.15.1\n")
	if err != nil {
		t.Fatal(err)
	}
	if s.Host != "devbox" || s.IP != "192.168.1.17" || s.Uptime != "4 hours" || s.CPU != 71 || s.Services["docker"].State != "active" || s.Services["redis"].Source != "docker" || s.Services["ros2"].Source != "native" {
		t.Fatalf("unexpected snapshot: %+v", s)
	}
	if s.Tools["node"] != "v20.11.0" || s.Tools["npm"] != "10.2.4" || s.Tools["pnpm"] != "8.15.1" {
		t.Fatalf("unexpected tools: %+v", s.Tools)
	}
	if !s.NetAvailable || s.NetRX != 1073741824 || s.NetTX != 524288 {
		t.Fatalf("unexpected network counters: %+v", s)
	}
	displayed := DisplayTools(s.Tools)
	if len(displayed) < 3 {
		t.Fatalf("expected at least 3 displayed tools, got %d", len(displayed))
	}
}

func TestFormatBytes(t *testing.T) {
	for n, want := range map[uint64]string{0: "0 B", 1024: "1.0 KiB", 1048576: "1.0 MiB", 1610612736: "1.5 GiB"} {
		if got := FormatBytes(n); got != want {
			t.Errorf("FormatBytes(%d) = %q, want %q", n, got, want)
		}
	}
}

func TestParseBadPercent(t *testing.T) {
	s, err := Parse("HOST=devbox\nCPU=?\nMEMORY=101\n")
	if err != nil {
		t.Fatal(err)
	}
	if s.CPU != -1 || s.Memory != -1 {
		t.Fatalf("invalid percentages accepted: %+v", s)
	}
}

func TestScriptUsesConfiguredPostgresUnit(t *testing.T) {
	got := Script("postgresql@16-main")
	if !strings.Contains(got, "check_service postgresql postgres postgresql@16-main") {
		t.Fatalf("configured unit missing from script")
	}
}
