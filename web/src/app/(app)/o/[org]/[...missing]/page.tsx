import { notFound } from "next/navigation";

/** Any other address under an organization: the in-shell 404. */
export default function MissingPage() {
	notFound();
}
