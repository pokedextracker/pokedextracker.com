package pokemon

type retrieveParams struct {
	DexType int `query:"dex_type" json:"dex_type" validate:"required"`
}
