import styles from "./legal.module.css";
import { missingFacts } from "./policy";

/** A fact the operator has not supplied yet, shown in place so it cannot be missed. */
export function Missing({ children }: { children: React.ReactNode }) {
	return <em className={styles.missing}>[to be confirmed: {children}]</em>;
}

/** Shown at the top of each page until every fact in `policy.ts` is filled in. */
export function DraftNotice() {
	if (missingFacts.length === 0) return null;
	return (
		<aside className={styles.draft} role="note">
			<p>
				<strong>Draft.</strong> This page is not final. It still needs:
			</p>
			<ul>
				{missingFacts.map(fact => (
					<li key={fact}>{fact}</li>
				))}
			</ul>
		</aside>
	);
}

/** The contact address, or a visible marker while it is unknown. */
export function Contact({ email }: { email: string | null }) {
	if (email === null) return <Missing>contact email</Missing>;
	return <a href={`mailto:${email}`}>{email}</a>;
}
