package dexes

type createParams struct {
	Title   string `json:"title" mod:"trim" validate:"required,max=300"`
	Slug    string `json:"slug" mod:"trim" validate:"omitempty,max=300"`
	Shiny   *bool  `json:"shiny" validate:"required"`
	Game    string `json:"game" mod:"trim" validate:"required,max=50"`
	DexType int    `json:"dex_type" validate:"required"`
}

type updateParams struct {
	Title   *string `json:"title" mod:"trim" validate:"omitempty,max=300"`
	Slug    *string `json:"slug" mod:"trim" validate:"omitempty,max=300"`
	Shiny   *bool   `json:"shiny"`
	Game    *string `json:"game" mod:"trim" validate:"omitempty,max=50"`
	DexType *int    `json:"dex_type"`
}
