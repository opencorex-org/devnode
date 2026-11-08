package cli

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/lahiruudayakumara/devnode/internal/catalog"
	"github.com/lahiruudayakumara/devnode/internal/config"
	devssh "github.com/lahiruudayakumara/devnode/internal/ssh"
	"github.com/lahiruudayakumara/devnode/internal/status"
	devtui "github.com/lahiruudayakumara/devnode/internal/tui"
	"github.com/lahiruudayakumara/devnode/internal/ui"
)

const Version = "0.5.0"

const hardwareScript = `printf '%s\n' '========== CPU =========='; lscpu | grep -E 'Model name|CPU\(s\)|Architecture'; printf '%s\n' '========== RAM =========='; free -h; printf '%s\n' '========== STORAGE =========='; lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS; printf '%s\n' '========== DISK SPACE =========='; df -h /; printf '%s\n' '========== GPU =========='; lspci | grep -Ei 'vga|3d|display' || printf '%s\n' 'Not detected'; printf '%s\n' '========== DOCKER =========='; docker --version 2>/dev/null || printf '%s\n' 'Not installed'`

const networkScript = `printf '%s\n' '========== ADDRESSES =========='; hostname -I; ip -brief address; printf '%s\n' '========== ROUTES =========='; ip route; printf '%s\n' '========== LISTENING PORTS =========='; ss -lntup 2>/dev/null || ss -lnt 2>/dev/null; printf '%s\n' '========== DNS =========='; if command -v resolvectl >/dev/null 2>&1; then resolvectl status | sed -n '1,80p'; else cat /etc/resolv.conf; fi`

const projectsScript = `printf '%s\n' 'DevNode Projects (~/projects):'
mkdir -p "$HOME/projects"
found=0
for d in "$HOME/projects"/*; do
  [ -d "$d" ] || continue
  name=$(basename "$d")
  pkg="none"
  [ -f "$d/pnpm-lock.yaml" ] && pkg="pnpm"
  [ -f "$d/package-lock.json" ] && pkg="npm"
  [ -f "$d/yarn.lock" ] && pkg="yarn"
  [ -f "$d/bun.lockb" ] || [ -f "$d/bun.lock" ] && pkg="bun"
  branch=""
  if [ -d "$d/.git" ]; then
    b=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
    [ -n "$b" ] && branch=" (git: $b)"
  fi
  printf '  • %-20s [%-4s]%s\n' "$name" "$pkg" "$branch"
  found=1
done
if [ "$found" -eq 0 ]; then
  printf '  No projects found in ~/projects.\n  Create one with: devnode project create <name>\n'
fi
for root in "$HOME/dev" "$HOME/workspace"; do
  [ -d "$root" ] || continue
  printf '\nOther repositories in %s:\n' "$root"
  find "$root" -maxdepth 3 -type d -name .git 2>/dev/null | while read -r g; do
    printf '  • %s\n' "$(dirname "$g")"
  done
done`

const doctorScript = `printf '%-20s %s\n' CHECK RESULT; for cmd in ssh systemctl docker git curl; do if command -v "$cmd" >/dev/null 2>&1; then printf '%-20s %s\n' "$cmd" OK; else printf '%-20s %s\n' "$cmd" MISSING; fi; done; if docker info >/dev/null 2>&1; then printf '%-20s %s\n' docker-access OK; else printf '%-20s %s\n' docker-access UNAVAILABLE; fi; printf '%-20s %s\n' disk-root "$(df -hP / | awk 'NR==2 {print $5 " used"}')"; printf '%-20s %s\n' memory "$(free -h | awk '/Mem:/ {print $3 " / " $2}')"`

const persistentShellScript = `if ! command -v tmux >/dev/null 2>&1; then
  printf '%s\n' 'tmux is required for persistent sessions.' 'Install it on Ubuntu with: sudo apt-get update && sudo apt-get install -y tmux' >&2
  exit 127
fi
exec tmux new-session -A -s "$1"`

