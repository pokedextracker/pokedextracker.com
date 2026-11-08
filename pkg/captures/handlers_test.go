package captures

import (
	"context"
	"testing"

	"github.com/pokedextracker/pokedextracker.com/pkg/auth"
	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The database in these tests: users by id, and dexes by id with their owner.
var (
	testUsers = map[int]string{1: "ash", 2: "misty"}
	testDexes = map[int]int{10: 1, 20: 2}
)

// fakeDexes looks dexes up the way the real query does, including the join on
// the owner's username.
type fakeDexes struct{}

func (fakeDexes) RetrieveDex(_ context.Context, opts dexes.RetrieveDexOptions) (*dexes.Dex, error) {
	owner, ok := testDexes[*opts.ID]
	if !ok {
		return nil, errcodes.NotFound("dex")
	}
	if opts.Username != nil && testUsers[owner] != *opts.Username {
		return nil, errcodes.NotFound("dex")
	}
	return &dexes.Dex{ID: *opts.ID, UserID: owner}, nil
}

func fakeTokenUserExists(_ context.Context, session *auth.Session) (bool, error) {
	return testUsers[session.ID] == session.Username, nil
}

func TestRetrieveOwnDex(t *testing.T) {
	t.Parallel()

	h := &handler{dexService: fakeDexes{}, tokenUserExists: fakeTokenUserExists}
	cases := map[string]struct {
		session *auth.Session
		dexID   int
		wantErr error
	}{
		"own dex":            {&auth.Session{ID: 1, Username: "ash"}, 10, nil},
		"someone else's dex": {&auth.Session{ID: 1, Username: "ash"}, 20, errcodes.Forbidden("marking")},
		"missing dex":        {&auth.Session{ID: 1, Username: "ash"}, 99, errcodes.NotFound("dex")},
		// The account is gone, along with its dexes.
		"deleted account": {&auth.Session{ID: 3, Username: "brock"}, 30, errcodes.DeletedUser()},
		// A deleted account's username, since taken by misty's new account.
		"username taken since": {&auth.Session{ID: 4, Username: "misty"}, 20, errcodes.DeletedUser()},
		// A token from another database (like staging's) whose id is ash's
		// here, but whose username isn't.
		"another database's token": {&auth.Session{ID: 1, Username: "gary"}, 10, errcodes.DeletedUser()},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			dex, err := h.retrieveOwnDex(context.Background(), tc.session, tc.dexID, "marking")

			if tc.wantErr == nil {
				require.NoError(t, err)
				assert.Equal(t, tc.dexID, dex.ID)
				return
			}
			require.ErrorIs(t, err, tc.wantErr)
			assert.Nil(t, dex)
		})
	}
}
