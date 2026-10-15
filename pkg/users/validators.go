package users

type createParams struct {
	Username         string  `json:"username" mod:"trim" validate:"required,token,max=20"`
	Password         string  `json:"password" validate:"required,min=8,max=72"`
	FriendCode3DS    *string `json:"friend_code_3ds" validate:"omitempty,friend_code_3ds"`
	FriendCodeSwitch *string `json:"friend_code_switch" validate:"omitempty,friend_code_switch"`
	Referrer         *string `json:"referrer" validate:"omitempty"`
	Title            string  `json:"title" mod:"trim" validate:"required,max=300"`
	Slug             string  `json:"slug" mod:"trim" validate:"omitempty,max=300"`
	Shiny            *bool   `json:"shiny" validate:"required"`
	Game             string  `json:"game" mod:"trim" validate:"required,max=50"`
	DexType          int     `json:"dex_type" validate:"required"`
}

type listParams struct {
	Limit  int `query:"limit" json:"limit" default:"10" validate:"min=0,max=100"`
	Offset int `query:"offset" json:"offset" validate:"min=0"`
}

type updateParams struct {
	Password         *string `json:"password" validate:"omitempty,min=8,max=72"`
	FriendCode3DS    *string `json:"friend_code_3ds" validate:"omitempty,friend_code_3ds"`
	FriendCodeSwitch *string `json:"friend_code_switch" validate:"omitempty,friend_code_switch"`
}
