package auth

type createParams struct {
	Username string `json:"username" mod:"trim" validate:"required,token"`
	Password string `json:"password" validate:"required"`
}
