/** Helpers for authors imported from the Ficly archive. Client-safe. */

const FICLY_AUTHOR = /^https:\/\/ficly\.com\/authors\/([a-z0-9-]+)\/?$/i;

/** "https://ficly.com/authors/kevin-lawver/" → "kevin-lawver" */
export function archiveAuthorSlug(authorUrl: string | null | undefined): string | null {
	return authorUrl?.match(FICLY_AUTHOR)?.[1]?.toLowerCase() ?? null;
}

export function ficlyAuthorUrl(slug: string): string {
	return `https://ficly.com/authors/${slug}/`;
}

/** Where an archive author's page lives on this site, or null if they have no Ficly page. */
export function archiveAuthorPath(authorUrl: string | null | undefined): string | null {
	const slug = archiveAuthorSlug(authorUrl);
	return slug ? `/authors/ficly/${slug}` : null;
}
