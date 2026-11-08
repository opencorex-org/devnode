# DevNode Desktop

DevNode Desktop is the cross-platform graphical client. It is a separate Go
module so the existing CLI remains lightweight and can continue to evolve
independently.

## Architecture

- `backend/` exposes typed Wails services backed by DevNode's existing Go
  packages.
- `frontend/` contains the React and TypeScript interface.
- `main.go` creates the native Wails window and embeds the built frontend.

The first implementation includes:

- OpenSSH prerequisite detection;
- connection configuration and LAN discovery;
- connection testing and live server status;
- CPU, memory, disk, runtime, and service views;
- start, stop, and restart controls for Docker and systemd services;
- remote project listing and creation;
- the installable-service catalog;
- a copyable SSH command for the system terminal;
- an in-app macOS, Windows, Linux, and Ubuntu connection guide with copyable commands and troubleshooting; and
- automatic secure LAN pairing through `devnode-agent`, including matching-code approval, SSH host-key pinning, and automatic recovery after an Ubuntu IP-address change.

## Developer prerequisites

- Go 1.26 or newer
- Node.js and npm
- Wails v3
- platform dependencies reported by `wails3 doctor`

## Generate bindings and frontend assets

From this directory:

```sh
wails3 generate bindings
cd frontend
npm install
npm run build
cd ..
```

The generated Wails bindings and frontend dependencies are intentionally not
committed.

## Run or package

```sh
wails3 dev
wails3 build
```

Run packaging on the target operating system so native WebView dependencies,
icons, signing, and installer formats are handled correctly.

## Current boundary

Password entry and the first public-key installation remain in the CLI with
`devnode setup` when manual setup is selected. Secure LAN pairing uses the
Ubuntu-side `devnode-agent` instead and never collects or stores an Ubuntu password.
The Terminal screen hands off a generated SSH command to the user's preferred
terminal. An embedded PTY/ConPTY terminal can be added without changing the
backend service boundary.

