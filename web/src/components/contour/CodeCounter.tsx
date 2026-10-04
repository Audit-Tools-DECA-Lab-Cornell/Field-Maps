import { codeCounter } from "./code";
import { Icon } from "./Icon";

/** A code field's counter: "4 of 6" while typing, then "✓ 6 of 6" in the saved colour (DESIGN.md §5 Field). */
export function CodeCounter({ value, length }: { value: string; length: number }) {
	const count = codeCounter(value, length);
	if (value.length < length) return count;
	return (
		<span className="inline-flex items-center gap-1 font-semibold text-saved">
			<Icon name="check" size={16} className="shrink-0" />
			{count}
		</span>
	);
}
