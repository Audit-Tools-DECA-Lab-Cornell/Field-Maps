import Link from "next/link";
export default function AuthLayout({ children }: { readonly children: React.ReactNode }) {
	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-loose px-gutter py-wide">
			<Link href="/" className="inline-flex min-h-11 items-center text-body text-accent-300">
				FieldMaps
			</Link>
			{children}
		</main>
	);
}
