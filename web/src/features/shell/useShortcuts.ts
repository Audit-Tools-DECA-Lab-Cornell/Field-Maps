"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { DEFAULT_ORG, getProject } from "@/fixtures";
import {
	CHORD_TIMEOUT,
	isOverlayOpen,
	isTypingTarget,
	ORG_GO_KEYS,
	PAGE_SEARCH_SELECTOR,
	PROJECT_GO_KEYS
} from "@/lib/shortcuts";

import { ORG_SECTIONS, orgHref, PROJECT_SECTIONS, projectHref } from "./navigation";
import { usePreview } from "./PreviewProvider";
import { useShell } from "./ShellProvider";

/**
 * The workspace keys (DESIGN §8): ⌘K or Ctrl K opens the palette anywhere; `g` then a key goes to a tab;
 * `?` lists the shortcuts; `/` focuses the page's search. Nothing but ⌘K fires while typing in a field
 * or while a dialog or menu is open.
 */
export function useShortcuts() {
	const router = useRouter();
	const params = useParams<{ org?: string; project?: string }>();
	const { paletteOpen, setPaletteOpen, setShortcutsOpen } = useShell();
	const { can } = usePreview();
	const chordUntil = useRef(0);

	const org = params.org ?? DEFAULT_ORG;
	const project = params.project && getProject(org, params.project) ? params.project : undefined;

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented || event.isComposing) return;
			const key = event.key;

			if ((event.metaKey || event.ctrlKey) && !event.altKey && key.toLowerCase() === "k") {
				const target = event.target as Element | null;
				const inPalette = Boolean(target?.closest?.("[cmdk-root]"));
				if (isTypingTarget(event.target) && !inPalette) return;
				event.preventDefault();
				setPaletteOpen(!paletteOpen);
				return;
			}

			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target) || isOverlayOpen()) return;

			if (Date.now() < chordUntil.current) {
				chordUntil.current = 0;
				const segment = project ? PROJECT_GO_KEYS[key] : ORG_GO_KEYS[key];
				if (segment === undefined) return;
				const section = (project ? PROJECT_SECTIONS : ORG_SECTIONS).find(entry => entry.segment === segment);
				if (section?.requires && !can(section.requires)) return;
				event.preventDefault();
				router.push(project ? projectHref(org, project, segment) : orgHref(org, segment));
				return;
			}

			if (key === "g") {
				chordUntil.current = Date.now() + CHORD_TIMEOUT;
				return;
			}
			if (key === "?") {
				event.preventDefault();
				setShortcutsOpen(true);
				return;
			}
			if (key === "/") {
				event.preventDefault();
				const search = document.querySelector<HTMLElement>(PAGE_SEARCH_SELECTOR);
				if (search) search.focus();
				else setPaletteOpen(true);
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [can, org, paletteOpen, project, router, setPaletteOpen, setShortcutsOpen]);
}

/** Mounts the workspace keys. */
export function ShellKeys() {
	useShortcuts();
	return null;
}
