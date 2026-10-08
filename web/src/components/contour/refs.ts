import type { Ref } from "react";

/** Hands a node to a ref the caller passed, whether it is a callback ref or a ref object. */
export function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
	if (typeof ref === "function") ref(value);
	else if (ref) ref.current = value;
}
