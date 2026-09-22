/**
 * Facts the privacy pages need that the code cannot supply. Every `null` renders as a visible
 * "to be confirmed" marker and is listed in the draft notice at the top of each page, so an
 * incomplete policy can never pass for a finished one. Fill these in before submitting the URL to
 * Google Play.
 */
export const policy = {
	appName: "FieldMaps",
	/** The organisation responsible for the app and its data, e.g. a lab and its university. */
	operator: null as string | null,
	/** Where privacy questions and deletion requests go. */
	contactEmail: null as string | null,
	/** Who hosts the server that receives uploads, e.g. a cloud provider and region. */
	serverHost: null as string | null,
	/** How long uploaded observations and accounts are kept, in plain words. */
	retention: null as string | null,
	/** How long server request logs and sign-in records are kept, in plain words. */
	logRetention: null as string | null,
	/** How many days a deletion request may take. */
	deletionDays: null as number | null,
	/** The date this version of the policy takes effect. */
	effectiveDate: "September 22, 2026"
};

export const missingFacts: readonly string[] = [
	policy.operator === null ? "who operates the app (organisation name)" : null,
	policy.contactEmail === null ? "a contact email for privacy questions and deletion requests" : null,
	policy.serverHost === null ? "who hosts the upload server" : null,
	policy.retention === null ? "how long accounts and uploaded observations are kept" : null,
	policy.logRetention === null ? "how long server logs and sign-in records are kept" : null,
	policy.deletionDays === null ? "how many days a deletion request may take" : null
].filter((fact): fact is string => fact !== null);
