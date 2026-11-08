# Cloudflare remote access

This setup lets DevNode use its normal OpenSSH connection and port forwarding
from outside the local network. Cloudflare Tunnel is outbound-only; do not add
router forwards for SSH port 22 or PostgreSQL port 5432.

## Architecture

```text
DevNode Desktop + WARP
          |
Cloudflare Zero Trust policy (identity, MFA, device)
          |
Cloudflare Tunnel (outbound connector on Ubuntu)
          |
10.77.0.10/32 -> SSH:22 -> PostgreSQL via DevNode SSH tunnel
```

Use Cloudflare WARP private-network routing for DevNode. Do not use Access for
Infrastructure as the primary transport because it does not support the SSH
local port forwarding used by DevNode tunnels.

## 1. Prepare Ubuntu

Pair on the local network before enabling remote access:

```sh
git clone https://github.com/opencorex-org/devnode.git
cd devnode
make install-agent
~/.local/bin/devnode-agent pair
```

Add a stable overlay address. This avoids collisions with remote networks that
also use `192.168.1.0/24`:

```sh
sudo tee /etc/systemd/system/devnode-overlay.service >/dev/null <<'UNIT'
[Unit]
Description=DevNode private overlay address
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/ip address replace 10.77.0.10/32 dev lo
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now devnode-overlay.service
```

Verify it with `ip address show dev lo`.

## 2. Install Cloudflare Tunnel

1. In Cloudflare Zero Trust, open **Networks > Tunnels**.
2. Create a remotely managed Cloudflared tunnel.
3. Select Ubuntu and run the generated installation command. It has this form:

   ```sh
   sudo cloudflared service install <TUNNEL_TOKEN>
   ```

4. In the tunnel's **Private Network** routes, add `10.77.0.10/32`.
5. Confirm that the connector is healthy.

Treat the tunnel token as a secret. Do not put it in source control or paste it
into DevNode configuration.

## 3. Configure Zero Trust clients

1. Connect an identity provider to Cloudflare Zero Trust.
2. Require MFA and an enrolled device for the private network.
3. Install the Cloudflare One agent (WARP) on each approved macOS, Windows, or
   Linux client and enroll it in the organization.
4. Ensure Split Tunnels includes `10.77.0.10/32` rather than excluding it.

Test while away from the Ubuntu LAN:

```sh
ssh -i ~/.ssh/devnode_ed25519 ubuntu-user@10.77.0.10
```

The existing pinned SSH host key remains the server identity check. Never work
around a host-key mismatch with `StrictHostKeyChecking=no`.

## 4. Configure DevNode Desktop

1. Open **Connection**.
2. Select **Cloudflare WARP**.
3. Enter `10.77.0.10` as the server host.
4. Keep the paired Ubuntu username and DevNode identity file.
5. Save, connect WARP, and select **Test**.

Local discovery is intentionally disabled in Cloudflare mode because UDP LAN
pairing discovery does not cross the private overlay.

## 5. Keep PostgreSQL private

Install PostgreSQL from Ubuntu packages and create a non-superuser application
role. Find its active configuration paths with:

```sh
sudo -u postgres psql -Atc 'show config_file; show hba_file;'
```

In `postgresql.conf`, bind only to loopback and the overlay:

```ini
listen_addresses = '127.0.0.1,10.77.0.10'
password_encryption = 'scram-sha-256'
ssl = on
```

In `pg_hba.conf`, grant only the databases and roles actually required. Do not
add an Internet-wide rule such as `0.0.0.0/0`. Restart PostgreSQL after checking
the configuration:

```sh
sudo -u postgres psql -c "select pg_reload_conf();"
sudo systemctl restart postgresql
```

For a database client, prefer DevNode's SSH tunnel. It binds only to local
loopback and forwards to PostgreSQL on Ubuntu:

```sh
devnode tunnel postgres 15432
psql 'host=127.0.0.1 port=15432 dbname=app user=app sslmode=require'
```

## 6. Firewall and acceptance checks

- Keep UFW default-deny for inbound traffic.
- Permit SSH from the LAN only if local administration is required.
- Do not allow `5432/tcp` from the public Internet.
- Permit the outbound Cloudflare connector traffic required by your network.
- With WARP disconnected, `10.77.0.10` must be unreachable remotely.
- An unauthorized identity or revoked device must be denied.
- An authorized device must support DevNode SSH and PostgreSQL tunnels.
- Back up PostgreSQL off-server and test a restore before production use.

For optional emergency browser SSH, create a separate Cloudflare Access
application and policy. Keep it separate from DevNode's native SSH transport.
