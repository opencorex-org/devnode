# DevNode

DevNode is a fast, dependency-free macOS CLI for managing an Ubuntu development server over SSH. It uses the system `ssh` client with connection multiplexing, so your existing SSH agent, `~/.ssh/config`, host-key verification, and hardware-backed keys continue to work seamlessly with ~15ms query execution.

The repository also contains **DevNode Desktop**, a custom Wails and React
interface for macOS, Linux, and Windows. It reuses the same Go connection,
discovery, monitoring, project, and service packages while keeping the CLI
available for terminal workflows. See [`desktop/`](desktop/README.md).

## Requirements

- macOS with OpenSSH (included by default)
- Go 1.25 or newer to build
- An Ubuntu host with `sshd` running and key-based login configured
- `sudo` rights on Ubuntu for PostgreSQL control and system operations

## Install

```sh
./scripts/install.sh
```

The installer performs the local setup **automatically with zero manual input**:

- Builds and installs `~/.local/bin/devnode`
- Creates `~/.config/devnode/config.yaml` with `host: auto` (auto-discovers Ubuntu on the LAN)
- Detects the current macOS username for the SSH user
- Adds `~/.local/bin` to `~/.zshrc` (if not already present)
- Preserves an existing configuration on later runs

Open a new terminal and run the one-time SSH setup:

```sh
devnode setup
```

DevNode will **automatically find your Ubuntu server** on the local network, generate a dedicated SSH key at `~/.ssh/devnode_ed25519`, install its public half on Ubuntu, and save the discovered IP in the configuration. Ubuntu may ask for your account password once. DevNode never stores that password.

After setup, just run:

```sh
devnode status
```

If the Ubuntu laptop later receives a different IP from the router (DHCP), DevNode will automatically rediscover it.

To install with custom connection parameters (optional — not needed for automatic mode):

```sh
DEVNODE_HOST=ubuntu.local DEVNODE_USER=myuser DEVNODE_PORT=22 ./scripts/install.sh
```

---

## Commands Overview

```text
# Server Status & Inspection
devnode status                  # Live full-screen TUI (1s real-time refresh)
devnode status --interval 500ms # Custom refresh interval (500ms to 1m)
devnode status --once           # Single-render snapshot (script-friendly)
devnode hardware                # Show CPU, RAM, storage, GPU, and Docker
devnode network                 # Show IP addresses, routes, open ports, and DNS
devnode doctor                  # Validate server prerequisites and resource usage
devnode monitor                 # Interactive btop, htop, or top
devnode connect                 # Interactive SSH shell
devnode connect --persistent    # Resumable tmux shell that survives laptop sleep
devnode connect --persistent --session work # Resume a named remote shell
devnode discover                # Find a changed LAN IP by trusted SSH key
devnode discover --setup        # Find, save, and continue SSH setup

# Project & Package Management (pnpm / npm / yarn / bun)
devnode projects                # List projects in ~/projects with package manager & Git branch
devnode project list            # List projects in ~/projects
devnode project create <name>   # Initialize a new project directory in ~/projects
devnode project shell <name>    # Open an interactive shell inside ~/projects/<name>
devnode pnpm <project> install  # Run 'pnpm install' inside ~/projects/<project> on Ubuntu
devnode pnpm <project> add pkg  # Install packages remotely (e.g. devnode pnpm my-app add express)
devnode pnpm install            # Auto-detects project from your current Mac folder name!
devnode npm <project> <args...> # Run npm inside ~/projects/<project> on Ubuntu
devnode run <project> [script]  # Shorthand to run project scripts (defaults to 'dev')

# Port & Service Tunneling
devnode tunnel <PORT>           # Forward any remote dev port to Mac (e.g. 3000, 5173, 8080)
devnode tunnel <SERVICE> [PORT] # Forward named service (e.g. postgres, mongodb, jupyter)

# Service Management & Discovery
devnode install                 # Interactive missing service installer
devnode install <service>       # Install a specific catalog service (e.g. mongodb, jupyter)
devnode service <name> <action> # Control service (status|start|stop|restart)
devnode services                # List running systemd units
devnode docker <arguments...>   # Passthrough Docker commands to Ubuntu
devnode logs [--follow] <svc>   # View service logs
devnode postgres <action>       # PostgreSQL database control
devnode ros <status|nodes>      # Inspect remote ROS 2 environment

# Utilities & Management
devnode exec <cmd...>           # Run an arbitrary command on the remote host
devnode config <init|show>      # Initialize or display configuration path
devnode shutdown [--yes]        # Safely shut down the remote host
```

