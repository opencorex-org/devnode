package pairing

import "time"

const (
	DiscoveryPort = 42425
	PairingPort   = 42424
	Protocol      = "devnode-pair-v1"
)

type Server struct {
	Name            string `json:"name"`
	Address         string `json:"address"`
	Port            int    `json:"port"`
	User            string `json:"user"`
	SessionID       string `json:"sessionId"`
	HostFingerprint string `json:"hostFingerprint"`
}

type Request struct {
	Protocol    string `json:"protocol"`
	Action      string `json:"action"`
	RequestID   string `json:"requestId,omitempty"`
	SessionID   string `json:"sessionId,omitempty"`
	DeviceName  string `json:"deviceName,omitempty"`
	PublicKey   string `json:"publicKey,omitempty"`
	ClientNonce string `json:"clientNonce,omitempty"`
}

type Response struct {
	Status          string `json:"status"`
	Message         string `json:"message,omitempty"`
	RequestID       string `json:"requestId,omitempty"`
	SessionID       string `json:"sessionId,omitempty"`
	Port            int    `json:"port,omitempty"`
	Code            string `json:"code,omitempty"`
	ServerName      string `json:"serverName,omitempty"`
	ServerUser      string `json:"serverUser,omitempty"`
	HostKey         string `json:"hostKey,omitempty"`
	HostFingerprint string `json:"hostFingerprint,omitempty"`
	ExpiresAt       string `json:"expiresAt,omitempty"`
}

type Device struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	PublicKey string    `json:"publicKey"`
	PairedAt  time.Time `json:"pairedAt"`
}

type Pending struct {
	RequestID       string
	DeviceName      string
	PublicKey       string
	Code            string
	Status          string
	Message         string
	ExpiresAt       time.Time
	HostKey         string
	HostFingerprint string
}
