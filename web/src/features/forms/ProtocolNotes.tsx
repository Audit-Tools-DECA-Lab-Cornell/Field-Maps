import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { plural } from "@/lib/labels";

export type ProtocolNoteView = { id: string; title: string; detail: string };
export type FlaggedQuestionView = { id: string; label: string; note: string };

function FlagGlyph() {
	return <Icon name="flag" size={18} className="mt-0.5 shrink-0 text-waiting" />;
}

/**
 * The decisions the study has not made yet, as the form carries them: its protocol notes, and the questions
 * that wait on a note or on an option list. Publishing does not need them settled and does not settle them;
 * they stay on the form, so this says so.
 */
export function ProtocolNotes({
	notes,
	flagged
}: {
	notes: readonly ProtocolNoteView[];
	flagged: readonly FlaggedQuestionView[];
}) {
	if (notes.length === 0 && flagged.length === 0) return null;
	return (
		<Island
			title="Open protocol notes"
			meta={plural(notes.length + flagged.length, "open decision")}
			divided={false}>
			<p className="max-w-[72ch] type-body text-ink-2">
				These are decisions the study has not made yet. They stay on the form. Publishing does not settle them.
			</p>
			<ul className="mt-4 divide-y divide-rule border-y border-rule">
				{notes.map(note => (
					<li key={`note-${note.id}`} className="flex gap-3 py-4">
						<FlagGlyph />
						<div className="min-w-0">
							<p className="type-body font-semibold text-ink">{note.title}</p>
							<p className="mt-1 type-body text-ink-2">{note.detail}</p>
						</div>
					</li>
				))}
				{flagged.map(question => (
					<li key={`question-${question.id}`} className="flex gap-3 py-4">
						<FlagGlyph />
						<div className="min-w-0">
							<p className="type-body font-semibold text-ink">Question: {question.label}</p>
							<p className="mt-1 type-body text-ink-2">{question.note}</p>
						</div>
					</li>
				))}
			</ul>
		</Island>
	);
}
