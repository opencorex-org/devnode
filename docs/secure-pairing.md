# Secure local pairing

DevNode Desktop can discover and pair with an Ubuntu computer without asking
for its IP address or password. The only prerequisite is installing the small
Ubuntu pairing agent once.

## Ubuntu preparation

From a DevNode source checkout on Ubuntu:

```sh
make install-agent
```

If UFW is active, allow the pairing TCP and discovery UDP ports:

```sh
sudo ufw allow 42424/tcp
sudo ufw allow 42425/udp
```

Open a two-minute pairing window:

```sh
~/.local/bin/devnode-agent pair
```

## Desktop pairing

1. Open **Connection** in DevNode Desktop.
2. Select **Scan local network**.
3. Choose the Ubuntu computer.
4. Compare the six-digit code shown on both computers.
5. Approve the request in the Ubuntu terminal.

DevNode generates a dedicated Ed25519 key locally, sends only its public key,
pins Ubuntu's SSH host key, stores the approved key in `authorized_keys`, and
then connects with standard OpenSSH. The pairing window closes after two
minutes. Later IP-address changes are resolved automatically by matching the
pinned Ubuntu SSH host key on the current local network.

## Manage paired devices on Ubuntu

```sh
devnode-agent devices
devnode-agent revoke <device-name-or-fingerprint>
```

Revocation removes both the device record and its public key from
`~/.ssh/authorized_keys`.

## Network requirements

- Both computers must be on the same local network.
- Guest Wi-Fi client isolation must be disabled.
- TCP port `42424` and UDP port `42425` must be reachable during pairing.
- SSH TCP port `22` must remain reachable for normal DevNode operation.

