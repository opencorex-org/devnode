package tui

import (
	"context"
	"fmt"
	"io"
	"sort"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/opencorex-org/devnode/internal/config"
	devssh "github.com/opencorex-org/devnode/internal/ssh"
	"github.com/opencorex-org/devnode/internal/status"
)

var (
	cyan       = lipgloss.Color("#54D6E8")
	green      = lipgloss.Color("#5EE49B")
	yellow     = lipgloss.Color("#F6C85F")
	red        = lipgloss.Color("#FF6B7A")
	muted      = lipgloss.Color("#7F8C9F")
	panel      = lipgloss.Color("#263445")
	titleStyle = lipgloss.NewStyle().Bold(true).Foreground(cyan)
	mutedStyle = lipgloss.NewStyle().Foreground(muted)
	goodStyle  = lipgloss.NewStyle().Foreground(green)
	warnStyle  = lipgloss.NewStyle().Foreground(yellow)
	badStyle   = lipgloss.NewStyle().Foreground(red)
)

type fetchMsg struct {
	snapshot   status.Snapshot
	err        error
	at         time.Time
	generation int
}
type tickMsg struct{ generation int }
type hostVerifiedMsg struct{ err error }
type discoveryMsg struct {
	host string
	err  error
}

type model struct {
	ctx            context.Context
	client         devssh.Client
	cfg            config.Config
	target         string
	interval       time.Duration
	generation     int
	width, height  int
	tab            int
	loading        bool
	snapshot       status.Snapshot
	netRXRate      float64
	netTXRate      float64
	err            error
	updated        time.Time
	failedAttempts int
	editingHost    bool
	hostInput      string
	hostInputErr   error
	verifyHostKey  bool
	searchingHost  bool
	searchErr      error
}

func Run(ctx context.Context, client devssh.Client, cfg config.Config, interval time.Duration, in io.Reader, out io.Writer) error {
	m := model{ctx: ctx, client: client, cfg: cfg, target: config.Target(cfg), interval: interval, loading: true, width: 80, height: 24}
	_, err := tea.NewProgram(m, tea.WithContext(ctx), tea.WithInput(in), tea.WithOutput(out)).Run()
	return err
}

func (m model) Init() tea.Cmd { return m.fetchCmd() }

func (m model) fetchCmd() tea.Cmd {
	generation := m.generation
	return func() tea.Msg {
		out, err := m.client.OutputBatch(m.ctx, status.Script(m.cfg.PostgresService))
		if err != nil {
			return fetchMsg{err: err, at: time.Now(), generation: generation}
		}
		snapshot, err := status.Parse(string(out))
		return fetchMsg{snapshot: snapshot, err: err, at: time.Now(), generation: generation}
	}
}

func (m model) tickCmd() tea.Cmd {
	generation := m.generation
	return tea.Tick(m.interval, func(time.Time) tea.Msg { return tickMsg{generation: generation} })
}

