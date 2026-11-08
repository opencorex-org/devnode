package pairing

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"sort"
	"sync"
	"time"
)

const discoveryMessage = "DEVNODE_DISCOVER_V1"

func Discover(ctx context.Context) ([]Server, error) {
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4zero, Port: 0})
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	destinations := broadcastAddresses()
	for _, address := range destinations {
		_, _ = conn.WriteToUDP([]byte(discoveryMessage), &net.UDPAddr{IP: address, Port: DiscoveryPort})
	}
	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	found := map[string]Server{}
	buffer := make([]byte, 4096)
	for {
		if err := ctx.Err(); err != nil {
			break
		}
		n, remote, err := conn.ReadFromUDP(buffer)
		if err != nil {
			var netErr net.Error
			if errors.As(err, &netErr) && netErr.Timeout() {
				break
			}
			return nil, err
		}
		var server Server
		if json.Unmarshal(buffer[:n], &server) != nil || server.SessionID == "" {
			continue
		}
		server.Address = remote.IP.String()
		found[server.SessionID] = server
	}
	if len(found) == 0 {
		for _, server := range scanPairingPort(ctx) {
			found[server.SessionID] = server
		}
	}
	servers := make([]Server, 0, len(found))
	for _, server := range found {
		servers = append(servers, server)
	}
	sort.Slice(servers, func(i, j int) bool { return servers[i].Name < servers[j].Name })
	return servers, nil
}

func scanPairingPort(ctx context.Context) []Server {
	candidates := subnetAddresses()
	results := make(chan Server, len(candidates))
	var wait sync.WaitGroup
	limit := make(chan struct{}, 64)
	for _, address := range candidates {
		address := address
		wait.Add(1)
		go func() {
			defer wait.Done()
			select {
			case limit <- struct{}{}:
			case <-ctx.Done():
				return
			}
			defer func() { <-limit }()
			probeCtx, cancel := context.WithTimeout(ctx, 350*time.Millisecond)
			defer cancel()
			response, err := Exchange(probeCtx, address, PairingPort, Request{Protocol: Protocol, Action: "info"})
			if err == nil && response.SessionID != "" {
				results <- Server{Name: response.ServerName, Address: address, Port: response.Port, User: response.ServerUser, SessionID: response.SessionID, HostFingerprint: response.HostFingerprint}
			}
		}()
	}
	go func() { wait.Wait(); close(results) }()
	var servers []Server
	for server := range results {
		servers = append(servers, server)
	}
	return servers
}

func subnetAddresses() []string {
	seen := map[string]bool{}
	var addresses []string
	interfaces, _ := net.Interfaces()
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		items, _ := iface.Addrs()
		for _, item := range items {
			network, ok := item.(*net.IPNet)
			if !ok || network.IP.To4() == nil {
				continue
			}
			ip := network.IP.To4()
			prefix := net.IPv4(ip[0], ip[1], ip[2], 0)
			for last := 1; last < 255; last++ {
				candidate := net.IPv4(prefix[12], prefix[13], prefix[14], byte(last)).String()
				if candidate != ip.String() && !seen[candidate] {
					seen[candidate] = true
					addresses = append(addresses, candidate)
				}
			}
		}
	}
	return addresses
}

func ServeDiscovery(ctx context.Context, server Server) error {
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4zero, Port: DiscoveryPort})
	if err != nil {
		return err
	}
	defer conn.Close()
	payload, _ := json.Marshal(server)
	buffer := make([]byte, 256)
	for {
		_ = conn.SetReadDeadline(time.Now().Add(time.Second))
		n, remote, err := conn.ReadFromUDP(buffer)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			continue
		}
		if string(buffer[:n]) != discoveryMessage || !localAddress(remote.IP) {
			continue
		}
		_, _ = conn.WriteToUDP(payload, remote)
	}
}

func broadcastAddresses() []net.IP {
	addresses := []net.IP{net.IPv4bcast, net.IPv4(127, 0, 0, 1)}
	interfaces, _ := net.Interfaces()
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		items, _ := iface.Addrs()
		for _, item := range items {
			network, ok := item.(*net.IPNet)
			if !ok || network.IP.To4() == nil || len(network.Mask) != 4 {
				continue
			}
			ip := network.IP.To4()
			addresses = append(addresses, net.IPv4(ip[0]|^network.Mask[0], ip[1]|^network.Mask[1], ip[2]|^network.Mask[2], ip[3]|^network.Mask[3]))
		}
	}
	return addresses
}

func localAddress(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate()
}
