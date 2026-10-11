import { policy } from "@/app/(legal)/policy";
import { TextLink } from "@/components/contour/TextLink";
import { BrandMark } from "@/components/shell/Brand";

export type HomeFooterProps = { className?: string };

/** Who runs DECA Mark, from the same facts the privacy policy prints, and the two policy pages. */
export function HomeFooter({ className }: HomeFooterProps) {
	return (
		<footer className={className}>
			<div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
				<p className="flex items-center gap-3 type-small text-ink-2">
					<BrandMark size={24} />
					<span>
						{policy.operator
							? `DECA Mark is run by the ${policy.operator}.`
							: "DECA Mark is offline field collection for research teams."}
					</span>
				</p>
				<nav aria-label="Policies" className="flex flex-wrap gap-x-6 type-small">
					<TextLink href="/privacy" tone="ink" className="inline-flex min-h-touch items-center">
						Privacy policy
					</TextLink>
					<TextLink href="/privacy/delete-data" tone="ink" className="inline-flex min-h-touch items-center">
						Delete your data
					</TextLink>
				</nav>
			</div>
		</footer>
	);
}
