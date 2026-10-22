<script lang="ts">
	import { page } from '$app/state';
	import { TabNav } from '#lib/components/organisms/index.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = $derived([
		{ href: '/admin/reports', label: 'Reports', current: page.url.pathname === '/admin/reports' },
		{ href: '/admin/log', label: 'Log', current: page.url.pathname === '/admin/log' },
		...(data.isAdmin
			? [
					{
						href: '/admin/prompts',
						label: 'Prompts',
						current: page.url.pathname === '/admin/prompts'
					},
					{
						href: '/admin/challenges',
						label: 'Challenges',
						current: page.url.pathname === '/admin/challenges'
					},
					{
						href: '/admin/blog',
						label: 'Blog',
						current: page.url.pathname.startsWith('/admin/blog')
					}
				]
			: [])
	]);
</script>

<TabNav label="Admin" {tabs} />
{@render children()}
