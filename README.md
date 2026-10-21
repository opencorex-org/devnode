# DevNode

DevNode is a fast, dependency-free macOS CLI for managing an Ubuntu development server over SSH. It uses the system `ssh` client with connection multiplexing, so your existing SSH agent, `~/.ssh/config`, host-key verification, and hardware-backed keys continue to work seamlessly with ~15ms query execution.

## Requirements

- macOS with OpenSSH (included by default)
- Go 1.23 or newer to build
- An Ubuntu host with `sshd` running and key-based login configured
- `sudo` rights on Ubuntu for PostgreSQL control and system operations

## Install

```sh
./scripts/install.sh
```

The installer performs the local setup automatically:

- Builds and installs `~/.local/bin/devnode`
- Creates `~/.config/devnode/config.yaml`
- Adds `~/.local/bin` to `~/.zshrc` (if not already present)
- Preserves an existing configuration on later runs

Open a new terminal and run the one-time SSH setup, followed by the dashboard:

```sh
devnode setup
devnode status
```

`devnode setup` generates a dedicated key at `~/.ssh/devnode_ed25519`, installs its public half on Ubuntu, and saves its path in the configuration. Ubuntu may ask for your account password once. DevNode never stores that password. Verify the server's host-key fingerprint before accepting it.

To install with custom connection parameters:

```sh
DEVNODE_HOST=192.168.x.x DEVNODE_USER=myuser DEVNODE_PORT=22 ./scripts/install.sh
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
- **Keyboard Navigation**:
  - `1`, `2`, `3` or `Tab` / `←` / `→` — switch between Overview, Services, and Help tabs
  - `+` / `-` — adjust refresh interval by 500ms steps (down to 500ms)
  - `r` — trigger an immediate refresh
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
host: 192.168.1.17
user: lahiru
port: 22
identity_file: "/Users/lahiru/.ssh/devnode_ed25519"
connect_timeout: 8
postgres_service: postgresql
```

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