func (m model) discoveryCmd() tea.Cmd {
	return func() tea.Msg {
		host, err := m.client.DiscoverMovedHost(m.ctx)
		return discoveryMsg{host: host, err: err}
	}
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
	case tea.KeyPressMsg:
		if m.editingHost {
			switch msg.String() {
			case "enter":
				candidate := m.cfg
				candidate.Host = strings.TrimSpace(m.hostInput)
				if err := candidate.Validate(); err != nil {
					m.hostInputErr = err
					return m, nil
				}
				m.cfg = candidate
				m.client.Config = candidate
				m.target = config.Target(candidate)
				m.editingHost, m.hostInputErr = false, nil
				m.verifyHostKey = false
				m.searchErr = nil
				m.failedAttempts = 0
				m.generation++
				m.loading = true
				return m, m.fetchCmd()
			case "backspace":
				runes := []rune(m.hostInput)
				if len(runes) > 0 {
					m.hostInput = string(runes[:len(runes)-1])
				}
				m.hostInputErr = nil
				return m, nil
			case "esc", "ctrl+c":
				m.editingHost, m.hostInputErr = false, nil
				return m, nil
			default:
				if text := tea.Key(msg).Text; text != "" {
					m.hostInput += text
					m.hostInputErr = nil
				}
				return m, nil
			}
		}
		switch msg.String() {
		case "q", "ctrl+c", "esc":
			return m, tea.Quit
		case "r":
			m.searchErr = nil
			m.generation++
			m.loading = true
			return m, m.fetchCmd()
		case "v":
			if m.verifyHostKey {
				return m, tea.ExecProcess(m.client.HostCheckCommand(m.ctx), func(err error) tea.Msg {
					return hostVerifiedMsg{err: err}
				})
			}
		case "i":
			if m.failedAttempts >= 5 || m.verifyHostKey || m.searchErr != nil {
				m.editingHost = true
				m.hostInput, m.hostInputErr = "", nil
			}
		case "s":
			if (m.err != nil || m.searchErr != nil) && !m.searchingHost {
				m.generation++
				m.searchingHost = true
				m.searchErr = nil
				return m, m.discoveryCmd()
			}
		case "tab", "right", "l":
			m.tab = (m.tab + 1) % 3
		case "shift+tab", "left", "h":
			m.tab = (m.tab + 2) % 3
		case "1":
			m.tab = 0
		case "2":
			m.tab = 1
		case "3", "?":
			m.tab = 2
		case "+", "=":
			if m.interval > 500*time.Millisecond {
				m.interval -= 500 * time.Millisecond
				m.generation++
				return m, m.tickCmd()
			}
		case "-":
			if m.interval < 30*time.Second {
				m.interval += 500 * time.Millisecond
				m.generation++
				return m, m.tickCmd()
			}
		}
	case fetchMsg:
		if msg.generation != m.generation {
			return m, nil
		}
		previousUpdate := m.updated
		m.loading, m.err, m.updated = false, msg.err, msg.at
		if msg.err != nil {
			m.failedAttempts++
			m.verifyHostKey = devssh.IsHostVerificationError(msg.err)
			if m.verifyHostKey {
				return m, nil
			}
			if m.failedAttempts >= 5 {
				return m, nil
			}
		} else {
			m.failedAttempts = 0
			m.verifyHostKey = false
			m.netRXRate, m.netTXRate = 0, 0
			elapsed := msg.at.Sub(previousUpdate).Seconds()
			if m.snapshot.NetAvailable && msg.snapshot.NetAvailable && elapsed > 0 {
				if msg.snapshot.NetRX >= m.snapshot.NetRX {
					m.netRXRate = float64(msg.snapshot.NetRX-m.snapshot.NetRX) / elapsed
				}
				if msg.snapshot.NetTX >= m.snapshot.NetTX {
					m.netTXRate = float64(msg.snapshot.NetTX-m.snapshot.NetTX) / elapsed
				}
			}
			m.snapshot = msg.snapshot
		}
		return m, m.tickCmd()
	case hostVerifiedMsg:
		if msg.err != nil {
			m.err = fmt.Errorf("host verification was not completed: %w", msg.err)
			return m, nil
		}
		m.verifyHostKey = false
		m.failedAttempts = 0
		m.generation++
		m.loading = true
		return m, m.fetchCmd()
	case discoveryMsg:
		m.searchingHost = false
		if msg.err != nil {
			m.searchErr = msg.err
			return m, nil
		}
		candidate := m.cfg
		candidate.Host = msg.host
		if err := candidate.Validate(); err != nil {
			m.searchErr = err
			return m, nil
		}
		m.cfg = candidate
		m.client.Config = candidate
		m.target = config.Target(candidate)
		m.failedAttempts = 0
		m.verifyHostKey = false
		m.searchErr = nil
		m.generation++
		m.loading = true
		return m, m.fetchCmd()
	case tickMsg:
		if msg.generation != m.generation {
			return m, nil
		}
		return m, m.fetchCmd()
	}
	return m, nil
}

func (m model) View() tea.View {
	w := m.width
	if w < 50 {
		w = 50
	}
	contentWidth := w - 6
	header := titleStyle.Render("◆ DEVNODE") + "  " + mutedStyle.Render(m.target)
	connection := goodStyle.Render("● ONLINE")
	if m.err != nil {
		connection = badStyle.Render("● CONNECTION ERROR")
	} else if m.snapshot.Host == "" {
		connection = warnStyle.Render("◌ CONNECTING...")
	}
	header = header + strings.Repeat(" ", max(1, contentWidth-lipgloss.Width(header)-lipgloss.Width(connection))) + connection

	tabs := []string{"1 Overview", "2 Services", "3 Help"}
	for i := range tabs {
		style := mutedStyle.Padding(0, 1)
		if i == m.tab {
			style = lipgloss.NewStyle().Bold(true).Foreground(cyan).Background(panel).Padding(0, 1)
		}
		tabs[i] = style.Render(tabs[i])
	}
	body := ""
	if m.searchingHost {
		searchMsg := fmt.Sprintf("Scanning the local network for an SSH server on port %d.", m.cfg.Port)
		if !config.NeedsDiscovery(m.cfg.Host) {
			searchMsg = fmt.Sprintf("Looking for the trusted SSH key near %s on port %d.", m.cfg.Host, m.cfg.Port)
		}
		body = titleStyle.Render("Searching local network…") + "\n\n" +
			searchMsg + "\n\n" +
			mutedStyle.Render("Only an exact known-host key match will be used.")
	} else if m.searchErr != nil || m.err != nil && (m.snapshot.Host == "" || m.failedAttempts >= 5 || m.verifyHostKey) {
		body = m.errorView()
	} else {
		switch m.tab {
		case 0:
			body = m.overview(contentWidth)
		case 1:
			body = m.services(contentWidth)
		default:
			body = helpView()
		}
	}
	footer := mutedStyle.Render(fmt.Sprintf("tab/←/→ navigate  r refresh  +/- interval (%s)  q quit", m.interval))
	if !m.updated.IsZero() {
		footer += mutedStyle.Render("  •  updated " + m.updated.Format("15:04:05"))
	}
	frame := lipgloss.NewStyle().Width(contentWidth).Border(lipgloss.RoundedBorder()).BorderForeground(panel).Padding(0, 1)
	view := tea.NewView(frame.Render(header + "\n" + strings.Join(tabs, " ") + "\n\n" + body + "\n\n" + footer))
	view.AltScreen = true
	view.WindowTitle = "DevNode — " + m.target
	return view
}

