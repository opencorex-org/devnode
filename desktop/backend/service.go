package backend

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/opencorex-org/devnode/internal/catalog"
	"github.com/opencorex-org/devnode/internal/config"
	"github.com/opencorex-org/devnode/internal/pairing"
	devssh "github.com/opencorex-org/devnode/internal/ssh"
	"github.com/opencorex-org/devnode/internal/status"
)

const requestTimeout = 20 * time.Second

type Service struct {
	mu       sync.Mutex
	sessions map[string]pairSession
}

type pairSession struct {
	Server       pairing.Server
	IdentityPath string
	HostKey      string
	Code         string
}

type ToolCheck struct {
	Name      string `json:"name"`
	Available bool   `json:"available"`
	Path      string `json:"path"`
}

type Bootstrap struct {
	Platform   string        `json:"platform"`
	ConfigPath string        `json:"configPath"`
	Configured bool          `json:"configured"`
	Config     config.Config `json:"config"`
	Tools      []ToolCheck   `json:"tools"`
}

type ConnectionInput struct {
	Host            string `json:"host"`
	User            string `json:"user"`
	Port            int    `json:"port"`
	IdentityFile    string `json:"identityFile"`
	ConnectTimeout  int    `json:"connectTimeout"`
	PostgresService string `json:"postgresService"`
}

type ConnectionResult struct {
	Target  string `json:"target"`
	Message string `json:"message"`
}

type Dashboard struct {
	Target    string              `json:"target"`
	UpdatedAt string              `json:"updatedAt"`
	Snapshot  status.Snapshot     `json:"snapshot"`
	Tools     []status.ActiveTool `json:"tools"`
}

type CatalogItem struct {
	Name        string   `json:"name"`
	Label       string   `json:"label"`
	Method      string   `json:"method"`
	Description string   `json:"description"`
	Guided      bool     `json:"guided"`
	Steps       []string `json:"steps"`
}

type Project struct {
	Name           string `json:"name"`
	PackageManager string `json:"packageManager"`
	Branch         string `json:"branch"`
	Dirty          bool   `json:"dirty"`
}

type PairProgress struct {
	Status          string `json:"status"`
	Message         string `json:"message"`
	RequestID       string `json:"requestId"`
	Code            string `json:"code"`
	ServerName      string `json:"serverName"`
	ServerUser      string `json:"serverUser"`
	HostFingerprint string `json:"hostFingerprint"`
	Target          string `json:"target"`
}

func New() *Service { return &Service{sessions: map[string]pairSession{}} }

func (s *Service) Bootstrap() (Bootstrap, error) {
	path := config.DefaultPath()
	cfg, configured, err := loadOrDefault(path)
	if err != nil {
		return Bootstrap{}, err
	}
	return Bootstrap{
		Platform:   runtime.GOOS,
		ConfigPath: path,
		Configured: configured,
		Config:     cfg,
		Tools: []ToolCheck{
			checkTool("ssh"),
			checkTool("ssh-keygen"),
			checkTool("ssh-keyscan"),
		},
	}, nil
}

func (s *Service) SaveConnection(input ConnectionInput) (ConnectionResult, error) {
	cfg := config.Config{
		Host:            strings.TrimSpace(input.Host),
		User:            strings.TrimSpace(input.User),
		Port:            input.Port,
		IdentityFile:    strings.TrimSpace(input.IdentityFile),
		ConnectTimeout:  input.ConnectTimeout,
		PostgresService: strings.TrimSpace(input.PostgresService),
	}
	if cfg.Host == "" {
		cfg.Host = "auto"
	}
	if cfg.Port == 0 {
		cfg.Port = 22
	}
	if cfg.ConnectTimeout == 0 {
		cfg.ConnectTimeout = 8
	}
	if cfg.PostgresService == "" {
		cfg.PostgresService = "postgresql"
	}
	if err := config.Save(config.DefaultPath(), cfg); err != nil {
		return ConnectionResult{}, fmt.Errorf("save connection: %w", err)
	}
	return ConnectionResult{Target: config.Target(cfg), Message: "Connection settings saved."}, nil
}

func (s *Service) DiscoverPairingServers() ([]pairing.Server, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return pairing.Discover(ctx)
}

