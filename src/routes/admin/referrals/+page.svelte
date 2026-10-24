<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ReferralTable } from '#lib/components/organisms/index.ts';
	import { AdminLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Referrals · Admin" siteName={PUBLIC_APP_NAME} />

<AdminLayout
	title="Referrals"
	description="Visits and sign-ups by ?ref= link, such as the QR code on a business card. Any code works without setting it up first: letters, digits, - and _."
>
	<ReferralTable referrals={data.referrals} />
</AdminLayout>
