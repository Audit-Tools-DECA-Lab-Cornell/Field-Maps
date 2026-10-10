import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";

/**
 * The island beside the auth forms (System 12): what DECA Mark promises about every observation, in the
 * two states a record passes through. Words only. It shows no site, no zone and no record, so nothing on
 * it can be mistaken for someone's data.
 */
export function AuthHero() {
	return (
		<Island aria-labelledby="auth-hero-title">
			<p className="type-mono-label text-ink-2">Field operations</p>
			<h2 id="auth-hero-title" className="mt-3 type-section text-ink xl:type-page">
				<span className="block">Every observation keeps its place.</span>
				<span className="block">Nothing is lost on the way back.</span>
			</h2>
			<p className="mt-4 type-body text-ink-2">
				Observers mark a point on the site map and answer the project&rsquo;s form, with or without signal.
			</p>
			<dl className="mt-5">
				<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule py-3">
					<dt>
						<StateBadge kind="queue" state="onDevice" label="Saved on this device" />
					</dt>
					<dd className="type-body text-ink-2">The moment an observer taps Save.</dd>
				</div>
				<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule py-3">
					<dt>
						<StateBadge kind="queue" state="uploaded" />
					</dt>
					<dd className="type-body text-ink-2">Only after DECA Mark has the record.</dd>
				</div>
			</dl>
		</Island>
	);
}
