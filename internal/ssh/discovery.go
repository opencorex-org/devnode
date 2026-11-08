package ssh

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// DiscoverMovedHost scans the connected LAN and configured host subnets and returns a host
// matching a trusted SSH public key, or the single active SSH host on the local network.
func (c Client) DiscoverMovedHost(ctx context.Context) (string, error) {
	candidates := c.DiscoverCandidates()
	if len(candidates) == 0 {
		return "", fmt.Errorf("no connected network interfaces or candidate addresses found")
	}
	lookup := c.Config.Host
	if c.Config.Port != 22 && lookup != "" && lookup != "auto" && lookup != "192.168.x.x" {
		lookup = fmt.Sprintf("[%s]:%d", lookup, c.Config.Port)
	}
	trusted := c.allTrustedKeys(ctx, lookup)

	args := []string{"-T", "2", "-p", strconv.Itoa(c.Config.Port)}
	args = append(args, candidates...)
	scanned, scanErr := exec.CommandContext(ctx, "ssh-keyscan", args...).Output()

	if len(trusted) > 0 {
		matches := matchingHosts(string(scanned), trusted)
		if len(matches) == 1 {
			return matches[0], nil
		}
		if len(matches) > 1 {
			return "", fmt.Errorf("server key matched multiple addresses: %s", strings.Join(matches, ", "))
		}
	}

	// Fallback when no trusted keys are known (e.g. initial setup) or none matched:
	scannedHosts := anyScannedHosts(string(scanned))
	if len(scannedHosts) == 1 {
		return scannedHosts[0], nil
	} else if len(scannedHosts) > 1 {
		return "", fmt.Errorf("multiple SSH servers found on the local network (%s); please specify one in config", strings.Join(scannedHosts, ", "))
	}

	if errors.Is(ctx.Err(), context.Canceled) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return "", ctx.Err()
	}
	if scanErr != nil && len(scanned) == 0 {
		return "", fmt.Errorf("LAN SSH scan failed: %w", scanErr)
	}
	if c.Config.Host == "auto" || c.Config.Host == "" || c.Config.Host == "192.168.x.x" {
		return "", fmt.Errorf("no server found on the connected local network on port %d", c.Config.Port)
	}
	var location string
	if ip := net.ParseIP(c.Config.Host).To4(); ip != nil {
		location = fmt.Sprintf("on %d.%d.%d.0/24 or local subnets", ip[0], ip[1], ip[2])
	} else {
		location = fmt.Sprintf("near %s on the local network", c.Config.Host)
	}
	return "", fmt.Errorf("server key was not found %s", location)
}

func (c Client) allTrustedKeys(ctx context.Context, lookup string) map[string]struct{} {
	trusted := make(map[string]struct{})
	if lookup != "" && lookup != "auto" && lookup != "192.168.x.x" {
		if known, err := exec.CommandContext(ctx, "ssh-keygen", "-F", lookup).Output(); err == nil {
			for k, v := range parseHostKeys(string(known)) {
				trusted[k] = v
			}
		}
		if len(trusted) == 0 && c.Config.Host != "" && c.Config.Host != lookup {
			if known, err := exec.CommandContext(ctx, "ssh-keygen", "-F", c.Config.Host).Output(); err == nil {
				for k, v := range parseHostKeys(string(known)) {
					trusted[k] = v
				}
			}
		}
	}
	if len(trusted) == 0 {
		home, err := os.UserHomeDir()
		if err == nil {
			knownHostsPath := filepath.Join(home, ".ssh", "known_hosts")
			if data, err := os.ReadFile(knownHostsPath); err == nil {
				for k, v := range parseHostKeys(string(data)) {
					trusted[k] = v
				}
			}
		}
	}
	return trusted
}

