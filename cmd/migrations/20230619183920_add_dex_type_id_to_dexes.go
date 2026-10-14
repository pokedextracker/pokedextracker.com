package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE dexes ADD COLUMN dex_type_id INT`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE dexes ADD CONSTRAINT dexes_dex_type_id_foreign FOREIGN KEY (dex_type_id) REFERENCES dex_types (id)")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec(`
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'x_y' and name = 'Regional') where game_id in ('x', 'y') and regional = true;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'x_y' and name = 'Full National') where game_id in ('x', 'y') and regional = false;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'omega_ruby_alpha_sapphire' and name = 'Regional') where game_id in ('omega_ruby', 'alpha_sapphire') and regional = true;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'omega_ruby_alpha_sapphire' and name = 'Full National') where game_id in ('omega_ruby', 'alpha_sapphire') and regional = false;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'sun_moon' and name = 'Regional') where game_id in ('sun', 'moon') and regional = true;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'sun_moon' and name = 'Full National') where game_id in ('sun', 'moon') and regional = false;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'ultra_sun_ultra_moon' and name = 'Regional') where game_id in ('ultra_sun', 'ultra_moon') and regional = true;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'ultra_sun_ultra_moon' and name = 'Full National') where game_id in ('ultra_sun', 'ultra_moon') and regional = false;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'lets_go_pikachu_eevee' and name = 'Regional') where game_id in ('lets_go_pikachu', 'lets_go_eevee') and regional = true;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'sword_shield' and name = 'Regional') where game_id in ('sword', 'shield') and regional = true;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'sword_shield' and name = 'Full National') where game_id in ('sword', 'shield') and regional = false;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'sword_shield_expansion_pass' and name = 'Regional') where game_id in ('sword_expansion_pass', 'shield_expansion_pass') and regional = true;
update dexes set dex_type_id = (select id from dex_types where game_family_id = 'sword_shield_expansion_pass' and name = 'Full National') where game_id in ('sword_expansion_pass', 'shield_expansion_pass') and regional = false;
`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE dexes ALTER COLUMN dex_type_id SET NOT NULL")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE dexes ALTER COLUMN regional DROP NOT NULL")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`UPDATE dexes SET regional = (dex_types.name = 'Regional') FROM dex_types WHERE dex_types.id = dexes.dex_type_id AND dexes.regional IS NULL`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE dexes DROP COLUMN dex_type_id")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE dexes ALTER COLUMN regional SET NOT NULL")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619183920_add_dex_type_id_to_dexes", up, down, opts)
}
