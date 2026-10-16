package devtool

import (
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"syscall"
)

// PortLease reserves a runtime port until Close is called.
type PortLease interface {
	Port() int
	Close() error
}

// PortAllocator reserves the first available port at or above a preferred
// port.
type PortAllocator interface {
	Acquire(preferred int) (PortLease, error)
}

// FilePortAllocator coordinates ports between worktrees with advisory locks in
// the main checkout's tmp/ports directory.
type FilePortAllocator struct {
	LockRoot string
	// Owner is written into each lock file this allocator holds, so other
	// commands can tell which worktree a leased port belongs to.
	Owner string
}

type filePortLease struct {
	port int
	file *os.File
}

func (a *FilePortAllocator) Acquire(preferred int) (PortLease, error) {
	if err := os.MkdirAll(a.LockRoot, 0o755); err != nil {
		return nil, fmt.Errorf("create port lock directory: %w", err)
	}

	for port := preferred; port <= 65535; port++ {
		file, err := os.OpenFile(filepath.Join(a.LockRoot, strconv.Itoa(port)+".lock"), os.O_CREATE|os.O_RDWR, 0o600)
		if err != nil {
			return nil, fmt.Errorf("open port lock: %w", err)
		}
		if err := syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
			_ = file.Close()
			if errors.Is(err, syscall.EWOULDBLOCK) {
				continue
			}
			return nil, fmt.Errorf("lock port %d: %w", port, err)
		}
		// Clear any owner a crashed launcher left behind before probing, so
		// nothing reads a stale owner while this lease is being decided.
		_ = file.Truncate(0)
		if portAvailable(port) {
			if err := writeOwner(file, a.Owner); err != nil {
				_ = syscall.Flock(int(file.Fd()), syscall.LOCK_UN)
				_ = file.Close()
				return nil, err
			}
			return &filePortLease{port: port, file: file}, nil
		}
		_ = syscall.Flock(int(file.Fd()), syscall.LOCK_UN)
		_ = file.Close()
	}
	return nil, fmt.Errorf("no available port at or above %d", preferred)
}

func writeOwner(file *os.File, owner string) error {
	if err := file.Truncate(0); err != nil {
		return fmt.Errorf("record port owner: %w", err)
	}
	if _, err := file.WriteAt([]byte(owner), 0); err != nil {
		return fmt.Errorf("record port owner: %w", err)
	}
	return nil
}

// portLeasedBy reports whether a running launcher for owner holds the lease on
// port. A lease another worktree holds doesn't count.
func portLeasedBy(lockRoot string, port int, owner string) bool {
	file, err := os.OpenFile(filepath.Join(lockRoot, strconv.Itoa(port)+".lock"), os.O_RDWR, 0o600)
	if err != nil {
		return false
	}
	defer func() { _ = file.Close() }()
	if err := syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err == nil {
		// Nobody holds the lease.
		_ = syscall.Flock(int(file.Fd()), syscall.LOCK_UN)
		return false
	} else if !errors.Is(err, syscall.EWOULDBLOCK) {
		return false
	}
	contents, err := os.ReadFile(file.Name())
	return err == nil && string(contents) == owner
}

func (l *filePortLease) Port() int {
	return l.port
}

func (l *filePortLease) Close() error {
	// Clear the owner while still holding the lease, so it never outlives it.
	_ = l.file.Truncate(0)
	unlockErr := syscall.Flock(int(l.file.Fd()), syscall.LOCK_UN)
	closeErr := l.file.Close()
	return errors.Join(unlockErr, closeErr)
}

func firstAvailablePort(preferred int) (int, error) {
	for port := preferred; port <= 65535; port++ {
		if portAvailable(port) {
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port at or above %d", preferred)
}

// portAvailable reports whether nothing listens on the port on any loopback
// or wildcard address. Probing only 127.0.0.1 misses another project's server
// on 0.0.0.0 or ::, which the dev servers' wildcard binds then collide with.
func portAvailable(port int) bool {
	probes := []struct{ network, host string }{
		{"tcp4", "127.0.0.1"},
		{"tcp4", "0.0.0.0"},
		{"tcp6", "::1"},
		{"tcp6", "::"},
	}
	for _, probe := range probes {
		listener, err := net.Listen(probe.network, net.JoinHostPort(probe.host, strconv.Itoa(port)))
		if err != nil {
			// A machine without IPv6 can't refuse the port over it.
			if probe.network == "tcp6" && isAddressUnavailable(err) {
				continue
			}
			return false
		}
		_ = listener.Close()
	}
	return true
}

func isAddressUnavailable(err error) bool {
	return errors.Is(err, syscall.EADDRNOTAVAIL) || errors.Is(err, syscall.EAFNOSUPPORT)
}
