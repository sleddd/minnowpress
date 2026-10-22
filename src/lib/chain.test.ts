import { describe, expect, it } from 'vitest';
import { buildChainTree, countNodes, type ChainItem } from './chain';

const item = (id: number, parentId: number | null, relation: ChainItem['relation'] = null) => ({
	id,
	parentId,
	relation
});

describe('buildChainTree', () => {
	it('nests prequels and sequels under their parent', () => {
		const tree = buildChainTree([
			item(1, null),
			item(2, 1, 'sequel'),
			item(3, 1, 'prequel'),
			item(4, 2, 'sequel')
		]);
		expect(tree).toHaveLength(1);
		const [root] = tree;
		expect(root.story.id).toBe(1);
		expect(root.sequels.map((n) => n.story.id)).toEqual([2]);
		expect(root.prequels.map((n) => n.story.id)).toEqual([3]);
		expect(root.sequels[0].sequels.map((n) => n.story.id)).toEqual([4]);
	});

	it('promotes orphans whose parent is missing to roots', () => {
		const tree = buildChainTree([item(1, null), item(5, 99, 'sequel')]);
		expect(tree.map((n) => n.story.id)).toEqual([1, 5]);
	});

	it('returns an empty list for no stories', () => {
		expect(buildChainTree([])).toEqual([]);
	});

	it('keeps extra fields on each story', () => {
		const [root] = buildChainTree([{ ...item(1, null), title: 'T' }]);
		expect(root.story.title).toBe('T');
	});
});

describe('countNodes', () => {
	it('counts every node in the forest', () => {
		const tree = buildChainTree([
			item(1, null),
			item(2, 1, 'sequel'),
			item(3, 2, 'prequel'),
			item(9, 50, 'sequel')
		]);
		expect(countNodes(tree)).toBe(4);
	});
});
