<script lang="ts">
	import '@fontsource-variable/source-serif-4/opsz.css';
	import '@fontsource-variable/source-serif-4/opsz-italic.css';
	import '#lib/styles/base.css';
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { RibbonNav, SiteFooter, SiteHeader } from '#lib/components/organisms/index.ts';
	import { SiteShell } from '#lib/components/templates/index.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<SiteShell>
	{#snippet masthead()}
		<SiteHeader appName={PUBLIC_APP_NAME} viewer={data.viewer} path={page.url.pathname} />
	{/snippet}
	{#snippet ribbon()}
		<RibbonNav
			viewer={data.viewer}
			appName={PUBLIC_APP_NAME}
			path={page.url.pathname}
			query={page.url.pathname === '/search' ? (page.url.searchParams.get('q') ?? '') : ''}
		/>
	{/snippet}
	{@render children()}
	{#snippet footer()}
		<SiteFooter />
	{/snippet}
</SiteShell>
