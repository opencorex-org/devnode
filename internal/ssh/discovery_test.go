package ssh

import "testing"

func TestSubnetCandidates(t *testing.T) {
	got, err := subnetCandidates("192.168.1.17")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 253 || got[0] != "192.168.1.1" || got[len(got)-1] != "192.168.1.254" {
		t.Fatalf("unexpected candidates: len=%d first=%q last=%q", len(got), got[0], got[len(got)-1])
	}
	for _, host := range got {
		if host == "192.168.1.17" {
			t.Fatal("old address should not be scanned")
		}
	}
	if _, err := subnetCandidates("server.local"); err == nil {
		t.Fatal("hostname should not be accepted as an IPv4 subnet")
	}
}

func TestMatchingHostsRequiresTrustedKey(t *testing.T) {
	trusted := parseHostKeys("192.168.1.17 ssh-ed25519 AAAAtrusted\n")
	output := "192.168.1.18 ssh-ed25519 AAAAother\n192.168.1.19 ssh-ed25519 AAAAtrusted\n192.168.1.19 ssh-rsa AAAArsa\n"
	got := matchingHosts(output, trusted)
	if len(got) != 1 || got[0] != "192.168.1.19" {
		t.Fatalf("unexpected matches: %#v", got)
	}
}

func TestDiscoverCandidatesIncludesLocalNetworkAndSubnet(t *testing.T) {
	c := Client{Config: struct {
		ConnectionMode  string
		Host            string
		User            string
		Port            int
		IdentityFile    string
		ConnectTimeout  int
		PostgresService string
	}{Host: "192.168.1.17", Port: 22}}
	candidates := c.DiscoverCandidates()
	if len(candidates) == 0 {
		t.Fatal("expected at least subnet candidates for 192.168.1.17")
	}

	// Should not panic on a .local hostname
	cLocal := Client{Config: struct {
		ConnectionMode  string
		Host            string
		User            string
		Port            int
		IdentityFile    string
		ConnectTimeout  int
		PostgresService string
	}{Host: "ubuntu.local", Port: 22}}
	_ = cLocal.DiscoverCandidates()
}
