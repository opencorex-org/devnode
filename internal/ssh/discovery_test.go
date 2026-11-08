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