// DiscoverCandidates collects candidate addresses to scan from:
// 1. DNS/mDNS resolution of the configured host (e.g. *.local)
// 2. Active local network interfaces on this machine (connected LAN IP subnets)
// 3. The subnet of the configured host if it is an IPv4 address
func (c Client) DiscoverCandidates() []string {
	var candidates []string
	seen := make(map[string]struct{})

	addCandidate := func(ipStr string) {
		ip := net.ParseIP(ipStr).To4()
		if ip == nil || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
			return
		}
		formatted := ip.String()
		if _, ok := seen[formatted]; !ok {
			seen[formatted] = struct{}{}
			candidates = append(candidates, formatted)
		}
	}

	if c.Config.Host != "" && c.Config.Host != "auto" && c.Config.Host != "192.168.x.x" {
		if resolved, err := net.LookupHost(c.Config.Host); err == nil {
			for _, r := range resolved {
				addCandidate(r)
			}
		}
	}

	// Always probe ubuntu.local if host is auto or ubuntu.local
	if c.Config.Host == "auto" || c.Config.Host == "ubuntu.local" {
		if resolved, err := net.LookupHost("ubuntu.local"); err == nil {
			for _, r := range resolved {
				addCandidate(r)
			}
		}
	}

	for _, cand := range localNetworkCandidates() {
		addCandidate(cand)
	}

	if hostIP := net.ParseIP(c.Config.Host).To4(); hostIP != nil {
		if sub, err := subnetCandidates(c.Config.Host); err == nil {
			for _, cand := range sub {
				addCandidate(cand)
			}
		}
	}

	return candidates
}

func anyScannedHosts(output string) []string {
	found := make(map[string]struct{})
	for _, line := range strings.Split(output, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 3 || strings.HasPrefix(fields[0], "#") {
			continue
		}
		host := fields[0]
		if strings.HasPrefix(host, "[") {
			if end := strings.Index(host, "]"); end > 1 {
				host = host[1:end]
			}
		}
		found[host] = struct{}{}
	}
	hosts := make([]string, 0, len(found))
	for host := range found {
		hosts = append(hosts, host)
	}
	sort.Strings(hosts)
	return hosts
}

func localNetworkCandidates() []string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var candidates []string
	seen := make(map[string]struct{})
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}
			ip := ipNet.IP.To4()
			if ip == nil || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
				continue
			}
			prefix := fmt.Sprintf("%d.%d.%d", ip[0], ip[1], ip[2])
			myIP := ip.String()
			for last := 1; last < 255; last++ {
				cand := fmt.Sprintf("%s.%d", prefix, last)
				if cand != myIP {
					if _, exists := seen[cand]; !exists {
						seen[cand] = struct{}{}
						candidates = append(candidates, cand)
					}
				}
			}
		}
	}
	return candidates
}

func subnetCandidates(host string) ([]string, error) {
	ip := net.ParseIP(host).To4()
	if ip == nil {
		return nil, fmt.Errorf("automatic search requires an IPv4 address, got %q", host)
	}
	prefix := fmt.Sprintf("%d.%d.%d", ip[0], ip[1], ip[2])
	candidates := make([]string, 0, 253)
	for last := 1; last < 255; last++ {
		candidate := fmt.Sprintf("%s.%d", prefix, last)
		if candidate != host {
			candidates = append(candidates, candidate)
		}
	}
	return candidates, nil
}

func parseHostKeys(output string) map[string]struct{} {
	keys := make(map[string]struct{})
	for _, line := range strings.Split(output, "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 3 && !strings.HasPrefix(fields[0], "#") {
			keys[fields[1]+" "+fields[2]] = struct{}{}
		}
	}
	return keys
}

func matchingHosts(output string, trusted map[string]struct{}) []string {
	found := make(map[string]struct{})
	for _, line := range strings.Split(output, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 3 || strings.HasPrefix(fields[0], "#") {
			continue
		}
		if _, ok := trusted[fields[1]+" "+fields[2]]; !ok {
			continue
		}
		host := fields[0]
		if strings.HasPrefix(host, "[") {
			if end := strings.Index(host, "]"); end > 1 {
				host = host[1:end]
			}
		}
		found[host] = struct{}{}
	}
	hosts := make([]string, 0, len(found))
	for host := range found {
		hosts = append(hosts, host)
	}
	sort.Strings(hosts)
	return hosts
}
