import Image from "next/image";
import Link from "next/link";

import styles from "./legal.module.css";
import { policy } from "./policy";

/** A plain reading frame for the public policy pages, separate from the operations console. */
export default function LegalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div className={`${styles.inner} ${styles.headerRow}`}>
					<Link href="/privacy" className={styles.brand}>
						<Image src="/fieldmaps-app-icon.svg" alt="" width={36} height={36} unoptimized />
						{policy.appName}
					</Link>
					<nav aria-label="Policy pages" className={styles.nav}>
						<Link href="/privacy">Privacy policy</Link>
						<Link href="/privacy/delete-data">Delete your data</Link>
					</nav>
				</div>
			</header>
			<main className={`${styles.inner} ${styles.main}`}>{children}</main>
			<footer className={styles.footer}>
				<div className={styles.inner}>
					<p>
						{policy.appName} is an offline field collector for research teams. These pages describe the
						Android and iOS app.
					</p>
				</div>
			</footer>
		</div>
	);
}
