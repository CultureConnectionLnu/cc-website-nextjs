"use client";

import {
	faArrowRight,
	faCheck,
	faCloudUploadAlt,
	faCompressArrowsAlt,
	faFolder,
	faPlus,
	faSearch,
	faSpinner,
	faTimes,
	faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";

const MAX_WIDTH = 1920;
const COMPRESSION_QUALITY = 0.8;
const MAX_DELETE_SELECTION = 10; // Safety limit: "only 10 at a time"

// --- Helper: Compression ---
const compressImage = async (file) => {
	if (!file.type.startsWith("image/")) return file;
	if (file.size < 500 * 1024) return file;

	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);

		reader.onload = (event) => {
			const img = new Image();
			img.src = event.target.result;
			img.onload = () => {
				const canvas = document.createElement("canvas");
				let width = img.width;
				let height = img.height;

				if (width > MAX_WIDTH) {
					height = Math.round((height * MAX_WIDTH) / width);
					width = MAX_WIDTH;
				}

				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0, width, height);

				const isPng = file.type === "image/png";
				const outputType = isPng ? "image/png" : "image/jpeg";
				const outputExt = isPng ? ".png" : ".jpg";

				canvas.toBlob(
					(blob) => {
						if (!blob || blob.size === 0) {
							resolve(file);
							return;
						}
						const originalNameNoExt = file.name.replace(/\.[^/.]+$/, "");
						const newName = originalNameNoExt + outputExt;
						const newFile = new File([blob], newName, {
							type: outputType,
							lastModified: Date.now(),
						});
						resolve(newFile);
					},
					outputType,
					COMPRESSION_QUALITY,
				);
			};
			img.onerror = () => resolve(file);
		};
		reader.onerror = () => resolve(file);
	});
};

// --- API Functions ---
const fetchFolderContent = async ({ queryKey }) => {
	const [_, folderName] = queryKey;
	const param = folderName === "Root" ? "" : folderName;
	const res = await fetch(`/api/admin/one-com-public-files?folder=${param}`);
	if (!res.ok) throw new Error("Failed to fetch content");
	return res.json();
};

const uploadFiles = async ({ formData }) => {
	const res = await fetch("/api/admin/one-com-public-files", {
		method: "POST",
		body: formData,
	});
	if (!res.ok) throw new Error("Upload failed");
	return res.json();
};

const createFolder = async (folderName) => {
	const formData = new FormData();
	formData.append("action", "create_folder");
	formData.append("new_folder_name", folderName);
	const res = await fetch("/api/admin/one-com-public-files", {
		method: "POST",
		body: formData,
	});
	if (!res.ok) throw new Error("Create folder failed");
	return res.json();
};

const moveFile = async ({ fileName, currentFolder, targetFolder }) => {
	const res = await fetch("/api/admin/one-com-public-files", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			fileName,
			currentFolder: currentFolder === "Root" ? "" : currentFolder,
			targetFolder: targetFolder === "Root" ? "" : targetFolder,
		}),
	});
	if (!res.ok) throw new Error("Move failed");
	return res.json();
};

const deleteFile = async ({ fileName, folder }) => {
	const res = await fetch("/api/admin/one-com-public-files", {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			fileName,
			folder: folder === "Root" ? "" : folder,
		}),
	});
	if (!res.ok) throw new Error("Delete failed");
	return res.json();
};