func (m model) overview(width int) string {
	s := m.snapshot
	identity := fmt.Sprintf("%s  %s  •  %s  •  up %s", titleStyle.Render(fallback(s.Host)), mutedStyle.Render(fallback(s.IP)), fallback(s.OS), fallback(s.Uptime))
	resources := metric("CPU", s.CPU, "", width) + "\n" + metric("MEM", s.Memory, s.MemoryTotal, width) + "\n" + metric("DISK", s.Disk, s.DiskTotal, width)
	if s.NetAvailable {
		resources += "\n" + networkUsage(s, m.netRXRate, m.netTXRate)
	} else {
		resources += "\nNET   " + mutedStyle.Render("unavailable")
	}
	running, installed, missing := 0, 0, 0
	for _, svc := range s.Services {
		switch svc.State {
		case "active", "running":
			running++
		case "not-installed":
			missing++
		default:
			installed++
		}
	}
	summary := fmt.Sprintf("%s  %s  %s", goodStyle.Render(fmt.Sprintf("● %d running", running)), warnStyle.Render(fmt.Sprintf("◆ %d installed", installed)), mutedStyle.Render(fmt.Sprintf("○ %d missing", missing)))
	important := []string{"docker", "postgresql", "redis", "github-runner", "mosquitto", "ros2"}
	rows := make([]string, 0, len(important))
	for _, name := range important {
		rows = append(rows, serviceRow(serviceLabel(name), s.Services[name], width))
	}
	out := identity + "\n\n" + resources
	if tc := m.toolchain(width); tc != "" {
		out += "\n\n" + tc
	}
	return out + "\n\n" + summary + "\n\n" + titleStyle.Render("ESSENTIAL SERVICES") + "\n" + strings.Join(rows, "\n")
}

func networkUsage(s status.Snapshot, rxRate, txRate float64) string {
	return fmt.Sprintf("NET   %s  %s total  %s  %s total",
		goodStyle.Render("↓ "+status.FormatBytes(uint64(rxRate))+"/s"), status.FormatBytes(s.NetRX),
		cyanStyle("↑ "+status.FormatBytes(uint64(txRate))+"/s"), status.FormatBytes(s.NetTX))
}

func cyanStyle(s string) string { return lipgloss.NewStyle().Foreground(cyan).Render(s) }

func (m model) toolchain(width int) string {
	tools := status.DisplayTools(m.snapshot.Tools)
	if len(tools) == 0 {
		return ""
	}
	rows := make([]string, 0, (len(tools)+1)/2)
	colWidth := max(24, (width-4)/2)
	cellStyle := lipgloss.NewStyle().Width(colWidth)
	for i := 0; i < len(tools); i += 2 {
		left := toolRow(tools[i].Label, tools[i].Version)
		if i+1 < len(tools) && width >= 54 {
			right := toolRow(tools[i+1].Label, tools[i+1].Version)
			rows = append(rows, cellStyle.Render(left)+right)
		} else {
			rows = append(rows, left)
			if i+1 < len(tools) {
				rows = append(rows, toolRow(tools[i+1].Label, tools[i+1].Version))
			}
		}
	}
	return titleStyle.Render("DEV RUNTIMES") + "\n" + strings.Join(rows, "\n")
}

func toolRow(label, version string) string {
	if version != "" {
		return fmt.Sprintf("%s %-10s %s", goodStyle.Render("●"), label, version)
	}
	return fmt.Sprintf("%s %-10s %s", badStyle.Render("○"), label, mutedStyle.Render("not installed"))
}

