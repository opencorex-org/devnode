package pairing

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

func RandomID(bytes int) (string, error) {
	data := make([]byte, bytes)
	if _, err := rand.Read(data); err != nil {
		return "", err
	}
	return hex.EncodeToString(data), nil
}

func Fingerprint(publicKey string) (string, error) {
	fields := strings.Fields(publicKey)
	if len(fields) < 2 || fields[0] != "ssh-ed25519" {
		return "", errors.New("expected an Ed25519 SSH public key")
	}
	raw, err := base64.StdEncoding.DecodeString(fields[1])
	if err != nil {
		return "", fmt.Errorf("decode SSH public key: %w", err)
	}
	digest := sha256.Sum256(raw)
	return "SHA256:" + base64.RawStdEncoding.EncodeToString(digest[:]), nil
}

func NormalizePublicKey(publicKey, comment string) (string, error) {
	fields := strings.Fields(publicKey)
	if len(fields) < 2 || fields[0] != "ssh-ed25519" {
		return "", errors.New("only Ed25519 public keys are accepted")
	}
	if _, err := Fingerprint(strings.Join(fields[:2], " ")); err != nil {
		return "", err
	}
	comment = strings.Map(func(r rune) rune {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || strings.ContainsRune("._-", r) {
			return r
		}
		return '-'
	}, comment)
	return strings.Join(fields[:2], " ") + " devnode-" + comment, nil
}

func PairingCode(sessionID, clientNonce, publicKey, hostKey string) string {
	digest := sha256.Sum256([]byte(sessionID + "\x00" + clientNonce + "\x00" + publicKey + "\x00" + hostKey))
	number := (uint32(digest[0])<<16 | uint32(digest[1])<<8 | uint32(digest[2])) % 1000000
	value := fmt.Sprintf("%06d", number)
	return value[:3] + " " + value[3:]
}

func HostTarget(address string, port int) string {
	if port == 22 {
		return address
	}
	return "[" + address + "]:" + strconv.Itoa(port)
}
