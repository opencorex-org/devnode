package pairing

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"strconv"
	"time"
)

func Exchange(ctx context.Context, address string, port int, request Request) (Response, error) {
	dialer := net.Dialer{Timeout: 5 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(address, strconv.Itoa(port)))
	if err != nil {
		return Response{}, fmt.Errorf("connect to Ubuntu pairing agent: %w", err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(10 * time.Second))
	if err := json.NewEncoder(conn).Encode(request); err != nil {
		return Response{}, fmt.Errorf("send pairing request: %w", err)
	}
	var response Response
	if err := json.NewDecoder(bufio.NewReader(conn)).Decode(&response); err != nil {
		return Response{}, fmt.Errorf("read pairing response: %w", err)
	}
	if response.Status == "error" {
		return response, fmt.Errorf("pairing agent: %s", response.Message)
	}
	return response, nil
}
