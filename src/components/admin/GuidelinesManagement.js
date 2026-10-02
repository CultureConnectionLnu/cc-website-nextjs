"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useEditor, EditorContent } from "@tiptap/react";
import { AnimatePresence, motion } from "framer-motion";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TipTapToolbar from "../TipTapToolbar";

const fetchGuidelines = async () => {
	const response = await fetch("/api/admin/guidelines");
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to fetch guidelines: ${response.statusText}`,
		);
	}
	return response.json();
};

const updateGuidelines = async (updatedData) => {
	const response = await fetch("/api/admin/guidelines", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(updatedData),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to update guidelines: ${response.statusText}`,
		);
	}
	return response.json();
};

const normalizeGuidelineSection = (
	section,
	fallbackId = "guideline-section",
) => {
	const safeSection =
		section && typeof section === "object" && !Array.isArray(section)
			? section
			: {};

	return {
		id:
			typeof safeSection.id === "string" && safeSection.id.trim()
				? safeSection.id
				: fallbackId,
		title: typeof safeSection.title === "string" ? safeSection.title : "",
		content:
			typeof safeSection.content === "string" ? safeSection.content : "<p></p>",
		children: normalizeGuidelinesData(
			safeSection.children,
			`${fallbackId}-child`,
		),
	};
};

const normalizeGuidelinesData = (
	data,
	fallbackPrefix = "guideline-section",
) => {
	if (!Array.isArray(data)) {
		return [];
	}

	return data.map((section, index) =>
		normalizeGuidelineSection(section, `${fallbackPrefix}-${index}`),
	);
};

const cloneGuidelinesData = (data) =>
	JSON.parse(JSON.stringify(normalizeGuidelinesData(data)));

const flattenGuidelines = (sections) =>
	sections.flatMap((section) => [
		section,
		...flattenGuidelines(section.children || []),
	]);

const collectSectionIds = (sections) =>
	flattenGuidelines(sections).map((section) => section.id);

const findFirstSectionId = (sections) =>
	flattenGuidelines(sections)[0]?.id || null;

const doesSectionExist = (sections, sectionId) =>
	flattenGuidelines(sections).some((section) => section.id === sectionId);

const sectionsHaveMissingTitles = (sections) =>
	sections.some(
		(section) =>
			!section.title.trim() ||
			sectionsHaveMissingTitles(section.children || []),
	);

const getSectionAtPath = (sections, path) => {
	let currentSections = sections;
	let currentSection = null;

	for (const index of path) {
		currentSection = currentSections[index];
		if (!currentSection) {
			return null;
		}
		currentSections = currentSection.children || [];
	}

	return currentSection;
};

const updateSectionAtPath = (sections, path, updater) => {
	const [index, ...remainingPath] = path;

	return sections.map((section, currentIndex) => {
		if (currentIndex !== index) {
			return section;
		}

		if (remainingPath.length === 0) {
			return updater(section);
		}

		return {
			...section,
			children: updateSectionAtPath(
				section.children || [],
				remainingPath,
				updater,
			),
		};
	});
};

const removeSectionAtPath = (sections, path) => {
	const [index, ...remainingPath] = path;

	if (remainingPath.length === 0) {
		return sections.filter((_, currentIndex) => currentIndex !== index);
	}

	return sections.map((section, currentIndex) => {
		if (currentIndex !== index) {
			return section;
		}

		return {
			...section,
			children: removeSectionAtPath(section.children || [], remainingPath),
		};
	});
};

