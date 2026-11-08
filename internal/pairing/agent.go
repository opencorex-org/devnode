package pairing

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/user"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Agent struct {
	In              io.Reader
	Out             io.Writer
	Name            string
	User            string
	SessionID       string
	HostKey         string
	HostFingerprint string
	Port            int
	ExpiresAt       time.Time

	mu      sync.Mutex
	pending map[string]*Pending
	prompt  sync.Mutex
}

func NewAgent(in io.Reader, out io.Writer, duration time.Duration) (*Agent, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return nil, err
	}
	current, err := user.Current()
	if err != nil {
		return nil, err
	}
	hostKeyData, err := os.ReadFile("/etc/ssh/ssh_host_ed25519_key.pub")
	if err != nil {
		return nil, fmt.Errorf("read Ubuntu SSH host key: %w (is openssh-server installed?)", err)
	}
	hostFields := strings.Fields(string(hostKeyData))
	if len(hostFields) < 2 {
		return nil, errors.New("Ubuntu SSH host key has an invalid format")
	}
	hostKey := strings.Join(hostFields[:2], " ")
	hostFingerprint, err := Fingerprint(hostKey)
	if err != nil {
		return nil, err
	}
	sessionID, err := RandomID(16)
	if err != nil {
		return nil, err
	}
	return &Agent{
		In: in, Out: out, Name: hostname, User: current.Username, SessionID: sessionID,
		HostKey: hostKey, HostFingerprint: hostFingerprint, Port: PairingPort,
		ExpiresAt: time.Now().Add(duration), pending: map[string]*Pending{},
	}, nil
}

func (a *Agent) Run(ctx context.Context) error {
	listener, err := net.Listen("tcp4", ":"+strconv.Itoa(a.Port))
	if err != nil {
		return err
	}
	defer listener.Close()
	go func() {
		<-ctx.Done()
		listener.Close()
	}()
	server := Server{Name: a.Name, Port: a.Port, User: a.User, SessionID: a.SessionID, HostFingerprint: a.HostFingerprint}
	go func() { _ = ServeDiscovery(ctx, server) }()

	for {
		connection, acceptErr := listener.Accept()
		if acceptErr != nil {
			if ctx.Err() != nil {
				return nil
			}
			continue
		}
		go a.handle(connection)
	}
}

func (a *Agent) handle(connection net.Conn) {
	defer connection.Close()
	remote, _ := connection.RemoteAddr().(*net.TCPAddr)
	if remote == nil || !localAddress(remote.IP) {
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: "pairing is limited to the local network"})
		return
	}
	_ = connection.SetDeadline(time.Now().Add(10 * time.Second))
	var request Request
	if err := json.NewDecoder(bufio.NewReader(connection)).Decode(&request); err != nil {
		return
	}
	if request.Protocol != Protocol {
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: "unsupported pairing protocol"})
		return
	}
	switch request.Action {
	case "info":
		_ = json.NewEncoder(connection).Encode(Response{Status: "ready", SessionID: a.SessionID, Port: a.Port, ServerName: a.Name, ServerUser: a.User, HostFingerprint: a.HostFingerprint, ExpiresAt: a.ExpiresAt.UTC().Format(time.RFC3339)})
	case "pair":
		a.handlePair(connection, request)
	case "status":
		a.handleStatus(connection, request.RequestID)
	default:
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: "unknown pairing action"})
	}
}

func (a *Agent) handlePair(connection net.Conn, request Request) {
	if time.Now().After(a.ExpiresAt) || request.SessionID != a.SessionID {
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: "pairing window expired"})
		return
	}
	if len(request.DeviceName) > 128 || len(request.PublicKey) > 2048 || len(request.ClientNonce) > 128 {
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: "invalid pairing request"})
		return
	}
	key, err := NormalizePublicKey(request.PublicKey, request.DeviceName)
	if err != nil {
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: err.Error()})
		return
	}
	requestID, err := RandomID(16)
	if err != nil {
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: err.Error()})
		return
	}
	pending := &Pending{
		RequestID: requestID, DeviceName: request.DeviceName, PublicKey: key,
		Code: PairingCode(a.SessionID, request.ClientNonce, key, a.HostKey), Status: "pending",
		ExpiresAt: time.Now().Add(2 * time.Minute), HostKey: a.HostKey, HostFingerprint: a.HostFingerprint,
	}
	a.mu.Lock()
	a.pending[requestID] = pending
	a.mu.Unlock()
	_ = json.NewEncoder(connection).Encode(a.response(pending))
	go a.askApproval(pending)
}

func (a *Agent) handleStatus(connection net.Conn, requestID string) {
	a.mu.Lock()
	pending := a.pending[requestID]
	if pending != nil && time.Now().After(pending.ExpiresAt) && pending.Status == "pending" {
		pending.Status = "expired"
		pending.Message = "pairing approval expired"
	}
	a.mu.Unlock()
	if pending == nil {
		_ = json.NewEncoder(connection).Encode(Response{Status: "error", Message: "pairing request was not found"})
		return
	}
	_ = json.NewEncoder(connection).Encode(a.response(pending))
}

func (a *Agent) response(pending *Pending) Response {
	return Response{
		Status: pending.Status, Message: pending.Message, RequestID: pending.RequestID,
		SessionID: a.SessionID, Port: a.Port,
		Code: pending.Code, ServerName: a.Name, ServerUser: a.User, HostKey: pending.HostKey,
		HostFingerprint: pending.HostFingerprint, ExpiresAt: pending.ExpiresAt.UTC().Format(time.RFC3339),
	}
}

func (a *Agent) askApproval(pending *Pending) {
	a.prompt.Lock()
	defer a.prompt.Unlock()
	if time.Now().After(pending.ExpiresAt) {
		return
	}
	fingerprint, _ := Fingerprint(pending.PublicKey)
	fmt.Fprintf(a.Out, "\nPairing request from %s\nClient key: %s\nPairing code: %s\nApprove this device? [y/N]: ", pending.DeviceName, fingerprint, pending.Code)
	answer, _ := bufio.NewReader(a.In).ReadString('\n')
	a.mu.Lock()
	defer a.mu.Unlock()
	if time.Now().After(pending.ExpiresAt) {
		pending.Status, pending.Message = "expired", "pairing approval expired"
		return
	}
	if strings.EqualFold(strings.TrimSpace(answer), "y") || strings.EqualFold(strings.TrimSpace(answer), "yes") {
		if _, err := AddDevice(pending.DeviceName, pending.PublicKey); err != nil {
			pending.Status, pending.Message = "error", err.Error()
			fmt.Fprintln(a.Out, "Pairing failed:", err)
			return
		}
		pending.Status, pending.Message = "approved", "Ubuntu approved this device"
		fmt.Fprintln(a.Out, "Device approved. DevNode can now connect using SSH.")
		return
	}
	pending.Status, pending.Message = "rejected", "Ubuntu rejected this device"
	fmt.Fprintln(a.Out, "Pairing rejected.")
}