func (m model) services(width int) string {
	names := make([]string, 0, len(m.snapshot.Services))
	for name := range m.snapshot.Services {
		names = append(names, name)
	}
	sort.Strings(names)
	rows := []string{titleStyle.Render("ALL DISCOVERED SERVICES")}
	for _, name := range names {
		rows = append(rows, serviceRow(serviceLabel(name), m.snapshot.Services[name], width))
	}
	return strings.Join(rows, "\n")
}

func metric(label string, value int, total string, width int) string {
	barWidth := min(32, max(10, width-28))
	if value < 0 {
		return fmt.Sprintf("%-5s %s", label, mutedStyle.Render("unavailable"))
	}
	filled := value * barWidth / 100
	color := green
	if value >= 80 {
		color = red
	} else if value >= 60 {
		color = yellow
	}
	bar := lipgloss.NewStyle().Foreground(color).Render(strings.Repeat("█", filled)) + mutedStyle.Render(strings.Repeat("░", barWidth-filled))
	suffix := fmt.Sprintf("%3d%%", value)
	if total != "" {
		suffix += " of " + total
	}
	return fmt.Sprintf("%-5s %s  %s", label, bar, suffix)
}

func serviceRow(label string, svc status.Service, width int) string {
	state, source := svc.State, svc.Source
	if state == "" {
		state = "unknown"
	}
	if source == "" || source == "none" {
		source = "—"
	}
	icon := badStyle.Render("○")
	stateStyle := mutedStyle
	if state == "active" || state == "running" {
		icon, stateStyle = goodStyle.Render("●"), goodStyle
	} else if state == "installed" || state == "inactive" || state == "exited" {
		icon, stateStyle = warnStyle.Render("◆"), warnStyle
	}
	gap := max(1, width-18-len(state)-len(source))
	return fmt.Sprintf("%s %-16s%s%s  %s", icon, label, strings.Repeat(" ", gap), stateStyle.Render(strings.ToUpper(state)), mutedStyle.Render("["+source+"]"))
}

func (m model) errorView() string {
	if m.searchErr != nil {
		return badStyle.Render("Automatic IP search did not find the server") + "\n\n" +
			m.searchErr.Error() + "\n\n" +
			titleStyle.Render("[s] Search again   [r] Retry current IP   [i] Change IP")
	}
	if m.verifyHostKey {
		return badStyle.Render("SSH host key is not trusted yet") + "\n\n" +
			fmt.Sprintf("Target: %s", m.target) + "\n\n" +
			mutedStyle.Render("Review the fingerprint carefully before accepting it.") + "\n\n" +
			titleStyle.Render("[v] Verify host key   [s] Search LAN   [i] Change IP")
	}
	body := badStyle.Render("Unable to reach the server") + "\n\n" + m.err.Error()
	if m.failedAttempts < 5 {
		return body + "\n\n" + mutedStyle.Render(fmt.Sprintf("Attempt %d of 5 failed. DevNode will retry automatically.", m.failedAttempts)) +
			"\n\n" + titleStyle.Render("[r] Retry now   [s] Search LAN")
	}
	if m.editingHost {
		body += "\n\n" + titleStyle.Render("New IP or hostname: ") + m.hostInput + "█"
		if m.hostInputErr != nil {
			body += "\n" + badStyle.Render(m.hostInputErr.Error())
		}
		return body + "\n\n" + mutedStyle.Render("Enter to connect  •  Esc to cancel")
	}
	return body + "\n\n" + warnStyle.Render("Automatic retries paused after 5 failed attempts.") +
		"\n\n" + titleStyle.Render("[r] Retry current IP   [s] Search LAN   [i] Change IP")
}
func helpView() string {
	return titleStyle.Render("KEYBOARD") + "\n\n  1 / 2 / 3       switch views\n  tab / ← / →     navigate views\n  r               refresh now\n  s               find moved server after failure\n  + / -           faster / slower refresh\n  q / esc          close DevNode\n\n" + titleStyle.Render("COMMANDS") + "\n\n  devnode install     choose one missing service\n  devnode hardware    hardware inventory\n  devnode network     interfaces and listening ports\n  devnode tunnel NAME secure local access"
}
func fallback(s string) string {
	if s == "" {
		return "unavailable"
	}
	return s
}
func serviceLabel(s string) string {
	labels := map[string]string{"docker": "Docker", "postgresql": "PostgreSQL", "redis": "Redis", "mongodb": "MongoDB", "github-runner": "GitHub Runner", "uptime-kuma": "Uptime Kuma", "node-red": "Node-RED", "mosquitto": "MQTT Broker", "ros2": "ROS 2"}
	if label := labels[s]; label != "" {
		return label
	}
	return strings.Title(strings.ReplaceAll(s, "-", " "))
}
