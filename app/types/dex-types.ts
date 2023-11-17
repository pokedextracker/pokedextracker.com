export interface DexType {
  id: number;
  name: string;
  description?: string;
  game_family_id: string;
  order: number;
  tags: string[];
  base_dex_type_id?: number;
  base_dex_type?: DexType;
}

// This is a frontend-only type that is constructed from dex type tags.
export interface Customization {
  label: string;
  value: string;
  base_dex_type_id: number;
}
