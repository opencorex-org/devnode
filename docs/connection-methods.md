# DevNode connection methods

DevNode always uses the operating system OpenSSH client, verifies the Ubuntu
host key, and authenticates with an SSH key. The selected method changes how
the desktop reaches Ubuntu; it does not weaken SSH security.

Connection settings are stored on each desktop. You can use Local LAN while
team members use Cloudflare WARP remotely at the same time.

## Local LAN

Use this when the desktop and Ubuntu server are on the same trusted network.

On Ubuntu:

```sh
git clone https://github.com/opencorex-org/devnode.git
cd devnode
make install-agent
~/.local/bin/devnode-agent pair
```

In DevNode Desktop:

1. Open **Connection** and select **Local LAN**.
2. Select **Scan local network**.
3. Choose Ubuntu and compare the six-digit code on both computers.
4. Approve the request in the Ubuntu terminal.
5. Save and select **Test**.

Local discovery is needed during pairing. Normal operation uses SSH port 22
and the pinned server host key. See [Secure local pairing](secure-pairing.md)
for firewall details.

## Cloudflare WARP

Use this for approved team members connecting from another network.

### Administrator setup

1. Install Cloudflare Tunnel on Ubuntu.
2. Route `10.77.0.10/32` through the Tunnel.
3. Require Cloudflare identity, MFA, and an enrolled device.
4. Add a separate SSH public key and Ubuntu account for each team member.
5. Keep router ports 22 and 5432 closed.

Follow [Cloudflare remote access](remote-access.md) for the complete setup.

### Team-member connection

1. Install the Cloudflare One/WARP client.
2. Enroll it in the administrator's Zero Trust organization.
3. Connect WARP and confirm `10.77.0.10` is routed privately.
4. In DevNode **Connection**, select **Cloudflare WARP**.
5. Enter `10.77.0.10`, the assigned Ubuntu user, and the member's SSH key.
6. Save and select **Test**.

Ubuntu connects outbound to Cloudflare. WARP carries authorized traffic to the
private address, and DevNode uses native SSH over that route. This preserves
DevNode SSH tunnels.

## Manual SSH

Use this when you manage a reachable internal hostname, VPN address, or custom
SSH port. First test it outside DevNode:

```sh
ssh -p 22 -i ~/.ssh/devnode_ed25519 ubuntu-user@server.example.internal
```

Then open DevNode **Connection**, select **Manual SSH**, and enter the server
host, Ubuntu user, SSH port, identity-file path, and timeout. Save and select
**Test**. Verify the server fingerprint before accepting a new host key. Never
use `StrictHostKeyChecking=no` to bypass a mismatch.

## PostgreSQL with any method

Start an SSH tunnel:

```sh
devnode tunnel postgres 15432
```

Configure the database client with:

```text
Host: 127.0.0.1
Port: 15432
Database: app
Username: assigned database user
```

The local port is forwarded through the selected SSH connection to PostgreSQL
on Ubuntu. Port 5432 remains private and needs no router port forward or public
Cloudflare hostname.

## Troubleshooting

- **Local scan finds nothing:** confirm both computers share a LAN and guest
  Wi-Fi client isolation is disabled.
- **WARP address times out:** check WARP enrollment, identity policy, Tunnel
  health, private route, and Split Tunnel settings.
- **Permission denied:** check the Ubuntu user and that member's SSH public key.
- **Host-key failure:** compare the Ubuntu fingerprint with the administrator.
  Never automatically replace an unexpected key.
- **PostgreSQL refuses connection:** keep the SSH tunnel running and connect to
  `127.0.0.1:15432`, not directly to Ubuntu.
