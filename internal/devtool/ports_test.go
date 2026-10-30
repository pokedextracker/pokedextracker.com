package devtool

import (
	"net"
	"strconv"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

//nolint:paralleltest // It binds real ports, which tests running alongside could take.
func TestFilePortAllocatorSkipsLeasedPorts(t *testing.T) {
	allocator := &FilePortAllocator{LockRoot: t.TempDir()}
	preferred := freePort(t)

	first, err := allocator.Acquire(preferred)
	require.NoError(t, err)
	t.Cleanup(func() { _ = first.Close() })

	second, err := allocator.Acquire(first.Port())
	require.NoError(t, err)
	t.Cleanup(func() { _ = second.Close() })

	assert.Greater(t, second.Port(), first.Port(), "a leased port isn't handed out twice")

	require.NoError(t, first.Close())
	third, err := allocator.Acquire(first.Port())
	require.NoError(t, err)
	t.Cleanup(func() { _ = third.Close() })
	assert.Equal(t, first.Port(), third.Port(), "a released port can be leased again")
}

//nolint:paralleltest // It binds real ports, which tests running alongside could take.
func TestFilePortAllocatorSkipsPortsInUse(t *testing.T) {
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	require.NoError(t, err)
	t.Cleanup(func() { _ = listener.Close() })
	busy := listener.Addr().(*net.TCPAddr).Port

	allocator := &FilePortAllocator{LockRoot: t.TempDir()}
	lease, err := allocator.Acquire(busy)
	require.NoError(t, err)
	t.Cleanup(func() { _ = lease.Close() })

	assert.NotEqual(t, busy, lease.Port())
	assert.False(t, portAvailable(busy))
}

// freePort returns a port nothing is listening on, so tests don't depend on
// which well-known ports this machine happens to use.
func freePort(t *testing.T) int {
	t.Helper()
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	require.NoError(t, err)
	port := listener.Addr().(*net.TCPAddr).Port
	require.NoError(t, listener.Close())
	require.True(t, portAvailable(port), "port "+strconv.Itoa(port)+" should be free")
	return port
}