const serviceScript = `container=$1 unit=$2 action=$3
if command -v docker >/dev/null 2>&1 && docker inspect "$container" >/dev/null 2>&1; then
  printf 'manager: docker\nservice: %s\n' "$container"
  if [ "$action" = status ]; then docker inspect -f 'state: {{.State.Status}}' "$container"; else docker "$action" "$container"; fi
  exit
fi
load=$(systemctl show "$unit" -p LoadState --value 2>/dev/null || true)
if [ -z "$load" ] || [ "$load" = not-found ]; then printf 'Service %s is not installed as Docker or systemd.\n' "$container" >&2; exit 3; fi
printf 'manager: systemd\nservice: %s\n' "$unit"
if [ "$action" = status ]; then systemctl status "$unit" --no-pager; else sudo systemctl "$action" "$unit"; fi`

type App struct {
	In       io.Reader
	Out, Err io.Writer
}

func New(in io.Reader, out, errOut io.Writer) *App { return &App{In: in, Out: out, Err: errOut} }
func (a *App) PrintError(err error)                { fmt.Fprintln(a.Err, "devnode:", err) }

func (a *App) Run(ctx context.Context, args []string) error {
	root := flag.NewFlagSet("devnode", flag.ContinueOnError)
	root.SetOutput(a.Err)
	configPath := root.String("config", config.DefaultPath(), "configuration file")
	version := root.Bool("version", false, "print the version")
	root.Usage = func() { fmt.Fprint(a.Out, usage) }
	if err := root.Parse(args); errors.Is(err, flag.ErrHelp) {
		return nil
	} else if err != nil {
		return err
	}
	if *version {
		fmt.Fprintln(a.Out, "devnode "+Version)
		return nil
	}
	args = root.Args()
	if len(args) == 0 {
		root.Usage()
		return nil
	}
	if args[0] == "help" || args[0] == "--help" || args[0] == "-h" {
		root.Usage()
		return nil
	}
	if args[0] == "version" || args[0] == "--version" {
		fmt.Fprintln(a.Out, "devnode "+Version)
		return nil
	}
	if args[0] == "config" {
		return a.configCommand(*configPath, args[1:])
	}

	cfg, err := config.Load(*configPath)
	if err != nil {
		return err
	}
	client := devssh.Client{Config: cfg, In: a.In, Out: a.Out, Err: a.Err}

	if config.NeedsDiscovery(cfg.Host) && args[0] != "discover" {
		fmt.Fprintf(a.Out, "Detecting server on the local network (port %d)...\n", cfg.Port)
		host, err := client.DiscoverMovedHost(ctx)
		if err != nil {
			return fmt.Errorf("auto-discovery: %w", err)
		}
		updated, err := saveDiscoveredHost(*configPath, cfg, host)
		if err != nil {
			return err
		}
		fmt.Fprintf(a.Out, "Found server at %s. Updated %s\n", host, *configPath)
		cfg = updated
		client.Config = updated
	}

	switch args[0] {
	case "discover":
		return a.discover(ctx, client, cfg, *configPath, args[1:])
	case "setup":
		return noArgs(args[1:], func() error { return a.setup(ctx, client, cfg, *configPath) })
	case "connect":
		return a.connect(ctx, client, args[1:])
	case "status", "dashboard":
		return a.status(ctx, client, cfg, args[1:])
	case "monitor":
		return noArgs(args[1:], func() error {
			return client.Run(ctx, []string{"sh", "-c", "command -v btop >/dev/null && exec btop; command -v htop >/dev/null && exec htop; exec top"}, true, false)
		})
	case "docker":
		if len(args) < 2 {
			return errors.New("usage: devnode docker <arguments...>")
		}
		return client.Run(ctx, append([]string{"docker"}, args[1:]...), needsTTY(args[1:]) && devssh.IsTerminal(a.Out), false)
	case "hardware":
		return noArgs(args[1:], func() error { return client.Run(ctx, []string{"sh", "-c", hardwareScript}, false, false) })
	case "network":
		return noArgs(args[1:], func() error { return client.Run(ctx, []string{"sh", "-c", networkScript}, false, false) })
	case "projects":
		return noArgs(args[1:], func() error { return client.Run(ctx, []string{"sh", "-c", projectsScript}, false, false) })
	case "project":
		return a.project(ctx, client, args[1:])
	case "pnpm", "npm", "yarn", "bun":
		return a.packageManager(ctx, client, args[0], args[1:])
	case "run":
		if len(args) < 2 {
			return errors.New("usage: devnode run <project> [script]")
		}
		script := "dev"
		if len(args) > 2 {
			script = args[2]
		}
		return a.packageManager(ctx, client, "pnpm", []string{args[1], "run", script})
	case "doctor":
		return noArgs(args[1:], func() error { return client.Run(ctx, []string{"sh", "-c", doctorScript}, false, false) })
	case "ros":
		return a.ros(ctx, client, args[1:])
	case "install":
		return a.install(ctx, client, cfg, args[1:])
	case "tunnel":
		return a.tunnel(ctx, client, args[1:])
	case "service":
		if len(args) != 3 || !config.SafeUnit(args[1]) || !validAction(args[2]) {
			return errors.New("usage: devnode service <name> <status|start|stop|restart>")
		}
		return a.managedService(ctx, client, args[1], args[1], args[2])
	case "postgres":
		return a.postgres(ctx, client, cfg.PostgresService, args[1:])
	case "services":
		return noArgs(args[1:], func() error {
			return client.Run(ctx, []string{"systemctl", "list-units", "--type=service", "--state=running", "--no-pager"}, false, false)
		})
	case "logs":
		return a.logs(ctx, client, args[1:])
	case "exec":
		if len(args) < 2 {
			return errors.New("usage: devnode exec <command> [arguments...]")
		}
		return client.Run(ctx, args[1:], false, false)
	case "shutdown":
		return a.shutdown(ctx, client, args[1:])
	default:
		return fmt.Errorf("unknown command %q; run `devnode help`", args[0])
	}
}