### Persistent shell across laptop sleep

Use `devnode connect --persistent` when commands must keep running on Ubuntu
while the laptop sleeps, changes networks, or loses Wi-Fi. DevNode attaches to
a remote `tmux` session named `devnode`. After waking the laptop, run the same
command again to resume exactly where you left off. Use `--session NAME` for
separate work sessions.

The laptop cannot keep its SSH network connection active while asleep, but the
Ubuntu process and terminal continue inside `tmux`. If `tmux` is missing,
DevNode prints the exact Ubuntu installation command.

---

## Live Dashboard & Status

```sh
devnode status
```

The status dashboard is a responsive full-screen terminal UI:
- **Zero-Flicker 1s Real-Time Updates**: Displays solid `● ONLINE` connectivity powered by SSH ControlMaster multiplexing (`/tmp/devnode-cm-%C`).
- **Live Runtimes & Toolchain Detection**: Automatically detects and displays versions for:
  - `Node.js`, `npm`, and `pnpm` (always visible with active version or `not installed`)
  - `Yarn`, `Bun`, `Python`, `Go`, `Rust`, `Git`, and `Docker` (shown when detected)
- **Internet Data Usage Meter**: Shows live download/upload rates and cumulative traffic on the remote server's default network interface(s). Totals reset when the server or interface counters reset.
- **Keyboard Navigation**:
  - `1`, `2`, `3` or `Tab` / `←` / `→` — switch between Overview, Services, and Help tabs
  - `+` / `-` — adjust refresh interval by 500ms steps (down to 500ms)
  - `r` — trigger an immediate refresh
  - `s` — after a connection failure, search the old IPv4 `/24` for the same trusted SSH host key
  - `i` — after repeated failures, enter a replacement IP manually
  - `v` — review and trust a newly discovered host address while the dashboard is safely suspended
  - `q` / `Esc` — exit

For scripting or headless output, use:
```sh
devnode status --once
```

---

## Remote Projects & Package Management

DevNode lets you keep heavy dependencies and builds on your Ubuntu server while working comfortably from your Mac.

### Project Organization
Projects are stored in **`~/projects/<project-name>`** on Ubuntu.

```sh
# Create a new project directory on Ubuntu
devnode project create web-app

# Run pnpm install remotely
devnode pnpm web-app install

# Add packages
devnode pnpm web-app add express dotenv
devnode pnpm web-app add -D typescript @types/node

# Launch your development server remotely
devnode run web-app
# (Equivalent to: devnode pnpm web-app run dev)
```

### Auto-Detection from Local Directory
When your current working directory on macOS matches a project name on the server, you can omit the project argument:
```sh
cd ~/Documents/web-app
devnode pnpm install
devnode pnpm add prisma
```

### Interactive Project Shell
```sh
devnode project shell web-app
```
Opens an interactive SSH session already positioned in `~/projects/web-app`.

---

## Port Forwarding & Tunneling

DevNode tunnels bind securely to your Mac's loopback address (`127.0.0.1`):

### 1. Development Server Ports
Forward your Vite, Next.js, or API servers running on Ubuntu directly to your Mac:
```sh
devnode tunnel 3000     # Forward Next.js / Express on port 3000
devnode tunnel 5173     # Forward Vite dev server on port 5173
devnode tunnel 8080     # Forward API server on port 8080
```
Open **`http://localhost:3000`** in your Mac browser.

