package users

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/auth"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/dextypes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/games"
	"github.com/robinjoseph08/golib/pointerutil"
	"golang.org/x/crypto/bcrypt"
)

type handler struct {
	authService    *auth.Service
	config         *config.Config
	dexTypeService *dextypes.Service
	gameService    *games.Service
	userService    *Service
}

func (h *handler) create(c echo.Context) error {
	ctx := c.Request().Context()

	params := createParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	// Make sure a user with this username doesn't already exist. This doesn't really matter since we have a unique
	// constraint, but it's to prevent blowing through our user ID sequence.
	existing, err := h.userService.RetrieveUser(ctx, RetrieveUserOptions{
		Username: &params.Username,
	})
	if err != nil && !errors.Is(err, errcodes.NotFound("user")) {
		// We're expecting the not found error, so if we get one that different from that, it's a real error.
		return errors.WithStack(err)
	}
	if existing != nil {
		return errcodes.ExistingUsername()
	}

	// Fetch the provided game and dex type to make sure they exist, but also to compare their game family IDs.
	game, err := h.gameService.RetrieveGame(ctx, games.RetrieveGameOptions{
		ID: &params.Game,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	dexType, err := h.dexTypeService.RetrieveDexType(ctx, dextypes.RetrieveDexTypeOptions{
		ID: &params.DexType,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	// It's not possible through the frontend, but weird things can happen if the game and dex type don't match.
	if game.GameFamilyID != dexType.GameFamilyID {
		return errcodes.GameDexTypeMismatch()
	}

	// Hash the password.
	hash, err := bcrypt.GenerateFromPassword([]byte(params.Password), h.config.BcryptCost)
	if err != nil {
		return errors.WithStack(err)
	}

	// Determine user's IP address.
	var lastIP *string
	ip := c.RealIP()
	if ip != "" {
		lastIP = &ip
	}

	now := time.Now()
	user := &User{
		Username:         params.Username,
		FriendCode3DS:    params.FriendCode3DS,
		FriendCodeSwitch: params.FriendCodeSwitch,
		Password:         string(hash),
		LastIP:           lastIP,
		LastLogin:        pointerutil.Time(now),
		Referrer:         params.Referrer,
		DateCreated:      now,
		DateModified:     now,
	}
	dex := &dexes.Dex{
		Title:        params.Title,
		Slug:         params.Slug,
		Shiny:        *params.Shiny,
		GameID:       params.Game,
		DexTypeID:    params.DexType,
		DateCreated:  now,
		DateModified: now,
	}

	err = h.userService.CreateUserAndDex(ctx, user, dex)
	if err != nil {
		return errors.WithStack(err)
	}

	// Fetch the session so that we can sign it.
	session, err := h.authService.RetrieveSession(ctx, auth.RetrieveSessionOptions{
		Username: &user.Username,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	// Generate a new session token since we encode user information in the token.
	token, err := h.authService.SignSession(ctx, session)
	if err != nil {
		return errors.WithStack(err)
	}

	resp := struct {
		Token string `json:"token"`
	}{token}

	return errors.WithStack(c.JSON(http.StatusOK, resp))
}

func (h *handler) retrieve(c echo.Context) error {
	ctx := c.Request().Context()

	username := c.Param("username")

	user, err := h.userService.RetrieveUser(ctx, RetrieveUserOptions{
		Username: &username,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	return errors.WithStack(c.JSON(http.StatusOK, user))
}

func (h *handler) list(c echo.Context) error {
	ctx := c.Request().Context()

	params := listParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	users, err := h.userService.ListUsers(ctx, ListUsersOptions{
		Limit:  &params.Limit,
		Offset: &params.Offset,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	return errors.WithStack(c.JSON(http.StatusOK, users))
}

func (h *handler) update(c echo.Context) error {
	ctx := c.Request().Context()
	session := auth.FromContext(c)

	username := c.Param("username")

	params := updateParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	// Validate that this user has permissions to update this user.
	if username != session.Username {
		return errcodes.Forbidden("updating this user")
	}

	user, err := h.userService.RetrieveUser(ctx, RetrieveUserOptions{
		Username: &username,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	options := UpdateUserOptions{
		Columns: []string{},
	}

	if params.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*params.Password), h.config.BcryptCost)
		if err != nil {
			return errors.WithStack(err)
		}
		user.Password = string(hash)
		options.Columns = append(options.Columns, "password")
	}
	if params.FriendCode3DS != nil && !pointerutil.Equal(params.FriendCode3DS, user.FriendCode3DS) {
		user.FriendCode3DS = params.FriendCode3DS
		options.Columns = append(options.Columns, "friend_code_3ds")
	}
	if params.FriendCodeSwitch != nil && !pointerutil.Equal(params.FriendCodeSwitch, user.FriendCodeSwitch) {
		user.FriendCodeSwitch = params.FriendCodeSwitch
		options.Columns = append(options.Columns, "friend_code_switch")
	}

	// Save the user.
	err = h.userService.UpdateUser(ctx, user, options)
	if err != nil {
		return errors.WithStack(err)
	}

	// Reload the session so that we can re-sign it.
	session, err = h.authService.RetrieveSession(ctx, auth.RetrieveSessionOptions{
		Username: &username,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	// Generate a new session token since we encode user information in the token.
	token, err := h.authService.SignSession(ctx, session)
	if err != nil {
		return errors.WithStack(err)
	}

	resp := struct {
		Token string `json:"token"`
	}{token}

	return errors.WithStack(c.JSON(http.StatusOK, resp))
}