func (a *App) discover(ctx context.Context, client devssh.Client, cfg config.Config, configPath string, args []string) error {
	fs := flag.NewFlagSet("discover", flag.ContinueOnError)
	fs.SetOutput(a.Err)
	runSetup := fs.Bool("setup", false, "continue passwordless SSH setup after discovery")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 0 {
		return errors.New("usage: devnode discover [--setup]")
	}
	if config.NeedsDiscovery(cfg.Host) {
		fmt.Fprintf(a.Out, "Scanning the local network for an SSH server on port %d...\n", cfg.Port)
	} else {
		parts := strings.Split(cfg.Host, ".")
		if len(parts) == 4 {
			fmt.Fprintf(a.Out, "Searching local network and %s.%s.%s.0/24 for the trusted SSH host key on port %d...\n", parts[0], parts[1], parts[2], cfg.Port)
		} else {
			fmt.Fprintf(a.Out, "Searching local network for %s trusted SSH host key on port %d...\n", cfg.Host, cfg.Port)
		}
	}
	host, err := client.DiscoverMovedHost(ctx)
	if err != nil {
		return fmt.Errorf("discover server: %w", err)
	}
	updated, err := saveDiscoveredHost(configPath, cfg, host)
	if err != nil {
		return err
	}
	fmt.Fprintf(a.Out, "Found the trusted server at %s. Updated %s\n", host, configPath)
	if !*runSetup {
		fmt.Fprintln(a.Out, "Run `devnode status` or `devnode discover --setup` next.")
		return nil
	}
	client.Config = updated
	fmt.Fprintln(a.Out, "Continuing SSH setup...")
	return a.setup(ctx, client, updated, configPath)
}

func saveDiscoveredHost(path string, cfg config.Config, host string) (config.Config, error) {
	updated := cfg
	updated.Host = host
	if err := updated.Validate(); err != nil {
		return cfg, fmt.Errorf("invalid discovered host: %w", err)
	}
	if err := config.Save(path, updated); err != nil {
		return cfg, fmt.Errorf("save discovered host: %w", err)
	}
	return updated, nil
}

