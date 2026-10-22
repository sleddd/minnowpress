import axe from 'axe-core';
import { createRawSnippet } from 'svelte';
import { expect } from 'vitest';

/** A children snippet that renders plain text, for passing to components in tests. */
export function text(content: string) {
	return createRawSnippet(() => ({ render: () => `<span>${content}</span>` }));
}

/** Fails the test if axe finds accessibility violations inside the element. */
export async function expectAccessible(element: Element) {
	const results = await axe.run(element, {
		// Components render in isolation, so page-level rules don't apply.
		rules: {
			region: { enabled: false },
			'landmark-one-main': { enabled: false },
			'page-has-heading-one': { enabled: false }
		}
	});
	expect(
		results.violations.map(
			(v) =>
				`${v.id}: ${v.help}` +
				v.nodes.map((n) => `\n  ${n.target.join(' ')} — ${n.any[0]?.message ?? ''}`).join('')
		)
	).toEqual([]);
}
