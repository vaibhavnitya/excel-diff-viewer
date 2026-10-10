/**
 * Design tokens for the viewer components.
 *
 * The library does **not** bundle design systems (MUI, Carbon, Tailwind, etc.).
 * Pass only the tokens you want to override; omitted fields keep the CSS
 * variable from `styles.css`, dark mode, or the consumer’s own stylesheet.
 *
 * Precedence (lowest → highest):
 * 1. Library defaults in `styles.css` (`:root`)
 * 2. Dark mode (`:root[data-theme='dark']`)
 * 3. Consumer CSS targeting `--edv-*` (loaded after library CSS)
 * 4. `theme` prop (inline CSS variables on the component root)
 * 5. `classNames` prop (class-based CSS; wins when more specific)
 * 6. `style` prop (merged last on the root; overrides everything)
 *
 * Design-system-specific adapters (e.g. mapping an MUI theme to this shape)
 * belong in consumer code — not in `@mojro/excel-diff-ui`.
 */
export interface Theme {
  colors?: Partial<{
    bg: string;
    fg: string;
    border: string;
    headerBg: string;
    headerFg: string;
    rowHoverBg: string;
    keyColumnBg: string;
    added: string;
    addedFg: string;
    removed: string;
    removedFg: string;
    modified: string;
    modifiedFg: string;
    errorBg: string;
    errorFg: string;
    loadingBg: string;
    toolbarBg: string;
  }>;
  typography?: Partial<{
    fontFamily: string;
    /** Number values become `Npx`. */
    fontSize: string | number;
    /** Font weight for headers / selected tabs — not a length; no `px` appended. */
    headerWeight: number;
  }>;
  spacing?: Partial<{
    /** Also passed to AG Grid `rowHeight` (number). CSS var gets `px`. */
    rowHeight: number;
    /** Also passed to AG Grid `headerHeight` (number). CSS var gets `px`. */
    headerHeight: number;
    cellPadding: string;
  }>;
  shape?: Partial<{
    /** Number values become `Npx`. */
    borderRadius: string | number;
  }>;
}
