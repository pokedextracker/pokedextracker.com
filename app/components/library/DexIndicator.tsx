import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';

import type { Dex } from '../../types';

const EXCLUDED_TAGS = ['regional', 'game national', 'full national'];

interface Props {
  dex: Dex;
}

export function DexIndicator ({ dex }: Props) {
  return (
    <div className="dex-indicator">
      {dex.shiny && <FontAwesomeIcon icon={faStar} title="Shiny" />}
      {[dex.dex_type.base_dex_type?.name || dex.dex_type.name, ...dex.dex_type.tags.filter((tag) => !EXCLUDED_TAGS.includes(tag))].map((tag) => (
        <span className="label" key={tag}>{tag.replace(/^customization-/g, '')}</span>
      ))}
      <span className="label">{dex.game.name}</span>
    </div>
  );
}
