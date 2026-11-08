package ssh

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os/exec"
	"sort"
	"strconv"
	"strings"
)

// DiscoverMovedHost scans the previous IPv4 address's /24 and returns a host
// only when its SSH public host key exactly matches a key already trusted for
// the previous address.
func (c Client) DiscoverMovedHost(ctx context.Context) (string, error) {
	candidates, err := subnetCandidates(c.Config.Host)
	if err != nil {
		return "", err
	}
	lookup := c.Config.Host
	if c.Config.Port != 22 {
		lookup = fmt.Sprintf("[%s]:%d", lookup, c.Config.Port)
	}
	known, err := exec.CommandContext(ctx, "ssh-keygen", "-F", lookup).Output()
	if err != nil {
		return "", fmt.Errorf("no trusted SSH key found for %s", lookup)
	}
	trusted := parseHostKeys(string(known))
	if len(trusted) == 0 {
		return "", fmt.Errorf("no usable SSH key found for %s", lookup)
	}

	args := []string{"-T", "2", "-p", strconv.Itoa(c.Config.Port)}
	args = append(args, candidates...)
	scanned, scanErr := exec.CommandContext(ctx, "ssh-keyscan", args...).Output()
	matches := matchingHosts(string(scanned), trusted)
	if len(matches) == 0 {
		if errors.Is(ctx.Err(), context.Canceled) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return "", ctx.Err()
		}
		if scanErr != nil && len(scanned) == 0 {
			return "", fmt.Errorf("LAN SSH scan failed: %w", scanErr)
		}
		return "", fmt.Errorf("server key was not found on %s.0/24", strings.Join(strings.Split(c.Config.Host, ".")[:3], "."))
	}
	if len(matches) > 1 {
		return "", fmt.Errorf("server key matched multiple addresses: %s", strings.Join(matches, ", "))
	}
	return matches[0], nil
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