func (s *Service) RequestPair(server pairing.Server) (PairProgress, error) {
	if server.Address == "" || server.Port < 1 || server.Port > 65535 || server.SessionID == "" {
		return PairProgress{}, errors.New("invalid Ubuntu pairing server")
	}
	identityPath, publicKey, err := ensureIdentity()
	if err != nil {
		return PairProgress{}, err
	}
	deviceName, err := os.Hostname()
	if err != nil {
		return PairProgress{}, err
	}
	nonce, err := pairing.RandomID(24)
	if err != nil {
		return PairProgress{}, err
	}
	normalizedKey, err := pairing.NormalizePublicKey(publicKey, deviceName)
	if err != nil {
		return PairProgress{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()
	response, err := pairing.Exchange(ctx, server.Address, server.Port, pairing.Request{
		Protocol: pairing.Protocol, Action: "pair", SessionID: server.SessionID,
		DeviceName: deviceName, PublicKey: publicKey, ClientNonce: nonce,
	})
	if err != nil {
		return PairProgress{}, err
	}
	expectedCode := pairing.PairingCode(server.SessionID, nonce, normalizedKey, response.HostKey)
	if response.Code != expectedCode {
		return PairProgress{}, errors.New("pairing code verification failed; cancel pairing on both devices")
	}
	fingerprint, err := pairing.Fingerprint(response.HostKey)
	if err != nil || fingerprint != response.HostFingerprint || server.HostFingerprint != response.HostFingerprint {
		return PairProgress{}, errors.New("Ubuntu SSH host identity changed during pairing")
	}
	s.mu.Lock()
	s.sessions[response.RequestID] = pairSession{Server: server, IdentityPath: identityPath, HostKey: response.HostKey, Code: response.Code}
	s.mu.Unlock()
	return progress(response, ""), nil
}

func (s *Service) PairStatus(requestID string) (PairProgress, error) {
	s.mu.Lock()
	session, ok := s.sessions[requestID]
	s.mu.Unlock()
	if !ok {
		return PairProgress{}, errors.New("pairing session was not found")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	response, err := pairing.Exchange(ctx, session.Server.Address, session.Server.Port, pairing.Request{Protocol: pairing.Protocol, Action: "status", RequestID: requestID})
	if err != nil {
		return PairProgress{}, err
	}
	if response.Code != session.Code || response.HostKey != session.HostKey {
		return PairProgress{}, errors.New("pairing response identity mismatch")
	}
	target := ""
	if response.Status == "approved" {
		if err := trustHost(session.Server.Address, 22, response.HostKey); err != nil {
			return PairProgress{}, err
		}
		cfg := config.Defaults()
		if current, _, loadErr := loadOrDefault(config.DefaultPath()); loadErr == nil {
			cfg = current
		}
		cfg.Host, cfg.User, cfg.Port, cfg.IdentityFile = session.Server.Address, response.ServerUser, 22, session.IdentityPath
		if err := config.Save(config.DefaultPath(), cfg); err != nil {
			return PairProgress{}, fmt.Errorf("save paired connection: %w", err)
		}
		target = config.Target(cfg)
		s.mu.Lock()
		delete(s.sessions, requestID)
		s.mu.Unlock()
	}
	return progress(response, target), nil
}

func (s *Service) Discover() (ConnectionResult, error) {
	cfg, _, err := loadOrDefault(config.DefaultPath())
	if err != nil {
		return ConnectionResult{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	client := devssh.Client{Config: cfg}
	host, err := client.DiscoverMovedHost(ctx)
	if err != nil {
		return ConnectionResult{}, fmt.Errorf("discover server: %w", err)
	}
	cfg.Host = host
	if err := config.Save(config.DefaultPath(), cfg); err != nil {
		return ConnectionResult{}, fmt.Errorf("save discovered server: %w", err)
	}
	return ConnectionResult{Target: config.Target(cfg), Message: "Server discovered and saved."}, nil
}

func (s *Service) TestConnection() (ConnectionResult, error) {
	cfg, err := loadConfigured()
	if err != nil {
		return ConnectionResult{}, err
	}
	updated, out, err := outputWithRecovery(cfg, "printf 'connected\\n'")
	if err != nil {
		return ConnectionResult{}, err
	}
	return ConnectionResult{Target: config.Target(updated), Message: strings.TrimSpace(string(out))}, nil
}

func (s *Service) Dashboard() (Dashboard, error) {
	cfg, err := loadConfigured()
	if err != nil {
		return Dashboard{}, err
	}
	updated, out, err := outputWithRecovery(cfg, status.Script(cfg.PostgresService))
	if err != nil {
		return Dashboard{}, err
	}
	snapshot, err := status.Parse(string(out))
	if err != nil {
		return Dashboard{}, fmt.Errorf("parse server status: %w", err)
	}
	return Dashboard{
		Target:    config.Target(updated),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		Snapshot:  snapshot,
		Tools:     status.DisplayTools(snapshot.Tools),
	}, nil
}

func (s *Service) Catalog() []CatalogItem {
	names := catalog.Names()
	items := make([]CatalogItem, 0, len(names))
	for _, name := range names {
		item, ok := catalog.Get(name)
		if !ok {
			continue
		}
		steps := item.Steps
		if len(steps) == 0 {
			steps = serviceGuideSteps(item.Name)
		}
		items = append(items, CatalogItem{
			Name: item.Name, Label: item.Label, Method: item.Method,
			Description: item.Description, Guided: true, Steps: steps,
		})
	}
	return items
}

func serviceGuideSteps(name string) []string {
	switch name {
	case "docker":
		return []string{
			"# 1. Install via DevNode CLI",
			"devnode install docker",
			"",
			"# 2. Or manual install on Ubuntu",
			"sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2",
			"sudo systemctl enable --now docker",
			"sudo usermod -aG docker \"$USER\"",
			"",
			"# 3. Verify Docker is running",
			"docker --version && docker ps",
		}
	case "postgresql":
		return []string{
			"# 1. Install via DevNode CLI",
			"devnode install postgresql",
			"",
			"# 2. Or manual install on Ubuntu",
			"sudo apt-get update && sudo apt-get install -y postgresql",
			"sudo systemctl enable --now postgresql",
			"",
			"# 3. Forward PostgreSQL port (5432) to your Mac",
			"devnode tunnel postgresql",
			"",
			"# 4. Connect locally with psql or GUI client",
			"psql -h 127.0.0.1 -p 5432 -U postgres",
		}
	case "redis":
		return []string{
			"# 1. Install via DevNode CLI",
			"devnode install redis",
			"",
			"# 2. Or manual install on Ubuntu",
			"sudo apt-get update && sudo apt-get install -y redis-server",
			"sudo systemctl enable --now redis-server",
			"",
			"# 3. Forward Redis port (6379) to your Mac",
			"devnode tunnel redis",
			"",
			"# 4. Test connection",
			"redis-cli -h 127.0.0.1 -p 6379 ping",
		}
	case "mosquitto":
		return []string{
			"# 1. Install via DevNode CLI",
			"devnode install mosquitto",
			"",
			"# 2. Or manual install on Ubuntu",
			"sudo apt-get update && sudo apt-get install -y mosquitto mosquitto-clients",
			"sudo systemctl enable --now mosquitto",
			"",
			"# 3. Forward MQTT port (1883) to your Mac",
			"devnode tunnel mosquitto",
			"",
			"# 4. Test MQTT pub/sub",
			"mosquitto_sub -h 127.0.0.1 -p 1883 -t 'test/topic'",
		}
	case "portainer":
		return []string{
			"# 1. Install via DevNode CLI (requires Docker)",
			"devnode install portainer",
			"",
			"# 2. Or run Portainer container directly",
			"docker volume create portainer_data",
			"docker run -d --name portainer --restart=always -p 127.0.0.1:9443:9443 -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:sts",
			"",
			"# 3. Forward Portainer to your Mac",
			"devnode tunnel portainer",
			"",
			"# 4. Open web interface in browser",
			"#    Visit: https://localhost:9443",
		}
	case "uptime-kuma":
		return []string{
			"# 1. Install via DevNode CLI (requires Docker)",
			"devnode install uptime-kuma",
			"",
			"# 2. Or run Uptime Kuma container directly",
			"docker volume create uptime-kuma",
			"docker run -d --name uptime-kuma --restart=unless-stopped -p 127.0.0.1:3001:3001 -v uptime-kuma:/app/data louislam/uptime-kuma:2",
			"",
			"# 3. Forward dashboard to your Mac",
			"devnode tunnel uptime-kuma",
			"",
			"# 4. Open in browser",
			"#    Visit: http://localhost:3001",
		}
	case "dozzle":
		return []string{
			"# 1. Install via DevNode CLI (requires Docker)",
			"devnode install dozzle",
			"",
			"# 2. Or run Dozzle container directly",
			"docker volume create dozzle_data",
			"docker run -d --name dozzle --restart=unless-stopped -p 127.0.0.1:8080:8080 -v /var/run/docker.sock:/var/run/docker.sock:ro -v dozzle_data:/data amir20/dozzle:latest",
			"",
			"# 3. Forward log viewer to your Mac",
			"devnode tunnel dozzle",
			"",
			"# 4. Open in browser",
			"#    Visit: http://localhost:8080",
		}
	case "mailpit":
		return []string{
			"# 1. Install via DevNode CLI (requires Docker)",
			"devnode install mailpit",
			"",
			"# 2. Or run Mailpit container directly",
			"docker run -d --name mailpit --restart=unless-stopped -p 127.0.0.1:8025:8025 -p 127.0.0.1:1025:1025 axllent/mailpit:latest",
			"",
			"# 3. Forward Mailpit UI to your Mac",
			"devnode tunnel mailpit",
			"",
			"# 4. Access UI & SMTP",
			"#    Web UI: http://localhost:8025  |  SMTP: localhost:1025",
		}
	case "node-red":
		return []string{
			"# 1. Install via DevNode CLI (requires Docker)",
			"devnode install node-red",
			"",
			"# 2. Or run Node-RED container directly",
			"docker volume create node-red-data",
			"docker run -d --name node-red --restart=unless-stopped -p 127.0.0.1:1880:1880 -v node-red-data:/data nodered/node-red:latest",
			"",
			"# 3. Forward editor to your Mac",
			"devnode tunnel node-red",
			"",
			"# 4. Open in browser",
			"#    Visit: http://localhost:1880",
		}
	case "mongodb":
		return []string{
			"# 1. Install via DevNode CLI (auto-detects AVX)",
			"devnode install mongodb",
			"",
			"# 2. Or run MongoDB container directly",
			"docker volume create mongodb-data",
			"docker run -d --name mongodb --restart=unless-stopped -p 127.0.0.1:27017:27017 -v mongodb-data:/data/db mongo:8",
			"",
			"# 3. Forward MongoDB to your Mac",
			"devnode tunnel mongodb",
			"",
			"# 4. Connect locally with mongosh or MongoDB Compass",
			"mongosh mongodb://127.0.0.1:27017",
		}
	case "jupyter":
		return []string{
			"# 1. Install via DevNode CLI (requires Docker)",
			"devnode install jupyter",
			"",
			"# 2. Or run Jupyter container directly",
			"docker volume create jupyter-data",
			"docker run -d --name jupyter --restart=unless-stopped -p 127.0.0.1:8888:8888 -v jupyter-data:/home/jovyan/work -e JUPYTER_ENABLE_LAB=yes jupyter/minimal-notebook:latest start-notebook.py --NotebookApp.token='' --NotebookApp.password='' --ip=0.0.0.0",
			"",
			"# 3. Forward Jupyter to your Mac",
			"devnode tunnel jupyter",
			"",
			"# 4. Open in browser",
			"#    Visit: http://localhost:8888",
		}
	default:
		return []string{
			"# 1. Install via DevNode CLI",
			"devnode install " + name,
			"",
			"# 2. Check service status",
			"devnode status",
		}
	}
}

func (s *Service) ManageService(name, action string) (string, error) {
	if !safeName(name) {
		return "", errors.New("invalid service name")
	}
	if action != "start" && action != "stop" && action != "restart" {
		return "", errors.New("service action must be start, stop, or restart")
	}
	cfg, err := loadConfigured()
	if err != nil {
		return "", err
	}
	const script = `name=$1; action=$2; postgres_unit=$3
if command -v docker >/dev/null 2>&1 && docker inspect "$name" >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then docker "$action" "$name"; else sudo docker "$action" "$name"; fi
else
  unit=$name
  [ "$name" = postgresql ] && unit=$postgres_unit
  if [ "$name" = github-runner ]; then
    unit=$(systemctl list-unit-files 'actions.runner.*.service' --no-legend 2>/dev/null | awk 'NR==1 {print $1}')
    [ -n "$unit" ] || { printf '%s\n' 'GitHub Actions runner service was not found.' >&2; exit 3; }
  fi
  sudo systemctl "$action" "$unit"
fi`
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	var stdout, stderr bytes.Buffer
	client := devssh.Client{Config: cfg, Out: &stdout, Err: &stderr}
	if err := client.Run(ctx, []string{"sh", "-c", script, "devnode-service", name, action, cfg.PostgresService}, false, false); err != nil {
		return "", connectionError(err, stderr.String())
	}
	message := strings.TrimSpace(stdout.String())
	if message == "" {
		message = fmt.Sprintf("%s %s completed", name, action)
	}
	return message, nil
}

func (s *Service) Projects() ([]Project, error) {
	cfg, err := loadConfigured()
	if err != nil {
		return nil, err
	}
	const script = `for d in "$HOME"/projects/*; do
  [ -d "$d" ] || continue
  name=$(basename "$d")
  pm=none
  [ -f "$d/pnpm-lock.yaml" ] && pm=pnpm
  [ "$pm" = none ] && [ -f "$d/yarn.lock" ] && pm=yarn
  [ "$pm" = none ] && [ -f "$d/bun.lockb" ] && pm=bun
  [ "$pm" = none ] && [ -f "$d/package.json" ] && pm=npm
  branch=-; dirty=0
  if [ -d "$d/.git" ]; then
    branch=$(git -C "$d" branch --show-current 2>/dev/null || printf '-')
    [ -n "$(git -C "$d" status --porcelain 2>/dev/null)" ] && dirty=1
  fi
  printf '%s\t%s\t%s\t%s\n' "$name" "$pm" "$branch" "$dirty"
done`
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	client, stderr := clientFor(cfg)
	out, err := client.OutputBatch(ctx, script)
	if err != nil {
		return nil, connectionError(err, stderr.String())
	}
	var projects []Project
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) != 4 {
			continue
		}
		projects = append(projects, Project{Name: parts[0], PackageManager: parts[1], Branch: parts[2], Dirty: parts[3] == "1"})
	}
	sort.Slice(projects, func(i, j int) bool { return projects[i].Name < projects[j].Name })
	return projects, nil
}

func (s *Service) CreateProject(name string) (string, error) {
	if !safeName(name) {
		return "", errors.New("project name may contain only letters, numbers, dots, dashes, and underscores")
	}
	cfg, err := loadConfigured()
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	client, stderr := clientFor(cfg)
	script := `mkdir -p "$HOME/projects/$1" && printf 'Created ~/projects/%s\n' "$1"`
	out, err := client.Output(ctx, devssh.JoinCommand([]string{"sh", "-c", script, "devnode-project", name}))
	if err != nil {
		return "", connectionError(err, stderr.String())
	}
	return strings.TrimSpace(string(out)), nil
}

func (s *Service) DeleteProject(name string) (string, error) {
	if !safeName(name) {
		return "", errors.New("project name may contain only letters, numbers, dots, dashes, and underscores")
	}
	cfg, err := loadConfigured()
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	client, stderr := clientFor(cfg)
	script := `rm -rf "$HOME/projects/$1" && printf 'Deleted ~/projects/%s\n' "$1"`
	out, err := client.Output(ctx, devssh.JoinCommand([]string{"sh", "-c", script, "devnode-project", name}))
	if err != nil {
		return "", connectionError(err, stderr.String())
	}
	return strings.TrimSpace(string(out)), nil
}

func (s *Service) ConnectionCommand() (string, error) {
	cfg, err := loadConfigured()
	if err != nil {
		return "", err
	}
	args := []string{"ssh", "-p", strconv.Itoa(cfg.Port)}
	if cfg.IdentityFile != "" {
		args = append(args, "-i", cfg.IdentityFile)
	}
	args = append(args, config.Target(cfg))
	return shellDisplay(args), nil
}

func loadOrDefault(path string) (config.Config, bool, error) {
	_, statErr := os.Stat(path)
	configured := statErr == nil
	if statErr != nil && !errors.Is(statErr, os.ErrNotExist) {
		return config.Config{}, false, fmt.Errorf("inspect config: %w", statErr)
	}
	if configured {
		cfg, err := config.Load(path)
		return cfg, true, err
	}
	cfg := config.Defaults()
	cfg.Host = "auto"
	if current, err := user.Current(); err == nil {
		cfg.User = current.Username
	}
	return cfg, false, nil
}

func loadConfigured() (config.Config, error) {
	cfg, configured, err := loadOrDefault(config.DefaultPath())
	if err != nil {
		return cfg, err
	}
	if !configured {
		return cfg, errors.New("connection is not configured")
	}
	if config.NeedsDiscovery(cfg.Host) {
		return cfg, errors.New("discover a server before connecting")
	}
	return cfg, nil
}

func clientFor(cfg config.Config) (devssh.Client, *bytes.Buffer) {
	var stderr bytes.Buffer
	return devssh.Client{Config: cfg, Err: &stderr}, &stderr
}

func checkTool(name string) ToolCheck {
	path, err := exec.LookPath(name)
	return ToolCheck{Name: name, Available: err == nil, Path: path}
}

func connectionError(err error, stderr string) error {
	detail := strings.TrimSpace(stderr)
	if detail == "" || strings.Contains(err.Error(), detail) {
		return err
	}
	return fmt.Errorf("%w: %s", err, detail)
}

func outputWithRecovery(cfg config.Config, script string) (config.Config, []byte, error) {
	run := func(current config.Config) ([]byte, error) {
		ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
		defer cancel()
		client, stderr := clientFor(current)
		out, err := client.OutputBatch(ctx, script)
		if err != nil {
			return nil, connectionError(err, stderr.String())
		}
		return out, nil
	}
	out, err := run(cfg)
	if err == nil {
		return cfg, out, nil
	}
	discoveryCtx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	client := devssh.Client{Config: cfg}
	host, discoveryErr := client.DiscoverMovedHost(discoveryCtx)
	if discoveryErr != nil || host == cfg.Host {
		return cfg, nil, err
	}
	cfg.Host = host
	if saveErr := config.Save(config.DefaultPath(), cfg); saveErr != nil {
		return cfg, nil, saveErr
	}
	out, err = run(cfg)
	return cfg, out, err
}

func safeName(value string) bool {
	if value == "" || value == "." || value == ".." || len(value) > 64 {
		return false
	}
	for _, r := range value {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || strings.ContainsRune("._-", r)) {
			return false
		}
	}
	return true
}

func shellDisplay(args []string) string {
	quoted := make([]string, len(args))
	for i, arg := range args {
		if strings.ContainsAny(arg, " \t\"") {
			quoted[i] = strconv.Quote(arg)
		} else {
			quoted[i] = arg
		}
	}
	return strings.Join(quoted, " ")
}

func progress(response pairing.Response, target string) PairProgress {
	return PairProgress{
		Status: response.Status, Message: response.Message, RequestID: response.RequestID,
		Code: response.Code, ServerName: response.ServerName, ServerUser: response.ServerUser,
		HostFingerprint: response.HostFingerprint, Target: target,
	}
}

func ensureIdentity() (string, string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", "", err
	}
	directory := filepath.Join(home, ".ssh")
	path := filepath.Join(directory, "devnode_ed25519")
	if err := os.MkdirAll(directory, 0700); err != nil {
		return "", "", err
	}
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		command := exec.Command("ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "devnode", "-f", path)
		if output, commandErr := command.CombinedOutput(); commandErr != nil {
			return "", "", fmt.Errorf("generate DevNode identity: %w: %s", commandErr, strings.TrimSpace(string(output)))
		}
	} else if err != nil {
		return "", "", err
	}
	publicKey, err := os.ReadFile(path + ".pub")
	if err != nil {
		return "", "", err
	}
	return path, strings.TrimSpace(string(publicKey)), nil
}

func trustHost(address string, port int, hostKey string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	directory := filepath.Join(home, ".ssh")
	if err := os.MkdirAll(directory, 0700); err != nil {
		return err
	}
	path := filepath.Join(directory, "known_hosts")
	target := pairing.HostTarget(address, port)
	data, err := os.ReadFile(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	wanted := strings.Join(strings.Fields(hostKey)[:2], " ")
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		matches := false
		for _, host := range strings.Split(fields[0], ",") {
			if host == target {
				matches = true
			}
		}
		if !matches {
			continue
		}
		existing := strings.Join(fields[1:3], " ")
		if existing == wanted {
			return nil
		}
		return fmt.Errorf("a different SSH host key already exists for %s; verify and remove it manually before pairing", target)
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}
	defer file.Close()
	if len(data) > 0 && data[len(data)-1] != '\n' {
		if _, err := file.WriteString("\n"); err != nil {
			return err
		}
	}
	_, err = fmt.Fprintf(file, "%s %s\n", target, wanted)
	return err
}
