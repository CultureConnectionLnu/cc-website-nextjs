"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

export default function EditableTextArea({
	idx,
	resp,
	handleNewAutoRespFieldChange,
	textDescrition,
	header,
}) {
	const [textValue, setTextValue] = useState(resp.content || "");
	const textareaRef = useRef(null);
	const [roles, setRoles] = useState([]);
	const API_BASE_URL = process.env.NEXT_PUBLIC_API_DISCORD_URL;

	useEffect(() => {
		setTextValue(resp.content || "");
	}, [resp.content]);

	useEffect(() => {
		if (!API_BASE_URL) {
			console.error("API URL not configured.");
			return;
		}
		fetch(`${API_BASE_URL}/roles`)
			.then((res) => res.json())
			.then((json) => {
				if (json?.data?.roles) {
					setRoles(json.data.roles);
				} else {
					setRoles([]);
					console.error("Failed to parse roles from API response:", json);
				}
			})
			.catch((err) => console.error("Error fetching roles:", err));
	}, [API_BASE_URL]);

	const wrapSelectedText = (start, end) => {
		if (!textareaRef.current) return;
		const { selectionStart, selectionEnd } = textareaRef.current;
		if (selectionStart === selectionEnd) return;
		const before = textValue.slice(0, selectionStart);
		const selected = textValue.slice(selectionStart, selectionEnd);
		const after = textValue.slice(selectionEnd);
		const newValue = `${before}${start}${selected}${end}${after}`;
		onChangeHandler(newValue);
	};

	const insertTextAtCursor = (insertText) => {
		if (!textareaRef.current) return;
		const { selectionStart, selectionEnd } = textareaRef.current;
		const before = textValue.slice(0, selectionStart);
		const after = textValue.slice(selectionEnd);
		const newValue = before + insertText + after;
		onChangeHandler(newValue);

		setTimeout(() => {
			if (textareaRef.current) {
				textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
					selectionStart + insertText.length;
				textareaRef.current.focus();
			}
		}, 0);
	};

	const onChangeHandler = (newText) => {
		setTextValue(newText);
		handleNewAutoRespFieldChange(idx, "content", newText);
	};

	const transformEmptyLines = (text) => {
		return text
			.split("\n")
			.map((line) => (line.trim() === "" ? "\u00A0" : line))
			.join("\n");
	};

	const transformRoleMentions = (text) => {
		return text.replace(/<@&(\d+)>/g, (match, roleId) => {
			const role = roles.find((r) => r.id === roleId);
			return role ? `@${role.name}` : match;
		});
	};

	return (
		<div className="max-w-xl mx-auto mt-6 p-4 border rounded shadow">
			<h2 className="text-xl font-bold mb-4">{header}</h2>
			<p className="mb-6 p-4 text-gray-400 font-light">{textDescrition}</p>

			<div className="flex space-x-2 mb-2">
				<button
					type="button"
					className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
					onClick={() => wrapSelectedText("**", "**")}
				>
					Bold
				</button>

				<button
					type="button"
					className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
					onClick={() => wrapSelectedText("_", "_")}
				>
					Italic
				</button>

				<button
					type="button"
					className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
					onClick={() => wrapSelectedText("`", "`")}
				>
					<code>code</code>
				</button>

				<select
					className="ml-2 w-32 px-2 py-1 border rounded"
					onChange={(e) => {
						const selectedRoleId = e.target.value;
						if (selectedRoleId) {
							insertTextAtCursor(`<@&${selectedRoleId}>`);
						}
						e.target.value = "";
					}}
					defaultValue=""
				>
					<option value="" disabled>
						Select a role
					</option>
					{roles.map((role) => (
						<option key={role.id} value={role.id}>
							{role.name}
						</option>
					))}
				</select>
			</div>

			<textarea
				ref={textareaRef}
				rows={5}
				className="w-full p-2 mb-4 border-2 border-gray-300 focus:outline-none focus:border-blue-400 rounded"
				placeholder="Enter markdown here..."
				value={textValue}
				onChange={(e) => onChangeHandler(e.target.value)}
			/>

			<h3 className="font-bold mb-2">Live Preview:</h3>
			<div className="p-2 border rounded text-left bg-gray-100">
				<ReactMarkdown remarkPlugins={[remarkBreaks]}>
					{transformEmptyLines(transformRoleMentions(textValue))}
				</ReactMarkdown>
			</div>
		</div>
	);
}
