import { NotFoundView } from "@/components/shell/NotFoundView";
import { ShellMain } from "@/components/shell/ShellMain";

/** A page under the organization that does not exist (org-18): the org header stays, without tabs. */
export default function OrgNotFound() {
	return (
		<ShellMain>
			<title>Page not found · DECA Mark</title>
			<NotFoundView inShell />
		</ShellMain>
	);
}
