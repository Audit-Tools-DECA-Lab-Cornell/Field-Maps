import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "danger" | "ghost" | "subtle";

const variantClass: Record<Variant, string> = {
	default: "",
	primary: "fo-btn--primary",
	danger: "fo-btn--danger",
	ghost: "fo-btn--ghost",
	subtle: "fo-btn--subtle"
};

export function Button({
	variant = "default",
	size = "md",
	block = false,
	className = "",
	children,
	...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	size?: "sm" | "md";
	block?: boolean;
}) {
	return (
		<button
			type="button"
			className={`fo-btn ${variantClass[variant]} ${
				size === "sm" ? "fo-btn--sm" : ""
			} ${block ? "fo-btn--block" : ""} ${className}`}
			{...rest}>
			{children}
		</button>
	);
}
