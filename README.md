<div align="center">

<img src="assets/logo.png" alt="DevNode Logo" width="128" height="128" style="border-radius: 28px; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.3);" />

# DevNode

**Next-generation control plane and developer companion for remote Ubuntu development environments over SSH.**

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-slate.svg)]()
[![Wails v3](https://img.shields.io/badge/Desktop-Wails%20v3%20%2B%20React%2019-red.svg)](desktop/)
[![Tests](https://img.shields.io/badge/Tests-Passing-emerald.svg)]()

[Features](#-key-features) •
[Quick Start](#-quick-start) •
[CLI Reference](#-cli-command-reference) •
[Desktop App](#-devnode-desktop) •
[Configuration](#-configuration) •
[Architecture](#-architecture) •
[License](#-license)

</div>

---

## 📌 Overview

**DevNode** eliminates the friction of remote Linux development. It gives you a fast, dependency-free macOS CLI and a modern desktop application that communicates over a multiplexed OpenSSH connection to an Ubuntu machine.

Keep resource-heavy node_modules, Docker containers, builds, and development databases on an Ubuntu workstation, home server, or cloud VM while writing code with native Mac battery life, responsive editors, and zero latency.

- **Near-Instant Execution (~15ms)**: Uses native OpenSSH connection multiplexing (`ControlMaster`), keeping your existing `~/.ssh/config`, hardware keys, and SSH agents active.
- **Dual Interface**: A full-featured terminal CLI with a live TUI, paired with a modern **Desktop GUI** built on Wails v3, React 19, and Tailwind CSS v4.
- **Zero-Config LAN Pairing**: Discovers Ubuntu on local Wi-Fi/Ethernet via mDNS/Bonjour, negotiates secure ED25519 authentication, and automatically reconnects if DHCP assigns a new IP.
- **Workspace & Package Management**: Run `pnpm`, `npm`, `yarn`, or `bun` on remote projects with automatic folder detection.
- **1-Click Port Forwarding**: Secure local loopback tunnels for dev servers and databases.

---

## 🚀 Key Features

| Capability | Description |
| :--- | :--- |
| 📊 **Real-Time Telemetry** | Full-screen live TUI monitoring CPU, RAM, disk, and bidirectional network traffic rates. |
| 🔄 **Resilient Discovery** | Roam freely across Wi-Fi networks and mobile hotspots; DevNode auto-detects changed IPs. |
| 📦 **Remote Projects** | Manage development projects stored in `~/projects` with live Git branch & dirty tree status. |
| 🔌 **Zero-Leak Tunnels** | Single-command port forwarding binding to Mac `127.0.0.1` (Next.js, Vite, Postgres, Redis, etc.). |
| 🛠️ **Service Catalog** | 16+ guided services (Docker, Postgres, Redis, Portainer, Uptime Kuma, MongoDB, Jupyter, ROS 2, MinIO). |
| 🛡️ **Sleep-Proof Shells** | Persistent tmux session attachment survives laptop lid closures and network drops. |
| 🖥️ **Cross-Platform GUI** | Dedicated desktop app for macOS, Linux, and Windows with interactive service guides and project controls. |

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              LOCAL CLIENT                              │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │        DevNode CLI        │      │     DevNode Desktop GUI     │   │
│   │   (Go / Bubble Tea TUI)   │      │  (Wails v3 + React 19 + TS) │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
│                 │                                   │                  │
│                 └─────────────────┬─────────────────┘                  │
│                                   │                                    │
│                 ┌─────────────────▼─────────────────┐                  │
│                 │      OpenSSH Multiplexing Engine  │                  │
│                 │ (ControlMaster / devnode-cm-%C)   │                  │
│                 └─────────────────┬─────────────────┘                  │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Encrypted SSH Tunnel
                                    │ (~15ms latency)
┌───────────────────────────────────▼────────────────────────────────────┐
│                             REMOTE UBUNTU                              │
│                                                                        │
│   ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐   │
│   │  devnode-agent     │ │  Docker Engine &   │ │  systemd Units & │   │
│   │  (Pairing Helper)  │ │  Containers        │ │  Background Daem.│   │
│   └────────────────────┘ └────────────────────┘ └──────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │             Projects Workspace (`~/projects/*`)                │   │
│   │             Package Managers: pnpm • npm • yarn • bun          │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Prerequisites

- **Client**: macOS 11+ (Apple Silicon or Intel), Linux, or Windows with OpenSSH.
- **Server**: Ubuntu 22.04 LTS or newer with `openssh-server` running.
- **Build toolchain**: Go 1.25+ (to build from source).

### 2. Installation

Run the automated local installer:

```bash
./scripts/install.sh
```

The installer automatically:
- Compiles and links `~/.local/bin/devnode`.
- Configures `~/.config/devnode/config.yaml` with automatic LAN discovery (`host: auto`).
- Configures user shell profile paths (`~/.zshrc` / `~/.bashrc`).

### 3. One-Time Secure Setup

Open your terminal and run:

```bash
devnode setup
```

DevNode scans your LAN for your Ubuntu machine, generates an isolated ED25519 keypair at `~/.ssh/devnode_ed25519`, installs the public key on Ubuntu, and pins the remote host fingerprint.

Verify connectivity immediately:

```bash
devnode status
```

---

## 💻 CLI Command Reference

### Server Inspection & Live Telemetry

```bash
devnode status                  # Interactive live full-screen TUI (1s zero-flicker refresh)
devnode status --interval 500ms # High-frequency refresh (500ms to 1m)
devnode status --once           # Headless snapshot output (script & CI friendly)
devnode hardware                # Detailed inventory of CPU, RAM, NVMe/disks, GPU, and Docker
devnode network                 # Show listening ports, network interfaces, IP addresses, DNS
devnode doctor                  # Validate server prerequisites, SSH health, and resources
devnode monitor                 # Open remote interactive process monitor (btop / htop / top)
devnode connect                 # Interactive remote shell
devnode connect --persistent    # Resumable tmux shell that survives laptop sleep or disconnects
devnode connect --session work  # Connect to or create a named remote session
```

### Remote Workspace & Projects

Keep project files in `~/projects/<project-name>` on the server and manage them cleanly:

```bash
devnode projects                # List all remote projects, active Git branches, and dirty status
devnode project create my-app   # Initialize a new remote directory in ~/projects/my-app
devnode project shell my-app    # Open interactive shell positioned inside ~/projects/my-app

# Remote Package Management (pnpm / npm / yarn / bun)
devnode pnpm my-app install     # Run 'pnpm install' remotely inside ~/projects/my-app
devnode pnpm my-app add express # Add dependency remotely
devnode run my-app dev          # Run project dev script (defaults to 'dev')

# Context-Aware Folder Inference
cd ~/Documents/my-app
devnode pnpm install            # When folder name matches ~/projects/my-app, project arg is inferred!
```

### Port Forwarding & Tunneling

DevNode tunnels forward remote ports securely to your local loopback address (`127.0.0.1`):

```bash
# Forward Arbitrary Dev Server Ports
devnode tunnel 3000             # Forward remote Next.js / Express on port 3000 -> localhost:3000
devnode tunnel 5173             # Forward remote Vite dev server -> localhost:5173
devnode tunnel 8080 8081        # Forward remote port 8080 to local port 8081

# Forward Catalog Services by Name
devnode tunnel postgres         # PostgreSQL (5432)
devnode tunnel redis            # Redis (6379)
devnode tunnel mongodb          # MongoDB (27017)
devnode tunnel portainer        # Portainer Web UI (9443)
devnode tunnel uptime-kuma      # Uptime Kuma dashboard (3001)
devnode tunnel jupyter          # Jupyter Notebooks (8888)
devnode tunnel minio            # MinIO S3 Object Storage (9000)
devnode tunnel mailpit          # Mailpit UI (8025) & SMTP (1025)
```

### Service Lifecycle Management

```bash
devnode install                 # Interactive catalog picker for uninstalled services
devnode install postgresql      # Install a specific catalog service
devnode service redis restart   # Control service (start | stop | restart | status)
devnode services                # List all active systemd units
devnode docker ps               # Transparent passthrough to remote Docker daemon
devnode logs -f mailpit         # Stream live logs for a container or systemd unit
```

---

## 🖥️ DevNode Desktop

DevNode includes a standalone GUI application packaged with **Wails v3**:

```bash
# Build desktop binary
cd desktop
go build -o bin/devnode-desktop .
```

On macOS, the build generates `DevNode.app` in `desktop/bin/DevNode.app`.

### Desktop Capabilities
- **Overview Dashboard**: System dials, CPU/memory/disk gauges, real-time bandwidth meter, and active tool versions.
- **Projects Explorer**: Interactive project cards with package manager integration, 1-click SSH jump commands, and project management.
- **Services Catalog**: Interactive status badges and comprehensive step-by-step setup guides for all 16+ catalog items with one-click command copy buttons.
- **Terminal Integration**: Quick copyable SSH connection strings and persistent session launch commands.
- **LAN Pairing Wizard**: Pair with nearby Ubuntu servers running `devnode-agent`.
- **Dedicated About Screen**: Detailed client and server environment telemetry and diagnostic information.

---

## ⚙️ Configuration

Configuration is stored in `~/.config/devnode/config.yaml`:

```yaml
# Hostname (mDNS e.g. ubuntu.local for zero-config roaming) or IPv4 address
host: ubuntu.local
user: opencorex
port: 22
identity_file: "/Users/opencorex/.ssh/devnode_ed25519"
connect_timeout: 8
postgres_service: postgresql
```

### Environment Overrides

Any configuration option can be temporarily overridden via environment variables:

| Variable | Description |
| :--- | :--- |
| `DEVNODE_HOST` | Target hostname or IP address |
| `DEVNODE_USER` | Remote SSH username |
| `DEVNODE_PORT` | SSH port (default: `22`) |
| `DEVNODE_IDENTITY_FILE` | Path to private SSH key |
| `DEVNODE_CONFIG` | Custom path to config file |

---

## 🔒 Security & Best Practices

- **Zero-Password Storage**: DevNode never saves or caches passwords. Authentication relies strictly on standard SSH keys.
- **Scoped Sudo Rules**: Do not configure blanket passwordless sudo. Configure scoped sudo rules via `visudo` on Ubuntu:
  ```text
  your-username ALL=(ALL) NOPASSWD: /usr/sbin/shutdown, /bin/systemctl * postgresql*
  ```
- **Loopback Binding**: Port tunnels bind exclusively to `127.0.0.1` locally, preventing unwanted exposure across your local network.

---

## 🧪 Testing & Development

Run test suites and linters from the repository root:

```bash
# Run unit tests across all packages
make test

# Run Go static analysis
make vet

# Build local CLI binary to ./bin/devnode
make build

# Build DevNode Desktop
cd desktop && task build
```

---

## 📄 License

DevNode is open-source software licensed under the **[MIT License](LICENSE)**.

Copyright &copy; 2026 [OpenCorex](https://github.com/opencorex-org/devnode).