### 2. Catalog Services
Forward pre-configured development services:
```sh
devnode tunnel mongodb   # Forward MongoDB on 27017
devnode tunnel jupyter   # Forward Jupyter Notebook on 8888
devnode tunnel postgres  # Forward PostgreSQL on 5432
devnode tunnel redis     # Forward Redis on 6379
devnode tunnel minio     # Forward MinIO S3 on 9000
devnode tunnel mailpit   # Forward Mailpit UI on 8025
devnode tunnel portainer # Forward Portainer UI on 9443
```

---

## Service Catalog & Installation

```sh
devnode install
```

DevNode provides safe, isolated service installations:
- **Guarded Confirmation**: Bulk installation is intentionally disabled; services are installed individually after typing the service name to confirm.
- **Smart Hardware Compatibility**:
  - **MongoDB**: Automatically checks CPU for AVX instruction support. Selects `mongo:8` on modern AVX-capable CPUs, and automatically falls back to `mongo:4.4` on older Pentium/Celeron CPUs (preventing exit code 132 crashes). Pre-checks port 27017 conflicts before installation.
  - **Jupyter Notebook**: Runs `jupyter/minimal-notebook:latest` with persistent storage volume on port `8888`.
  - **Docker Containers**: Auto-detects and cleans up crashed/exited containers when reinstalling.
  - **Native Packages**: Automatic recipes for Docker Engine, PostgreSQL, Redis, and Mosquitto MQTT.
  - **Guided Services**: Step-by-step guidance for ROS 2, GitHub Actions Runner, Netdata, LocalStack, and MinIO.

---

## Configuration

Configuration is stored in `~/.config/devnode/config.yaml`:

```yaml
# Set to an mDNS hostname (e.g. ubuntu.local) for automatic zero-config LAN discovery,
# or to a local IPv4 address.
host: ubuntu.local
user: opencorex
port: 22
identity_file: "/Users/opencorex/.ssh/devnode_ed25519"
connect_timeout: 8
postgres_service: postgresql
```

> **Tip - Zero-Config LAN Setup without Static IPs**:
> To allow Ubuntu and your laptops to roam freely across any Wi-Fi or local area network without configuring static IPs:
> 1. Keep Ubuntu on automatic DHCP so it automatically receives internet access, DNS, and a local IP from whatever network it joins.
> 2. Ensure `avahi-daemon` is active on Ubuntu (`sudo apt install -y avahi-daemon && sudo systemctl enable --now avahi-daemon`).
> 3. Use `host: <hostname>.local` (e.g. `ubuntu.local`) in your DevNode configuration. macOS resolves `.local` names natively via Bonjour across any LAN or mobile hotspot.
> 4. If using an IP address, `devnode discover` will automatically search the current connected local network to find and save the updated IP.

Environment variables can override any setting for automation:
- `DEVNODE_HOST`
- `DEVNODE_USER`
- `DEVNODE_PORT`
- `DEVNODE_IDENTITY_FILE`
- `DEVNODE_CONFIG`

---

## Ubuntu Server Setup

Install OpenSSH server on Ubuntu:

```sh
sudo apt update && sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

For unattended PostgreSQL control and shutdown, configure scoped rules via `visudo`; avoid blanket passwordless sudo:

```text
your-username ALL=(ALL) NOPASSWD: /usr/sbin/shutdown, /bin/systemctl * postgresql*
```

---

## Development & Testing

```sh
make test   # Run all package unit tests
make vet    # Run static analysis
make build  # Build devnode binary to ./bin/devnode
```

See the [`docs/`](docs/README.md) folder for complete build, installation, and
release instructions.

## Secure desktop pairing

Install the pairing helper once on the Ubuntu computer:

```sh
make install-agent
devnode-agent pair
```

Then open **Connection** in DevNode Desktop and select **Scan local network**.
Compare the code shown on both computers and approve it on Ubuntu. DevNode
installs only the public key, pins Ubuntu's SSH identity, and reconnects
automatically when the local IP address changes. See the
[secure pairing guide](docs/secure-pairing.md).
