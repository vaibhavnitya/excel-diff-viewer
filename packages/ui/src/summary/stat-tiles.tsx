import { cx } from '../utils/cx.js';

export type StatTile = {
  readonly label: string;
  readonly value: number | string;
};

type StatTilesProps = {
  readonly tiles: readonly StatTile[];
  readonly className?: string;
  readonly tileClassName?: string;
};

export function StatTiles({ tiles, className, tileClassName }: StatTilesProps) {
  return (
    <div className={cx('edv-summary-tiles', className)}>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cx('edv-summary-tile', tileClassName)}
        >
          <span className="edv-summary-tile__value">{tile.value}</span>
          <span className="edv-summary-tile__label">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