export function OneComPublicFileManager({ onImageSelect }) {
	const queryClient = useQueryClient();
	const fileInputRef = useRef(null);

	// --- State ---
	const [activeCategory, setActiveCategory] = useState("Root");
	const [uploadCategory, setUploadCategory] = useState("Root");
	const [categories, setCategories] = useState(["Root"]);

	// Upload State
	const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
	const [previews, setPreviews] = useState([]);

	// Gallery/Delete State
	const [selectedForDelete, setSelectedForDelete] = useState([]); // List of filenames

	const [isProcessing, setIsProcessing] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [copiedUrl, setCopiedUrl] = useState(null);
	const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

	// --- Queries ---
	const { data: rootData } = useQuery({
		queryKey: ["oneComFiles", "Root"],
		queryFn: fetchFolderContent,
	});

	useEffect(() => {
		if (rootData?.folders) {
			setCategories(["Root", ...rootData.folders]);
		}
	}, [rootData]);

	const {
		data: activeData,
		isLoading,
		isError,
		error,
	} = useQuery({
		queryKey: ["oneComFiles", activeCategory],
		queryFn: fetchFolderContent,
		enabled: activeCategory !== "Root",
	});

	const currentData = activeCategory === "Root" ? rootData : activeData;

	// --- Mutations ---
	const uploadMutation = useMutation({
		mutationFn: uploadFiles,
		onError: (err) => setStatusMsg({ type: "error", text: err.message }),
	});

	const createFolderMutation = useMutation({
		mutationFn: createFolder,
		onSuccess: (res) => {
			setStatusMsg({ type: "success", text: res.message });
			queryClient.invalidateQueries(["oneComFiles", "Root"]);
			setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
		},
		onError: (err) => setStatusMsg({ type: "error", text: err.message }),
	});

	const moveMutation = useMutation({
		mutationFn: moveFile,
		onSuccess: (res, variables) => {
			setStatusMsg({ type: "success", text: res.message });
			queryClient.invalidateQueries(["oneComFiles", activeCategory]);
			queryClient.invalidateQueries(["oneComFiles", variables.targetFolder]);
			setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
		},
		onError: (err) => setStatusMsg({ type: "error", text: err.message }),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteFile,
		// We handle success/error manually in the bulk loop
	});

	// --- Upload Logic ---
	const handleNewFiles = async (fileList) => {
		if (!fileList.length) return;
		setIsProcessing(true);
		const validRawFiles = Array.from(fileList).filter((f) =>
			f.type.startsWith("image/"),
		);

		const processedFiles = await Promise.all(
			validRawFiles.map(async (f) => {
				try {
					return await compressImage(f);
				} catch (e) {
					return f;
				}
			}),
		);

		setSelectedUploadFiles((p) => [...p, ...processedFiles]);
		setPreviews((p) => [
			...p,
			...processedFiles.map((f) => ({
				name: f.name,
				url: URL.createObjectURL(f),
				size: (f.size / 1024).toFixed(0) + "KB",
			})),
		]);
		setIsProcessing(false);
	};

	const handleUpload = async () => {
		if (!selectedUploadFiles.length) return;

		const BATCH_SIZE = 4;
		const totalFiles = selectedUploadFiles.length;
		const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);
		let failCount = 0;

		setStatusMsg({
			type: "success",
			text: `Starting upload of ${totalFiles} files...`,
		});

		for (let i = 0; i < totalBatches; i++) {
			const start = i * BATCH_SIZE;
			const end = Math.min(start + BATCH_SIZE, totalFiles);
			const batchFiles = selectedUploadFiles.slice(start, end);

			setStatusMsg({
				type: "success",
				text: `Uploading batch ${i + 1} of ${totalBatches}...`,
			});

			try {
				const formData = new FormData();
				formData.append(
					"folder",
					uploadCategory === "Root" ? "" : uploadCategory,
				);
				batchFiles.forEach((file) => formData.append("files", file));
				await uploadMutation.mutateAsync({ formData });
			} catch (err) {
				failCount += batchFiles.length;
			}
		}

		if (failCount === 0) {
			setStatusMsg({ type: "success", text: "All uploads completed!" });
			setSelectedUploadFiles([]);
			setPreviews([]);
		} else {
			setStatusMsg({
				type: "error",
				text: `Finished with ${failCount} errors.`,
			});
		}

		queryClient.invalidateQueries(["oneComFiles", uploadCategory]);
		if (activeCategory !== uploadCategory) setActiveCategory(uploadCategory);
		setTimeout(() => setStatusMsg({ type: "", text: "" }), 5000);
	};

	// --- Bulk Delete Logic ---
	const toggleSelection = (fileName) => {
		setSelectedForDelete((prev) => {
			if (prev.includes(fileName)) {
				return prev.filter((f) => f !== fileName);
			} else {
				if (prev.length >= MAX_DELETE_SELECTION) {
					alert(`You can only select ${MAX_DELETE_SELECTION} items at a time.`);
					return prev;
				}
				return [...prev, fileName];
			}
		});
	};

	const handleBulkDelete = async () => {
		if (selectedForDelete.length === 0) return;
		if (
			!confirm(
				`Are you sure you want to delete ${selectedForDelete.length} files? This cannot be undone.`,
			)
		)
			return;

		setStatusMsg({ type: "success", text: "Starting deletion..." });
		let successCount = 0;

		// Delete one by one to ensure safety
		for (const fileName of selectedForDelete) {
			try {
				await deleteMutation.mutateAsync({ fileName, folder: activeCategory });
				successCount++;
				// Remove from selection as we go so user sees progress
				setSelectedForDelete((prev) => prev.filter((f) => f !== fileName));
			} catch (err) {
				console.error("Delete failed for", fileName);
			}
		}

		setStatusMsg({ type: "success", text: `Deleted ${successCount} files.` });
		queryClient.invalidateQueries(["oneComFiles", activeCategory]);
		setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
	};

	// --- Other Handlers ---
	const handleCreateCategory = () => {
		const name = prompt("Enter new category name:");
		if (name) {
			if (categories.includes(name)) {
				alert("Exists!");
				return;
			}
			createFolderMutation.mutate(name);
		}
	};

	const handleMove = (fileName, target) => {
		if (target === activeCategory) return;
		if (confirm(`Move "${fileName}" to ${target}?`)) {
			moveMutation.mutate({
				fileName,
				currentFolder: activeCategory,
				targetFolder: target,
			});
		}
	};

	const displayedItems =
		currentData?.files?.filter((i) =>
			i.name.toLowerCase().includes(searchTerm.toLowerCase()),
		) || [];

	return (
		<div className="font-sans space-y-6">
			{/* 1. Category Tabs */}
			<div className="flex flex-wrap gap-2 border-b pb-2 items-end">
				{categories.map((cat) => (
					<button
						type="button"
						key={cat}
						onClick={() => {
							setActiveCategory(cat);
							setSelectedForDelete([]);
						}} // Clear selection on change
						className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-t border-x border-transparent
              ${
								activeCategory === cat
									? "bg-purple-600 text-white shadow-sm border-purple-600"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}
					>
						{cat}
					</button>
				))}
				<button
					type="button"
					onClick={handleCreateCategory}
					className="px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded mb-0.5"
				>
					<FontAwesomeIcon icon={faPlus} />
				</button>
			</div>

			{/* 2. Upload Box */}
			<div
				className={`border-2 border-dashed rounded-xl p-6 relative transition-all
          ${isDragging ? "border-purple-500 bg-purple-50" : "border-gray-300 bg-gray-50"}`}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setIsDragging(false);
					handleNewFiles(e.dataTransfer.files);
				}}
			>
				{isProcessing && (
					<div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center text-purple-600">
						<FontAwesomeIcon icon={faCompressArrowsAlt} spin size="2x" />
						<span className="ml-2">Optimizing...</span>
					</div>
				)}

				{!selectedUploadFiles.length ? (
					<div
						className="text-center cursor-pointer py-4"
						onClick={() => fileInputRef.current?.click()}
					>
						<FontAwesomeIcon
							icon={faCloudUploadAlt}
							size="2x"
							className="text-gray-400 mb-2"
						/>
						<p className="text-gray-600 font-medium">Click to Upload</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<h4 className="font-bold text-gray-700">
								Selected ({selectedUploadFiles.length})
							</h4>
							<select
								value={uploadCategory}
								onChange={(e) => setUploadCategory(e.target.value)}
								className="p-1 border rounded text-sm bg-white"
							>
								{categories.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
						<div className="flex gap-2 overflow-x-auto pb-2">
							{previews.map((p, i) => (
								<div key={i} className="relative w-16 h-16 flex-shrink-0">
									<img
										src={p.url}
										className="w-full h-full object-cover rounded border"
									/>
									<button
										type="button"
										onClick={() => {
											setSelectedUploadFiles((s) =>
												s.filter((_, x) => x !== i),
											);
											setPreviews((s) => s.filter((_, x) => x !== i));
										}}
										className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
									>
										<FontAwesomeIcon icon={faTimes} />
									</button>
								</div>
							))}
						</div>
						<button
							type="button"
							onClick={handleUpload}
							disabled={statusMsg.text?.startsWith("Uploading")}
							className="w-full bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700 disabled:opacity-50"
						>
							{statusMsg.text?.startsWith("Uploading")
								? "Uploading..."
								: "Start Upload"}
						</button>
					</div>
				)}
				<input
					type="file"
					multiple
					accept="image/*"
					ref={fileInputRef}
					className="hidden"
					onChange={(e) => handleNewFiles(e.target.files)}
				/>
			</div>

			{statusMsg.text && (
				<div
					className={`p-3 rounded text-sm text-center font-medium ${statusMsg.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
				>
					{statusMsg.text}
				</div>
			)}

			{/* 3. Gallery & Actions */}
			{isLoading ? (
				<div className="text-center py-10 text-gray-400">
					<FontAwesomeIcon icon={faSpinner} spin size="2x" />
				</div>
			) : isError ? (
				<div className="text-center py-10 text-red-500">{error.message}</div>
			) : (
				<div>
					{/* Action Bar */}
					<div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded min-h-[50px]">
						{/* Left: Title or Bulk Action */}
						{selectedForDelete.length > 0 ? (
							<div className="flex items-center gap-3 w-full">
								<button
									type="button"
									onClick={handleBulkDelete}
									className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold shadow-md flex items-center gap-2"
								>
									<FontAwesomeIcon icon={faTrashAlt} />
									Delete {selectedForDelete.length} Items
								</button>
								<button
									type="button"
									onClick={() => setSelectedForDelete([])}
									className="text-gray-500 text-sm hover:underline"
								>
									Cancel
								</button>
							</div>
						) : (
							<h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
								<FontAwesomeIcon icon={faFolder} className="text-yellow-500" />
								{activeCategory}
								<span className="text-sm font-normal text-gray-400">
									({displayedItems.length})
								</span>
							</h3>
						)}

						{/* Right: Search (only when not deleting) */}
						{selectedForDelete.length === 0 && (
							<div className="relative">
								<FontAwesomeIcon
									icon={faSearch}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
								/>
								<input
									type="text"
									placeholder="Filter..."
									className="pl-8 pr-3 py-1 text-sm border rounded-full outline-none focus:ring-1 focus:ring-purple-400"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
						{displayedItems.map((item) => {
							const baseUrl = currentData.imageBaseUrl.replace(/\/$/, "");
							const folderPart =
								activeCategory === "Root" ? "" : `/${activeCategory}`;
							const fullUrl = `${baseUrl}${folderPart}/${item.name}`;
							const isSelected = selectedForDelete.includes(item.name);

							return (
								<div
									key={item.name}
									className={`group relative border rounded hover:shadow-lg bg-white overflow-hidden transition-all ${isSelected ? "ring-2 ring-red-500 ring-offset-2" : ""}`}
								>
									<div className="aspect-square bg-gray-100 relative">
										{/* Checkbox for Selection */}
										<div className="absolute top-2 left-2 z-20">
											<input
												type="checkbox"
												checked={isSelected}
												onChange={() => toggleSelection(item.name)}
												className="w-5 h-5 cursor-pointer accent-red-500 shadow-sm"
											/>
										</div>

										<img
											src={fullUrl}
											className="w-full h-full object-cover"
											loading="lazy"
											onError={(e) => (e.target.style.opacity = 0.5)}
										/>

										{/* Hover Overlay */}
										<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
											<button
												type="button"
												onClick={() => {
													if (onImageSelect) onImageSelect(fullUrl);
													else {
														navigator.clipboard.writeText(fullUrl);
														setCopiedUrl(fullUrl);
														setTimeout(() => setCopiedUrl(null), 1000);
													}
												}}
												className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-medium backdrop-blur-sm"
											>
												{onImageSelect
													? "Select"
													: copiedUrl === fullUrl
														? "Copied!"
														: "Copy URL"}
											</button>
											<div className="relative group/move">
												<button
													type="button"
													className="text-[10px] text-white hover:text-purple-200 flex items-center gap-1 uppercase font-bold tracking-wide"
												>
													Move <FontAwesomeIcon icon={faArrowRight} />
												</button>
												<div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover/move:block bg-white text-gray-800 shadow-xl rounded py-1 min-w-[120px] z-20 border max-h-40 overflow-y-auto">
													{categories
														.filter((c) => c !== activeCategory)
														.map((cat) => (
															<button
																type="button"
																key={cat}
																onClick={() => handleMove(item.name, cat)}
																className="block w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 hover:text-purple-700"
															>
																{cat}
															</button>
														))}
												</div>
											</div>
										</div>
									</div>
									<div className="p-2 bg-white">
										<p
											className="text-xs truncate text-gray-700 font-medium"
											title={item.name}
										>
											{item.name}
										</p>
									</div>
								</div>
							);
						})}
					</div>
					{!displayedItems.length && (
						<div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-100 rounded">
							Folder is empty.
						</div>
					)}
				</div>
			)}
		</div>
	);
}
