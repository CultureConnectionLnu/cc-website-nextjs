// src/components/admin/TipTapToolbar.js
"use client";
import React from "react";
import {
	FaBold,
	FaItalic,
	FaUnderline,
	FaStrikethrough,
	FaListOl,
	FaListUl,
	FaLink,
	FaUnlink,
	FaPaintBrush,
	FaEraser,
} from "react-icons/fa";

const TipTapToolbar = ({ editor }) => {
	if (!editor) {
		return null;
	}

	const setLink = () => {
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);

		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	};

	const addColor = () => {
		const color = window.prompt(
			"Enter color (e.g., #FF0000 or red)",
			editor.getAttributes("textStyle").color,
		);
		if (color) {
			editor.chain().focus().setColor(color).run();
		}
	};

	return (
		<div className="tiptap-toolbar border border-gray-300 rounded-t-md p-2 flex flex-wrap gap-1 bg-gray-50">
			<button
				onClick={() => editor.chain().focus().toggleBold().run()}
				disabled={!editor.can().chain().focus().toggleBold().run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("bold") ? "bg-gray-300" : ""}`}
				title="Bold"
			>
				<FaBold />
			</button>
			<button
				onClick={() => editor.chain().focus().toggleItalic().run()}
				disabled={!editor.can().chain().focus().toggleItalic().run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("italic") ? "bg-gray-300" : ""}`}
				title="Italic"
			>
				<FaItalic />
			</button>
			<button
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				disabled={!editor.can().chain().focus().toggleUnderline().run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("underline") ? "bg-gray-300" : ""}`}
				title="Underline"
			>
				<FaUnderline />
			</button>
			<button
				onClick={() => editor.chain().focus().toggleStrike().run()}
				disabled={!editor.can().chain().focus().toggleStrike().run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("strike") ? "bg-gray-300" : ""}`}
				title="Strikethrough"
			>
				<FaStrikethrough />
			</button>
			<button
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("heading", { level: 1 }) ? "bg-gray-300" : ""}`}
				title="H1"
			>
				H1
			</button>
			<button
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("heading", { level: 2 }) ? "bg-gray-300" : ""}`}
				title="H2"
			>
				H2
			</button>
			<button
				onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("heading", { level: 3 }) ? "bg-gray-300" : ""}`}
				title="H3"
			>
				H3
			</button>
			<button
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("bulletList") ? "bg-gray-300" : ""}`}
				title="Bullet List"
			>
				<FaListUl />
			</button>
			<button
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("orderedList") ? "bg-gray-300" : ""}`}
				title="Ordered List"
			>
				<FaListOl />
			</button>
			<button
				onClick={setLink}
				className={`p-2 rounded hover:bg-gray-200 ${editor.isActive("link") ? "bg-gray-300" : ""}`}
				title="Add/Edit Link"
			>
				<FaLink />
			</button>
			{editor.isActive("link") && (
				<button
					onClick={() => editor.chain().focus().unsetLink().run()}
					className="p-2 rounded hover:bg-gray-200"
					title="Remove Link"
				>
					<FaUnlink />
				</button>
			)}
			<button
				onClick={addColor}
				className="p-2 rounded hover:bg-gray-200"
				title="Text Color"
			>
				<FaPaintBrush />
			</button>
			<button
				onClick={() => editor.chain().focus().unsetColor().run()}
				className="p-2 rounded hover:bg-gray-200"
				title="Clear Color"
			>
				<FaEraser />
			</button>
			<button
				onClick={() =>
					editor.chain().focus().clearNodes().unsetAllMarks().run()
				}
				className="p-2 rounded hover:bg-gray-200"
				title="Clear Formatting"
			>
				Clear
			</button>
		</div>
	);
};

export default TipTapToolbar;