func (a *App) connect(ctx context.Context, client devssh.Client, args []string) error {
	fs := flag.NewFlagSet("connect", flag.ContinueOnError)
	fs.SetOutput(a.Err)
	persistent := fs.Bool("persistent", false, "attach or create a remote tmux session")
	session := fs.String("session", "devnode", "tmux session name")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 0 {
		return errors.New("usage: devnode connect [--persistent] [--session NAME]")
	}
	if !*persistent {
		if *session != "devnode" {
			return errors.New("--session requires --persistent")
		}
		return client.Run(ctx, nil, true, false)
	}
	if !safeSessionName(*session) {
		return errors.New("session name must be 1-64 letters, numbers, underscores, or hyphens")
	}
	return client.Run(ctx, []string{"sh", "-c", persistentShellScript, "devnode-connect", *session}, true, false)
}

func safeSessionName(name string) bool {
	if len(name) == 0 || len(name) > 64 {
		return false
	}
	for _, r := range name {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_' || r == '-') {
			return false
		}
	}
	return true
}

func (a *App) status(ctx context.Context, client devssh.Client, cfg config.Config, args []string) error {
	fs := flag.NewFlagSet("status", flag.ContinueOnError)
	fs.SetOutput(a.Err)
	once := fs.Bool("once", false, "render once and exit")
	interval := fs.Duration("interval", 1*time.Second, "live refresh interval")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 0 {
		return errors.New("usage: devnode status [--once] [--interval 1s]")
	}
	if *interval < 500*time.Millisecond || *interval > time.Minute {
		return errors.New("--interval must be between 500ms and 1m")
	}
	if !*once && devssh.IsTerminal(a.Out) {
		return devtui.Run(ctx, client, cfg, *interval, a.In, a.Out)
	}
	out, err := client.Output(ctx, status.Script(cfg.PostgresService))
	if err != nil {
		return err
	}
	snap, err := status.Parse(string(out))
	if err != nil {
		return err
	}
	ui.Dashboard(a.Out, config.Target(cfg), snap, devssh.IsTerminal(a.Out))
	return nil
}

func (a *App) install(ctx context.Context, client devssh.Client, cfg config.Config, args []string) error {
	if len(args) > 1 {
		return errors.New("usage: devnode install [service]")
	}
	name := ""
	if len(args) == 1 {
		name = args[0]
	}
	if name == "all" {
		return errors.New("bulk installation is intentionally unsupported; choose one service")
	}
	out, err := client.Output(ctx, status.Script(cfg.PostgresService))
	if err != nil {
		return err
	}
	snapshot, err := status.Parse(string(out))
	if err != nil {
		return err
	}
	reader := bufio.NewReader(a.In)

	if name == "" {
		missing := make([]catalog.Service, 0)
		for _, candidate := range catalog.Names() {
			svc, _ := catalog.Get(candidate)
			state := snapshot.Services[candidate].State
			if state == "" || state == "not-installed" {
				missing = append(missing, svc)
			}
		}
		if len(missing) == 0 {
			fmt.Fprintln(a.Out, "All catalog services are already installed.")
			return nil
		}
		fmt.Fprintln(a.Out, "Missing services (choose one):")
		for i, svc := range missing {
			fmt.Fprintf(a.Out, "  %2d) %-18s %-16s %s\n", i+1, svc.Name, "["+svc.Method+"]", svc.Description)
		}
		fmt.Fprint(a.Out, "Selection number or name (blank cancels): ")
		answer, err := reader.ReadString('\n')
		if err != nil && !errors.Is(err, io.EOF) {
			return err
		}
		answer = strings.TrimSpace(answer)
		if answer == "" {
			fmt.Fprintln(a.Out, "Cancelled.")
			return nil
		}
		if n, err := strconv.Atoi(answer); err == nil {
			if n < 1 || n > len(missing) {
				return errors.New("selection is out of range")
			}
			name = missing[n-1].Name
		} else {
			name = answer
		}
	}

	svc, ok := catalog.Get(name)
	if !ok {
		return fmt.Errorf("unknown installable service %q", name)
	}
	svcState := snapshot.Services[name]
	switch svcState.State {
	case "", "not-installed":
		// not present — proceed normally
	case "exited", "created", "dead":
		// container exists but is not running (crashed / never started)
		fmt.Fprintf(a.Out, "\n%s container is in state %q — removing it before reinstalling...\n", svc.Label, svcState.State)
		rmScript := `d(){ if docker info >/dev/null 2>&1; then docker "$@"; else sudo docker "$@"; fi; }; d rm -f ` + name
		if err := client.Run(ctx, []string{"sh", "-c", rmScript}, false, false); err != nil {
			return fmt.Errorf("remove crashed container %q: %w", name, err)
		}
	default:
		return fmt.Errorf("%s is already installed and running (state: %s)", svc.Label, svcState.State)
	}
	fmt.Fprintf(a.Out, "\n%s\nMethod: %s\nChange: %s\n", svc.Label, svc.Method, svc.Description)
	if svc.Script == "" {
		fmt.Fprintf(a.Out, "\nWhy guided? %s\n", svc.Manual)
		if len(svc.Steps) > 0 {
			fmt.Fprintf(a.Out, "\nRun these commands on the server (use `devnode connect` to open a shell):\n\n")
			for _, step := range svc.Steps {
				if step == "" {
					fmt.Fprintln(a.Out)
				} else {
					fmt.Fprintf(a.Out, "  %s\n", step)
				}
			}
			fmt.Fprintln(a.Out)
		}
		fmt.Fprintf(a.Out, "Once installed, run `devnode status` to confirm.\n")
		return nil
	}
	fmt.Fprintf(a.Out, "Type %q to install only this service: ", name)
	answer, err := reader.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return err
	}
	if strings.TrimSpace(answer) != name {
		fmt.Fprintln(a.Out, "Cancelled.")
		return nil
	}
	if err := client.Run(ctx, []string{"sh", "-c", svc.Script}, true, false); err != nil {
		return fmt.Errorf("install %s: %w", name, err)
	}
	fmt.Fprintf(a.Out, "%s installation completed. Check it with `devnode status`.\n", svc.Label)
	return nil
}