const createNewSection = (localIdPrefix, title = "New Section") => ({
	id: `${localIdPrefix}-section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	title,
	content: "<p>Start writing here...</p>",
	children: [],
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripHtml = (content) =>
	typeof content === "string" ? content.replace(/<[^>]*>/g, " ") : "";

const matchesSearch = (section, normalizedTerm) => {
	if (!normalizedTerm) {
		return true;
	}

	const searchableText =
		`${section.title} ${stripHtml(section.content)}`.toLowerCase();
	return searchableText.includes(normalizedTerm);
};

const filterSectionsForSearch = (sections, normalizedTerm) => {
	if (!normalizedTerm) {
		return sections;
	}

	return sections.reduce((filteredSections, section) => {
		const filteredChildren = filterSectionsForSearch(
			section.children || [],
			normalizedTerm,
		);

		if (matchesSearch(section, normalizedTerm)) {
			filteredSections.push(section);
			return filteredSections;
		}

		if (filteredChildren.length > 0) {
			filteredSections.push({
				...section,
				children: filteredChildren,
			});
		}

		return filteredSections;
	}, []);
};

const findSectionTrailById = (sections, targetId, trail = []) => {
	for (const section of sections) {
		const nextTrail = [...trail, section.id];

		if (section.id === targetId) {
			return nextTrail;
		}

		const childTrail = findSectionTrailById(
			section.children || [],
			targetId,
			nextTrail,
		);

		if (childTrail) {
			return childTrail;
		}
	}

	return null;
};

const findSectionById = (sections, targetId) => {
	for (const section of sections) {
		if (section.id === targetId) {
			return section;
		}

		const childMatch = findSectionById(section.children || [], targetId);
		if (childMatch) {
			return childMatch;
		}
	}

	return null;
};

const toggleExpandedId = (expandedIds, targetId) =>
	expandedIds.includes(targetId)
		? expandedIds.filter((id) => id !== targetId)
		: [...expandedIds, targetId];

const mergeExpandedIds = (expandedIds, idsToAdd) =>
	Array.from(new Set([...expandedIds, ...idsToAdd]));

const arraysEqual = (left, right) =>
	left.length === right.length &&
	left.every((value, index) => value === right[index]);

const AccordionPanel = ({ isOpen, children }) => (
	<AnimatePresence initial={false}>
		{isOpen && (
			<motion.div
				initial={{ height: 0, opacity: 0 }}
				animate={{ height: "auto", opacity: 1 }}
				exit={{ height: 0, opacity: 0 }}
				transition={{ duration: 0.22, ease: "easeInOut" }}
				className="overflow-hidden"
			>
				<motion.div
					initial={{ y: -8, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -8, opacity: 0 }}
					transition={{ duration: 0.18, ease: "easeOut" }}
				>
					{children}
				</motion.div>
			</motion.div>
		)}
	</AnimatePresence>
);

const TipTapEditor = ({ content, onChange }) => {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				history: true,
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Underline,
			Link.configure({
				openOnClick: false,
				autolink: true,
				linkOnPaste: true,
			}),
			TextStyle,
			Color,
		],
		content: content,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none p-3 border border-t-0 border-gray-300 rounded-b-md min-h-[150px] bg-white",
			},
		},
	});

	useEffect(() => {
		if (editor && editor.isEditable) {
			const currentEditorContent = editor.getHTML();
			if (currentEditorContent !== content) {
				setTimeout(() => {
					editor.commands.setContent(content, false);
				}, 0);
			}
		}
	}, [content, editor]);

	return (
		<div>
			<TipTapToolbar editor={editor} />
			<EditorContent editor={editor} />
		</div>
	);
};

export default function GuidelinesManagement() {
	const { user } = useUser();
	const isAdmin = user?.publicMetadata?.admin === true;

	const queryClient = useQueryClient();
	const [activeSectionId, setActiveSectionId] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState([]);
	const [generalError, setGeneralError] = useState(null);
	const [expandedViewSectionIds, setExpandedViewSectionIds] = useState([]);
	const [expandedEditSectionIds, setExpandedEditSectionIds] = useState([]);

	const sectionRefs = useRef({});
	const localIdPrefix = useId();

	const {
		data: guidelines = [],
		isLoading,
		isError,
		error: fetchError,
	} = useQuery({
		queryKey: ["guidelines"],
		queryFn: fetchGuidelines,
		enabled: !isEditing,
	});

	const mutation = useMutation({
		mutationFn: updateGuidelines,
		onSuccess: (updatedData) => {
			const safeUpdatedData = normalizeGuidelinesData(updatedData);
			queryClient.setQueryData(["guidelines"], safeUpdatedData);
			setIsEditing(false);
			setGeneralError(null);
		},
		onError: (error) => {
			setGeneralError(
				error.message || "An error occurred while saving guidelines.",
			);
		},
	});

	const displayableGuidelines = normalizeGuidelinesData(guidelines);
	const normalizedSearchTerm = searchTerm.trim().toLowerCase();
	const isSearchActive = normalizedSearchTerm.length > 0;
	const filteredDisplaySections = filterSectionsForSearch(
		displayableGuidelines,
		normalizedSearchTerm,
	);
	const visibleDisplaySectionIds = new Set(
		collectSectionIds(filteredDisplaySections),
	);
	const resolvedExpandedViewSectionIds = isSearchActive
		? collectSectionIds(filteredDisplaySections)
		: expandedViewSectionIds;
	const filteredEditSections = filterSectionsForSearch(
		editData,
		normalizedSearchTerm,
	);
	const visibleEditSectionIds = new Set(
		collectSectionIds(filteredEditSections),
	);
	const resolvedExpandedEditSectionIds = isSearchActive
		? collectSectionIds(filteredEditSections)
		: expandedEditSectionIds;

	useEffect(() => {
		if (isEditing) {
			return;
		}

		const safeGuidelines = normalizeGuidelinesData(guidelines);
		setEditData(cloneGuidelinesData(safeGuidelines));
		setActiveSectionId((currentActiveSectionId) =>
			currentActiveSectionId &&
			doesSectionExist(safeGuidelines, currentActiveSectionId)
				? currentActiveSectionId
				: findFirstSectionId(safeGuidelines),
		);
		setExpandedViewSectionIds((currentExpandedIds) => {
			const validExpandedIds = currentExpandedIds.filter((id) =>
				doesSectionExist(safeGuidelines, id),
			);
			const nextExpandedIds =
				validExpandedIds.length > 0
					? validExpandedIds
					: safeGuidelines[0]
						? [safeGuidelines[0].id]
						: [];

			return arraysEqual(currentExpandedIds, nextExpandedIds)
				? currentExpandedIds
				: nextExpandedIds;
		});
	}, [guidelines, isEditing]);

	useEffect(() => {
		if (!isEditing) {
			return;
		}

		setExpandedEditSectionIds((currentExpandedIds) => {
			const validExpandedIds = currentExpandedIds.filter((id) =>
				doesSectionExist(editData, id),
			);
			const nextExpandedIds =
				validExpandedIds.length > 0
					? validExpandedIds
					: editData[0]
						? [editData[0].id]
						: [];

			return arraysEqual(currentExpandedIds, nextExpandedIds)
				? currentExpandedIds
				: nextExpandedIds;
		});
	}, [editData, isEditing]);

	useEffect(() => {
		if (activeSectionId && sectionRefs.current[activeSectionId] && !isEditing) {
			sectionRefs.current[activeSectionId].scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [activeSectionId, isEditing, resolvedExpandedViewSectionIds]);

	const handleEditToggle = () => {
		if (isEditing) {
			setIsEditing(false);
			return;
		}

		const freshEditData = cloneGuidelinesData(guidelines || []);
		setEditData(freshEditData);
		setExpandedEditSectionIds(freshEditData[0] ? [freshEditData[0].id] : []);
		setGeneralError(null);
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		const freshEditData = cloneGuidelinesData(guidelines || []);
		setIsEditing(false);
		setEditData(freshEditData);
		setExpandedEditSectionIds(freshEditData[0] ? [freshEditData[0].id] : []);
		setGeneralError(null);
	};

	const handleSaveChanges = () => {
		const safeEditData = normalizeGuidelinesData(editData);

		if (sectionsHaveMissingTitles(safeEditData)) {
			setGeneralError("All sections and subsections must have a title.");
			return;
		}

		setGeneralError(null);
		mutation.mutate(safeEditData);
	};

	const handleSectionTitleChange = (path, newTitle) => {
		setEditData((currentData) =>
			updateSectionAtPath(currentData, path, (section) => ({
				...section,
				title: newTitle,
			})),
		);
	};

	const handleSectionContentChange = (path, newContent) => {
		setEditData((currentData) =>
			updateSectionAtPath(currentData, path, (section) => ({
				...section,
				content: newContent,
			})),
		);
	};

	const handleAddSection = () => {
		const newSection = createNewSection(localIdPrefix, "New Section");
		setEditData((currentData) => [...currentData, newSection]);
		setExpandedEditSectionIds((currentExpandedIds) =>
			mergeExpandedIds(currentExpandedIds, [newSection.id]),
		);
		setActiveSectionId(newSection.id);
	};

	const handleAddSubsection = (path) => {
		const parentSection = getSectionAtPath(editData, path);
		const newSection = createNewSection(localIdPrefix, "New Subsection");

		setEditData((currentData) =>
			updateSectionAtPath(currentData, path, (section) => ({
				...section,
				children: [...(section.children || []), newSection],
			})),
		);
		setExpandedEditSectionIds((currentExpandedIds) =>
			mergeExpandedIds(currentExpandedIds, [
				...(parentSection ? [parentSection.id] : []),
				newSection.id,
			]),
		);
		setActiveSectionId(newSection.id);
	};

	const handleDeleteSection = (path) => {
		const sectionToDelete = getSectionAtPath(editData, path);

		if (
			sectionToDelete &&
			window.confirm(
				`Are you sure you want to delete the section "${sectionToDelete.title}"?`,
			)
		) {
			const deletedSectionIds = collectSectionIds([sectionToDelete]);

			setEditData((currentData) => removeSectionAtPath(currentData, path));
			setExpandedEditSectionIds((currentExpandedIds) =>
				currentExpandedIds.filter((id) => !deletedSectionIds.includes(id)),
			);
			if (deletedSectionIds.includes(activeSectionId)) {
				setActiveSectionId(null);
			}
		}
	};

	const handleNavLinkClick = (sectionId) => {
		const trail = findSectionTrailById(displayableGuidelines, sectionId) || [
			sectionId,
		];
		const clickedSection = findSectionById(displayableGuidelines, sectionId);
		const descendantIds = clickedSection
			? collectSectionIds(clickedSection.children || [])
			: [];
		const clickedSectionIsExpanded =
			resolvedExpandedViewSectionIds.includes(sectionId);
		const hasChildren = descendantIds.length > 0;

		if (!isSearchActive && hasChildren && clickedSectionIsExpanded) {
			setExpandedViewSectionIds((currentExpandedIds) =>
				currentExpandedIds.filter(
					(id) => id !== sectionId && !descendantIds.includes(id),
				),
			);
			setActiveSectionId(sectionId);
			return;
		}

		setActiveSectionId(sectionId);
		setExpandedViewSectionIds((currentExpandedIds) =>
			mergeExpandedIds(currentExpandedIds, trail),
		);
	};

	const handleViewSectionToggle = (sectionId) => {
		setActiveSectionId(sectionId);

		if (isSearchActive) {
			return;
		}

		setExpandedViewSectionIds((currentExpandedIds) =>
			toggleExpandedId(currentExpandedIds, sectionId),
		);
	};

	const handleEditSectionToggle = (sectionId) => {
		if (isSearchActive) {
			return;
		}

		setExpandedEditSectionIds((currentExpandedIds) =>
			toggleExpandedId(currentExpandedIds, sectionId),
		);
	};

	const getHighlightedContent = (content) => {
		const trimmedSearchTerm = searchTerm.trim();

		if (!trimmedSearchTerm || typeof content !== "string") {
			return content;
		}

		try {
			const escapedSearchTerm = escapeRegExp(trimmedSearchTerm);
			const regex = new RegExp(
				`(?<!<[^>]*)${escapedSearchTerm}(?![^<]*>)`,
				"gi",
			);

			return content.replace(
				regex,
				(match) => `<mark class="bg-yellow-300">${match}</mark>`,
			);
		} catch (error) {
			console.error("Error during highlighting:", error);
			return content;
		}
	};

	const renderEditSections = (sections, parentPath = [], depth = 0) =>
		sections.map((section, index) => {
			const currentPath = [...parentPath, index];
			const isNestedSection = depth > 0;

			if (!visibleEditSectionIds.has(section.id)) {
				return null;
			}

			const isExpanded = resolvedExpandedEditSectionIds.includes(section.id);

			return (
				<div
					key={section.id || `edit-${currentPath.join("-")}`}
					className={`rounded-md border bg-white shadow-sm ${
						isNestedSection
							? "mt-4 ml-4 border-l-4 border-l-purple-200"
							: "mb-6"
					}`}
				>
					<button
						type="button"
						onClick={() => handleEditSectionToggle(section.id)}
						className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
					>
						<div>
							{isNestedSection && (
								<div className="text-xs font-semibold uppercase tracking-wide text-purple-600">
									Subsection
								</div>
							)}
							<div className="text-base font-semibold text-gray-900">
								{section.title || "Untitled Section"}
							</div>
						</div>
						<span
							className={`text-lg font-semibold text-purple-600 transition-transform ${
								isExpanded ? "rotate-90" : ""
							}`}
						>
							&gt;
						</span>
					</button>

					<AccordionPanel isOpen={isExpanded}>
						<div className="border-t border-gray-200 px-4 pb-4 pt-4">
							<div className="mb-3">
								<label
									htmlFor={`${localIdPrefix}-title-${section.id || currentPath.join("-")}`}
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									{isNestedSection ? "Subsection Title" : "Section Title"}
								</label>
								<input
									type="text"
									id={`${localIdPrefix}-title-${section.id || currentPath.join("-")}`}
									value={section.title}
									onChange={(e) =>
										handleSectionTitleChange(currentPath, e.target.value)
									}
									className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
								/>
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Content
								</label>
								<TipTapEditor
									content={section.content}
									onChange={(newContent) =>
										handleSectionContentChange(currentPath, newContent)
									}
								/>
							</div>

							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => handleAddSubsection(currentPath)}
									className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium"
								>
									+ Add Subsection
								</button>
								<button
									onClick={() => handleDeleteSection(currentPath)}
									className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium"
								>
									Delete {isNestedSection ? "Subsection" : "Section"}
								</button>
							</div>

							{section.children?.length > 0 && (
								<div className="mt-4">
									<p className="mb-2 text-sm font-medium text-gray-600">
										Nested Sections
									</p>
									{renderEditSections(section.children, currentPath, depth + 1)}
								</div>
							)}
						</div>
					</AccordionPanel>
				</div>
			);
		});

	const renderNavigationSections = (sections, depth = 0) => (
		<ul
			className={
				depth === 0
					? "space-y-2"
					: "mt-1 ml-3 space-y-1 border-l border-gray-200 pl-3"
			}
		>
			{sections.map((section) => {
				if (!visibleDisplaySectionIds.has(section.id)) {
					return null;
				}

				const isExpanded = resolvedExpandedViewSectionIds.includes(section.id);

				return (
					<li key={section.id}>
						<button
							onClick={() => handleNavLinkClick(section.id)}
							className={`flex w-full items-center justify-between gap-2 text-left rounded-md transition-colors ${
								depth === 0 ? "px-3 py-2 text-sm" : "px-2 py-1.5 text-xs"
							} ${
								activeSectionId === section.id
									? "bg-purple-100 text-purple-700 font-semibold"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
							}`}
						>
							<span>{section.title || "Untitled Section"}</span>
							{section.children?.length > 0 && (
								<span
									className={`text-[10px] font-semibold transition-transform ${
										isExpanded ? "rotate-90" : ""
									}`}
								>
									&gt;
								</span>
							)}
						</button>
						{(isSearchActive || isExpanded) &&
							section.children?.length > 0 &&
							renderNavigationSections(section.children, depth + 1)}
					</li>
				);
			})}
		</ul>
	);

	const renderDisplaySections = (sections, depth = 0) =>
		sections.map((section) => {
			if (!visibleDisplaySectionIds.has(section.id)) {
				return null;
			}

			const isExpanded = resolvedExpandedViewSectionIds.includes(section.id);
			const isActive = activeSectionId === section.id;

			return (
				<section
					key={section.id}
					id={section.id}
					ref={(el) => {
						sectionRefs.current[section.id] = el;
					}}
					className={`scroll-mt-20 rounded-xl border bg-white shadow-sm ${
						depth === 0 ? "mb-4" : "mt-4 ml-4 border-l-4 border-l-purple-100"
					}`}
				>
					<button
						type="button"
						onClick={() => handleViewSectionToggle(section.id)}
						className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left ${
							isActive ? "bg-purple-50" : ""
						}`}
					>
						<div>
							<div
								className={`${
									depth === 0
										? "text-xl"
										: depth === 1
											? "text-lg"
											: "text-base"
								} font-semibold text-gray-900`}
							>
								{section.title}
							</div>
						</div>
						<span
							className={`text-lg font-semibold text-purple-600 transition-transform ${
								isExpanded ? "rotate-90" : ""
							}`}
						>
							&gt;
						</span>
					</button>

					<AccordionPanel isOpen={isExpanded}>
						<div className="border-t border-gray-200 px-4 pb-4 pt-4">
							<div
								className="prose max-w-none"
								dangerouslySetInnerHTML={{
									__html: getHighlightedContent(section.content),
								}}
							/>
							{section.children?.length > 0 && (
								<div className="mt-4">
									{renderDisplaySections(section.children, depth + 1)}
								</div>
							)}
						</div>
					</AccordionPanel>
				</section>
			);
		});

	if (isLoading && !isEditing) {
		return (
			<p className="text-center text-gray-500 py-4">Loading guidelines...</p>
		);
	}

	if (isError && !isEditing) {
		return (
			<p className="text-center text-red-600 py-4">
				Error loading guidelines: {fetchError?.message || "Unknown error"}
			</p>
		);
	}

	if (isEditing && isAdmin) {
		return (
			<div className="bg-gray-50 p-4 rounded border mt-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-semibold text-gray-800">
						Edit Guidelines
					</h2>
					<div className="space-x-2">
						<button
							onClick={handleSaveChanges}
							disabled={mutation.isPending}
							className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
						>
							{mutation.isPending ? "Saving..." : "Save Changes"}
						</button>
						<button
							onClick={handleCancelEdit}
							disabled={mutation.isPending}
							className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm font-medium"
						>
							Cancel
						</button>
					</div>
				</div>

				<div className="mb-4">
					<input
						type="text"
						placeholder="Search sections or content..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
					/>
				</div>

				{generalError && (
					<p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
						Error: {generalError}
					</p>
				)}

				{visibleEditSectionIds.size === 0 ? (
					<p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
						No sections matched your search.
					</p>
				) : (
					renderEditSections(Array.isArray(editData) ? editData : [])
				)}

				<button
					onClick={handleAddSection}
					className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
				>
					+ Add New Section
				</button>
			</div>
		);
	}

	if (displayableGuidelines.length === 0) {
		return (
			<div className="bg-gray-50 p-4 rounded border mt-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-semibold text-gray-800">
						Association Guidelines
					</h2>
					{isAdmin && (
						<button
							onClick={handleEditToggle}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
						>
							Edit Guidelines
						</button>
					)}
				</div>
				<p className="text-center text-gray-500 py-4">
					No guidelines have been added yet.
					{isAdmin && " Admins can add guidelines in edit mode."}
				</p>
			</div>
		);
	}

	return (
		<div className="bg-gray-50 p-4 rounded border mt-6">
			<div className="flex justify-between items-center mb-6 pb-4 border-b">
				<h2 className="text-2xl font-semibold text-gray-800">
					Association Guidelines
				</h2>
				{isAdmin && (
					<button
						onClick={handleEditToggle}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
					>
						Edit Guidelines
					</button>
				)}
			</div>

			<div className="mb-6">
				<input
					type="text"
					placeholder="Search sections or content..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
				/>
			</div>

			<div className="flex flex-col md:flex-row gap-6">
				<nav className="md:w-1/4 lg:w-1/5 p-4 border rounded-md bg-white shadow max-h-[80vh] overflow-y-auto">
					<h3 className="text-lg font-semibold mb-3 text-gray-700 sticky top-0 bg-white py-2 z-10 border-b">
						Sections
					</h3>
					{visibleDisplaySectionIds.size === 0 ? (
						<p className="py-2 text-sm text-gray-500">No matching sections.</p>
					) : (
						renderNavigationSections(displayableGuidelines)
					)}
				</nav>

				<main className="md:w-3/4 lg:w-4/5 min-h-[60vh] max-h-[80vh] overflow-y-auto">
					{visibleDisplaySectionIds.size === 0 ? (
						<div className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
							No sections matched your search.
						</div>
					) : (
						renderDisplaySections(displayableGuidelines)
					)}
				</main>
			</div>
		</div>
	);
}
