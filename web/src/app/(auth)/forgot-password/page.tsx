import { cookies } from "next/headers";

import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/auth/navigation";
import { supabaseConfig } from "@/lib/supabase/config";
export const metadata = { title: "Recover your account", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { readonly searchParams: Promise<{ readonly next?: string }> }) {
	const { next } = await searchParams;
	const store = await cookies();
	const cooldown = Math.max(
		0,
		Math.ceil((Number(store.get("fm-email-sent")?.value ?? 0) + 60000 - Date.now()) / 1000)
	);
	return (
		<>
			<h1 className="text-title text-text">Recover your account</h1>
			<p className="text-detail text-neutral-400">We will email a code if this address has an account.</p>
			{supabaseConfig() ? (
				<AuthForm mode="forgot-password" next={safeNext(next)} cooldown={cooldown} />
			) : (
				<p role="status" className="text-detail text-attention-text">
					Sign-in is not configured on this server. Ask the operator to set the public Supabase URL and
					publishable key.
				</p>
			)}
		</>
	);
}
