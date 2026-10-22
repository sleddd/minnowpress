import { describe, expect, it } from 'vitest';
import { archiveAuthorPath, archiveAuthorSlug, ficlyAuthorUrl } from './archive';

describe('archive author helpers', () => {
	it('extracts the slug from a ficly.com author URL', () => {
		expect(archiveAuthorSlug('https://ficly.com/authors/kevin-lawver/')).toBe('kevin-lawver');
		expect(archiveAuthorSlug('https://ficly.com/authors/THX-0477')).toBe('thx-0477');
	});

	it('rejects anything else', () => {
		expect(archiveAuthorSlug(null)).toBeNull();
		expect(archiveAuthorSlug('https://evil.com/authors/x/')).toBeNull();
		expect(archiveAuthorSlug('https://ficly.com/authors/../x/')).toBeNull();
	});

	it('builds URLs and site paths', () => {
		expect(ficlyAuthorUrl('henjo')).toBe('https://ficly.com/authors/henjo/');
		expect(archiveAuthorPath('https://ficly.com/authors/henjo/')).toBe('/authors/ficly/henjo');
		expect(archiveAuthorPath(null)).toBeNull();
	});
});