func (a *App) ros(ctx context.Context, client devssh.Client, args []string) error {
	if len(args) != 1 || (args[0] != "status" && args[0] != "nodes" && args[0] != "topics") {
		return errors.New("usage: devnode ros <status|nodes|topics>")
	}
	var script string
	switch args[0] {
	case "status":
		script = `if ! command -v ros2 >/dev/null 2>&1; then printf '%s\n' 'ROS 2 is not installed.'; exit 3; fi; printf 'ROS_DISTRO=%s\n' "${ROS_DISTRO:-unknown}"; ros2 daemon status`
	case "nodes":
		script = `command -v ros2 >/dev/null 2>&1 || { printf '%s\n' 'ROS 2 is not installed.' >&2; exit 3; }; ros2 node list`
	case "topics":
		script = `command -v ros2 >/dev/null 2>&1 || { printf '%s\n' 'ROS 2 is not installed.' >&2; exit 3; }; ros2 topic list`
	}
	return client.Run(ctx, []string{"sh", "-c", script}, false, false)
}

func (a *App) tunnel(ctx context.Context, client devssh.Client, args []string) error {
	if len(args) < 1 || len(args) > 2 {
		return errors.New("usage: devnode tunnel <service|port> [local-port]")
	}
	targetName := args[0]
	remotePort := 0
	if p, err := strconv.Atoi(targetName); err == nil && p >= 1 && p <= 65535 {
		remotePort = p
	} else if p, ok := tunnelPorts[targetName]; ok {
		remotePort = p
	} else {
		return fmt.Errorf("unknown tunnel %q; available services: %s, or specify a port number (1-65535)", targetName, tunnelNames())
	}
	localPort := remotePort
	if len(args) == 2 {
		n, err := strconv.Atoi(args[1])
		if err != nil || n < 1 || n > 65535 {
			return errors.New("local port must be between 1 and 65535")
		}
		localPort = n
	}
	fmt.Fprintf(a.Out, "Forwarding 127.0.0.1:%d to %s:%d. Press Ctrl-C to stop.\n", localPort, targetName, remotePort)
	return client.Forward(ctx, localPort, remotePort)
}

