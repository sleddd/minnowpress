<script lang="ts">
	import '@fontsource-variable/source-serif-4/opsz.css';
	import '@fontsource-variable/source-serif-4/opsz-italic.css';
	import '#lib/styles/base.css';
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { dev } from '$app/env';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { inject, pageview } from '@vercel/analytics';
	import { StaffLockNotice } from '#lib/components/molecules/index.ts';
	import { RibbonNav, SiteFooter, SiteHeader } from '#lib/components/organisms/index.ts';
	import { SiteShell } from '#lib/components/templates/index.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Vercel Web Analytics, production only. Its SvelteKit helper reads $app/stores, which Kit 3
	// removed, so page views are reported here, with the route (/@[username]) so they group.
	if (!dev) inject({ mode: 'production', disableAutoTrack: true });
	afterNavigate(() => pageview({ route: page.route.id, path: page.url.pathname }));
</script>

<SiteShell>
	{#snippet masthead()}
		<SiteHeader
			appName={PUBLIC_APP_NAME}
			viewer={data.viewer}
			path={page.url.pathname}
			theme={data.theme}
		/>
	{/snippet}
	{#snippet ribbon()}
		<RibbonNav
			viewer={data.viewer}
			appName={PUBLIC_APP_NAME}
			path={page.url.pathname}
			theme={data.theme}
			query={page.url.pathname === '/search' ? (page.url.searchParams.get('q') ?? '') : ''}
		/>
	{/snippet}
	{#if data.staffLock}<StaffLockNotice lock={data.staffLock} path={page.url.pathname} />{/if}
	{@render children()}
	{#snippet footer()}
		<SiteFooter />
	{/snippet}
</SiteShell>
