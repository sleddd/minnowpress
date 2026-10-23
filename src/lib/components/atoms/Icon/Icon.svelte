<script lang="ts" module>
	export const ICONS = {
		comment: 'M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z',
		branch:
			'M7 4v10m0 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0c0 4-10 3-10 6',
		flag: 'M5.5 21V4.5m0 0h11l-2 4 2 4h-11',
		'arrow-left': 'M19 12H5m6-6-6 6 6 6',
		menu: 'M4 7h16M4 12h16M4 17h16',
		'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
		pen: 'M4 20l4-1 11-11-3-3L5 16l-1 4Zm10-13 3 3',
		fish: 'M2 7.5 6 12l-4 4.5 1.2.5L7 13.6C9.4 16.5 12.4 18 15.6 18c3.4 0 6-2.3 6.4-6-.4-3.7-3-6-6.4-6C12.4 6 9.4 7.5 7 10.4L3.2 7Zm13.9 2.7a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z',
		bookmark: 'M6.5 4h11v16l-5.5-4-5.5 4z',
		key: 'M14.5 4a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM10.5 13l-6.5 6.5v1.5h2.5v-2h2v-2h2l1.5-1.5',
		feed: 'M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8M6 18h.01',
		sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8'
	} as const;
	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		/** Accessible name. Without one the icon is decorative. */
		label?: string;
		filled?: boolean;
	}

	let { name, label, filled = false }: Props = $props();
</script>

<svg
	class="icon"
	class:filled
	viewBox="0 0 24 24"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	<path d={ICONS[name]} />
</svg>

<style>
	.icon {
		flex: none;
		width: var(--size-icon);
		height: var(--size-icon);
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.75;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.filled {
		fill: currentcolor;
		fill-rule: evenodd;
	}
</style>