var pmSubcommands = map[string]bool{
	"install": true, "i": true, "add": true, "remove": true, "rm": true,
	"run": true, "dev": true, "build": true, "test": true, "start": true,
	"update": true, "up": true, "init": true, "create": true, "list": true,
	"ls": true, "outdated": true, "audit": true, "exec": true, "dlx": true,
	"publish": true, "link": true, "unlink": true, "why": true,
}

func resolveProjectAndArgs(args []string) (string, []string, error) {
	if len(args) == 0 {
		cwd, err := os.Getwd()
		if err != nil {
			return "", nil, fmt.Errorf("unable to determine current directory: %w", err)
		}
		return filepath.Base(cwd), []string{"install"}, nil
	}

	first := args[0]
	if pmSubcommands[first] || strings.HasPrefix(first, "-") {
		cwd, err := os.Getwd()
		if err != nil {
			return "", nil, fmt.Errorf("unable to determine current directory: %w", err)
		}
		return filepath.Base(cwd), args, nil
	}

	if !safeProjectName(first) {
		return "", nil, fmt.Errorf("invalid project name %q; use letters, numbers, dashes, or underscores", first)
	}

	project := first
	if len(args) == 1 {
		return project, []string{"install"}, nil
	}
	return project, args[1:], nil
}

func safeProjectName(name string) bool {
	if name == "" || name == "." || name == ".." || len(name) > 64 {
		return false
	}
	for _, r := range name {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' || r == '.') {
			return false
		}
	}
	return true
}

func (a *App) packageManager(ctx context.Context, client devssh.Client, pm string, args []string) error {
	project, pmArgs, err := resolveProjectAndArgs(args)
	if err != nil {
		return err
	}
	if !safeProjectName(project) {
		return fmt.Errorf("invalid project name %q", project)
	}

	quotedArgs := devssh.JoinCommand(append([]string{pm}, pmArgs...))
	remoteScript := fmt.Sprintf(`for _p in "$HOME/.local/bin" "$HOME/.cargo/bin" /snap/bin /usr/local/bin; do
  [ -d "$_p" ] && case ":$PATH:" in *":$_p:"*) ;; *) PATH="$_p:$PATH" ;; esac
done
if [ -d "$HOME/.nvm/versions/node" ]; then
  _latest_node=$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n1 || true)
  [ -n "$_latest_node" ] && [ -d "$HOME/.nvm/versions/node/$_latest_node/bin" ] && PATH="$HOME/.nvm/versions/node/$_latest_node/bin:$PATH"
fi
if ! command -v %s >/dev/null 2>&1; then
  printf '%%s\n' '%s is not installed on the server. Run: devnode exec npm install -g %s' >&2
  exit 1
fi
mkdir -p "$HOME/projects/%s" && cd "$HOME/projects/%s" && exec %s`, pm, pm, pm, project, project, quotedArgs)

	fmt.Fprintf(a.Out, "→ [%s in ~/projects/%s]: %s %s\n", pm, project, pm, strings.Join(pmArgs, " "))
	return client.Run(ctx, []string{"sh", "-c", remoteScript}, devssh.IsTerminal(a.Out), false)
}

func (a *App) project(ctx context.Context, client devssh.Client, args []string) error {
	if len(args) == 0 || args[0] == "list" {
		return client.Run(ctx, []string{"sh", "-c", projectsScript}, false, false)
	}
	switch args[0] {
	case "create":
		if len(args) != 2 || !safeProjectName(args[1]) {
			return errors.New("usage: devnode project create <name>")
		}
		script := fmt.Sprintf(`mkdir -p "$HOME/projects/%s" && printf '%%s\n' 'Created ~/projects/%s'`, args[1], args[1])
		return client.Run(ctx, []string{"sh", "-c", script}, false, false)
	case "shell":
		if len(args) != 2 || !safeProjectName(args[1]) {
			return errors.New("usage: devnode project shell <name>")
		}
		script := fmt.Sprintf(`mkdir -p "$HOME/projects/%s" && cd "$HOME/projects/%s" && exec ${SHELL:-bash}`, args[1], args[1])
		return client.Run(ctx, []string{"sh", "-c", script}, true, false)
	default:
		return fmt.Errorf("unknown project action %q; use: devnode project [list|create|shell]", args[0])
	}
}

