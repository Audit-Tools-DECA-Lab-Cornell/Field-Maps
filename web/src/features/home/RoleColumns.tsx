import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";

type Role = {
	id: string;
	title: string;
	icon: IconName;
	/** Who it is for and where they use it. */
	lead: string;
	items: { icon: IconName; text: ReactNode }[];
};

const ROLES: Role[] = [
	{
		id: "field",
		title: "In the field",
		icon: "smartphone",
		lead: "The FieldMaps app on Android, for observers.",
		items: [
			{ icon: "crosshair", text: "Place a point where it happened, even with no signal." },
			{ icon: "list", text: "Answer the form one question at a time. Only the questions that apply appear." },
			{
				icon: "upload",
				text: "Each observation is saved on the phone first and uploads when the app is open and connected."
			},
			{
				icon: "rotate-cw",
				text: "Practise every step in Training first. Practice observations stay out of research exports."
			}
		]
	},
	{
		id: "desk",
		title: "At the desk",
		icon: "map",
		lead: "The web workspace, for managers and analysts.",
		items: [
			{
				icon: "layers",
				text: "Turn a QGIS project into a map package for each site, and check it before observers download it."
			},
			{
				icon: "lock",
				text: (
					<>
						Publish form versions. Publishing <Mono>v2</Mono> never changes <Mono>v1</Mono>.
					</>
				)
			},
			{ icon: "users", text: "Create a join code or an invitation link, and send it to your team." },
			{ icon: "download", text: "Read coverage by zone and round, then export CSV or GeoJSON with a codebook." }
		]
	}
];

/**
 * Who does what, in their own words (PRODUCT.md, Users): field language for observers, research language
 * for the team at the desk. One island, two columns, so a visitor finds their side without reading both.
 */
export function RoleColumns() {
	return (
		<section aria-labelledby="home-roles-title">
			<h2 id="home-roles-title" className="type-section text-ink md:type-page">
				One record, two places to work
			</h2>
			<Island as="div" flush className="mt-8">
				<div className="grid md:grid-cols-2">
					{ROLES.map((role, index) => (
						<section
							key={role.id}
							aria-labelledby={`home-role-${role.id}`}
							className={
								index > 0
									? "border-t border-rule p-island-pad md:border-t-0 md:border-l"
									: "p-island-pad"
							}>
							<h3 id={`home-role-${role.id}`} className="flex items-baseline gap-2 type-island text-ink">
								<Icon name={role.icon} size={18} className="mt-1 shrink-0 self-start" />
								{role.title}
							</h3>
							<p className="mt-1 type-body text-ink-2">{role.lead}</p>
							<ul role="list" className="mt-4">
								{role.items.map(item => (
									<li key={item.icon} className="flex gap-3 border-t border-rule py-3 last:pb-0">
										<Icon name={item.icon} size={18} className="mt-0.5 shrink-0 text-ink-2" />
										<span className="type-body text-ink">{item.text}</span>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</Island>
		</section>
	);
}
