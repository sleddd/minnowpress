export interface ChainItem {
	id: number;
	parentId: number | null;
	relation: 'sequel' | 'prequel' | null;
}

export interface ChainNode<T extends ChainItem> {
	story: T;
	prequels: ChainNode<T>[];
	sequels: ChainNode<T>[];
}

/**
 * Shapes a flat chain into trees. Each node lists the prequels and sequels written to it.
 * Stories whose parent is missing (removed or still a draft) become extra roots so nothing vanishes.
 */
export function buildChainTree<T extends ChainItem>(items: T[]): ChainNode<T>[] {
	const nodes = new Map(
		items.map((story) => [story.id, { story, prequels: [], sequels: [] } as ChainNode<T>])
	);
	const roots: ChainNode<T>[] = [];
	for (const node of nodes.values()) {
		const parent = node.story.parentId === null ? undefined : nodes.get(node.story.parentId);
		if (!parent) roots.push(node);
		else if (node.story.relation === 'prequel') parent.prequels.push(node);
		else parent.sequels.push(node);
	}
	return roots;
}

export function countNodes<T extends ChainItem>(nodes: ChainNode<T>[]): number {
	return nodes.reduce((n, node) => n + 1 + countNodes(node.prequels) + countNodes(node.sequels), 0);
}