var tunnelPorts = map[string]int{"postgres": 5432, "postgresql": 5432, "mysql": 3306, "redis": 6379, "mongodb": 27017, "adminer": 8080, "pgadmin": 5050, "minio": 9000, "mailpit": 8025, "portainer": 9443, "uptime-kuma": 3001, "netdata": 19999, "dozzle": 8080, "node-red": 1880, "localstack": 4566, "mosquitto": 1883, "jupyter": 8888}

func tunnelNames() string {
	names := []string{"adminer", "dozzle", "jupyter", "localstack", "mailpit", "minio", "mongodb", "mosquitto", "mysql", "netdata", "node-red", "pgadmin", "portainer", "postgres", "redis", "uptime-kuma"}
	return strings.Join(names, ", ")
}

func (a *App) setup(ctx context.Context, client devssh.Client, cfg config.Config, configPath string) error {
	keyPath := cfg.IdentityFile
	if keyPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("locate home directory: %w", err)
		}
		keyPath = filepath.Join(home, ".ssh", "devnode_ed25519")
	}
	if _, err := os.Stat(keyPath); errors.Is(err, os.ErrNotExist) {
		if err := os.MkdirAll(filepath.Dir(keyPath), 0700); err != nil {
			return fmt.Errorf("create SSH directory: %w", err)
		}
		fmt.Fprintln(a.Out, "Creating a dedicated DevNode SSH key...")
		cmd := exec.CommandContext(ctx, "ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "devnode", "-f", keyPath)
		cmd.Stdin, cmd.Stdout, cmd.Stderr = a.In, a.Out, a.Err
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("generate SSH key: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("inspect SSH key: %w", err)
	}

	publicKey, err := os.ReadFile(keyPath + ".pub")
	if err != nil {
		return fmt.Errorf("read public key: %w", err)
	}
	publicKeyText := strings.TrimSpace(string(publicKey))
	if !strings.HasPrefix(publicKeyText, "ssh-ed25519 ") {
		return errors.New("generated public key has an unexpected format")
	}

	fmt.Fprintf(a.Out, "Installing the key on %s (enter the Ubuntu password once if prompted)...\n", config.Target(cfg))
	client.Config.IdentityFile = keyPath
	installScript := `umask 077; mkdir -p "$HOME/.ssh"; touch "$HOME/.ssh/authorized_keys"; grep -qxF "$1" "$HOME/.ssh/authorized_keys" || printf '%s\n' "$1" >> "$HOME/.ssh/authorized_keys"`
	if err := client.Run(ctx, []string{"sh", "-c", installScript, "devnode-setup", publicKeyText}, false, false); err != nil {
		return fmt.Errorf("install public key: %w", err)
	}

	cfg.IdentityFile = keyPath
	if err := config.Save(configPath, cfg); err != nil {
		return err
	}
	if _, err := client.Output(ctx, "printf 'ok\\n'"); err != nil {
		return fmt.Errorf("verify passwordless SSH: %w", err)
	}
	fmt.Fprintln(a.Out, "SSH setup complete. DevNode can now connect without a password.")
	return nil
}

func (a *App) postgres(ctx context.Context, client devssh.Client, service string, args []string) error {
	if len(args) != 1 || (args[0] != "status" && args[0] != "start" && args[0] != "stop" && args[0] != "restart") {
		return errors.New("usage: devnode postgres <status|start|stop|restart>")
	}
	return a.managedService(ctx, client, "postgres", service, args[0])
}

func (a *App) managedService(ctx context.Context, client devssh.Client, container, unit, action string) error {
	tty := action != "status" && devssh.IsTerminal(a.Out)
	return client.Run(ctx, []string{"sh", "-c", serviceScript, "devnode-service", container, unit, action}, tty, false)
}

func (a *App) logs(ctx context.Context, client devssh.Client, args []string) error {
	fs := flag.NewFlagSet("logs", flag.ContinueOnError)
	fs.SetOutput(a.Err)
	follow := fs.Bool("follow", false, "follow new entries")
	lines := fs.Int("lines", 100, "number of lines")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 1 || !config.SafeUnit(fs.Arg(0)) {
		return errors.New("usage: devnode logs [--follow] [--lines N] <service>")
	}
	if *lines < 1 || *lines > 100000 {
		return errors.New("--lines must be between 1 and 100000")
	}
	cmd := []string{"journalctl", "-u", fs.Arg(0), "-n", strconv.Itoa(*lines), "--no-pager"}
	if *follow {
		cmd = append(cmd, "-f")
	}
	return client.Run(ctx, cmd, false, false)
}

func (a *App) shutdown(ctx context.Context, client devssh.Client, args []string) error {
	yes := false
	if len(args) == 1 && args[0] == "--yes" {
		yes = true
	} else if len(args) != 0 {
		return errors.New("usage: devnode shutdown [--yes]")
	}
	if !yes {
		fmt.Fprint(a.Out, "Shut down the remote server? Type 'shutdown' to confirm: ")
		answer, err := bufio.NewReader(a.In).ReadString('\n')
		if err != nil && !errors.Is(err, io.EOF) {
			return err
		}
		if strings.TrimSpace(answer) != "shutdown" {
			fmt.Fprintln(a.Out, "Cancelled.")
			return nil
		}
	}
	return client.Run(ctx, []string{"sudo", "shutdown", "-h", "now"}, true, false)
}

func (a *App) configCommand(path string, args []string) error {
	if len(args) != 1 || (args[0] != "init" && args[0] != "show") {
		return errors.New("usage: devnode config <init|show>")
	}
	if args[0] == "show" {
		fmt.Fprintln(a.Out, path)
		return nil
	}
	if _, err := os.Stat(path); err == nil {
		return fmt.Errorf("config already exists: %s", path)
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return fmt.Errorf("create config directory: %w", err)
	}
	if err := os.WriteFile(path, []byte(config.Example), 0600); err != nil {
		return fmt.Errorf("write config: %w", err)
	}
	fmt.Fprintln(a.Out, "Created", path)
	return nil
}

func noArgs(args []string, fn func() error) error {
	if len(args) != 0 {
		return errors.New("unexpected arguments")
	}
	return fn()
}
func needsTTY(args []string) bool {
	for _, arg := range args {
		if arg == "--tty" || arg == "-t" || (strings.HasPrefix(arg, "-") && !strings.HasPrefix(arg, "--") && strings.Contains(arg[1:], "t")) {
			return true
		}
	}
	return false
}

func validAction(action string) bool {
	return action == "status" || action == "start" || action == "stop" || action == "restart"
}

const usage = `DevNode controls a remote Ubuntu development server over SSH.

Usage:
  devnode [--config PATH] <command> [arguments]

Commands:
  discover [--setup]             Find a moved server by its trusted SSH key
  setup                           Configure passwordless SSH (one-time)
  connect [--persistent]         Open SSH; persistent mode survives disconnects
  status, dashboard               Open the live server dashboard
  hardware                        Show CPU, RAM, storage, GPU, and Docker
  network                         Show addresses, routes, ports, and DNS
  projects                        List projects in ~/projects and Git repos
  project <list|create|shell>     Manage development projects in ~/projects
  pnpm [PROJECT] <command...>     Run pnpm inside ~/projects/PROJECT on Ubuntu
  npm [PROJECT] <command...>      Run npm inside ~/projects/PROJECT on Ubuntu
  run <project> [script]          Run project script (e.g. dev) on Ubuntu
  doctor                          Check server development prerequisites
  ros <status|nodes|topics>       Inspect the remote ROS 2 environment
  install [service]               Choose and install one missing service
  tunnel <SERVICE|PORT> [LOCAL]   Securely forward a service or port to your Mac
  monitor                         Open btop, htop, or top
  docker <arguments...>           Run a remote Docker command
  service NAME ACTION             Control Docker or systemd automatically
  postgres <status|start|stop|restart>
  services                        List running systemd services
  logs [--follow] [--lines N] SERVICE
  exec <command> [arguments...]   Run an explicitly trusted command
  shutdown [--yes]                Shut down after confirmation
  config <init|show>              Create or locate the config file
  version                         Print the version
`
