/** The reader's color theme, chosen in Settings. Light by default; "auto" follows the system. Client-safe. */

export const THEMES = ['auto', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'light';

export function parseTheme(value: string | null | undefined): Theme {
	return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}
