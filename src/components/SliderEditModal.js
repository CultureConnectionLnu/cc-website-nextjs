"use client";

import { faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const modalVariants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.95 },
};

const SliderEditModal = ({
	isOpen,
	onClose,
	initialData,
	initialSettings,
	onSave,
	isSaving,
}) => {
	const [editableData, setEditableData] = useState(null);
	const [editedSettings, setEditedSettings] = useState(null);
	const [selectedPreset, setSelectedPreset] = useState("");
	const [newImageUrl, setNewImageUrl] = useState("");
	const [newPresetName, setNewPresetName] = useState("");
	const [newMappingId, setNewMappingId] = useState("");
	const [newMappingPreset, setNewMappingPreset] = useState("");

	useEffect(() => {
		if (isOpen) {
			const safeData = initialData
				? JSON.parse(JSON.stringify(initialData))
				: {};
			const safeSettings = initialSettings
				? JSON.parse(JSON.stringify(initialSettings))
				: { defaultPreset: "", presetMappings: {} };
			safeSettings.presetMappings = safeSettings.presetMappings || {};

			setEditableData(safeData);
			setEditedSettings(safeSettings);
			setSelectedPreset(
				safeSettings.defaultPreset || Object.keys(safeData)[0] || "",
			);

			console.log("[Modal] Initialized state:", { safeData, safeSettings }); // Debug log
		}
	}, [isOpen, initialData, initialSettings]);

	const handleAddImage = () => {
		if (!newImageUrl.trim()) {
			toast.error("Image URL cannot be empty.");
			return;
		}
		const newImage = {
			id: Date.now(),
			src: newImageUrl.trim(),
			alt: "User added image",
		};

		setEditableData((prev) => ({
			...prev,
			[selectedPreset]: [...(prev[selectedPreset] || []), newImage],
		}));
		setNewImageUrl("");
		toast.success("Image added to list.");
	};

	const handleDeleteImage = (idToDelete) => {
		setEditableData((prev) => ({
			...prev,
			[selectedPreset]: prev[selectedPreset].filter(
				(img) => img.id !== idToDelete,
			),
		}));
		toast.success("Image removed from list.");
	};

	const handleCreatePreset = () => {
		const name = newPresetName.trim();
		if (!name) {
			toast.error("Preset name cannot be empty.");
			return;
		}
		if (editableData[name]) {
			toast.error("A preset with this name already exists.");
			return;
		}

		setEditableData((prev) => ({
			...prev,
			[name]: [],
		}));
		setSelectedPreset(name);
		setNewPresetName("");
		toast.success(`Preset "${name}" created!`);
	};

	const handleDeletePreset = () => {
		if (Object.keys(editableData).length <= 1) {
			toast.error("Cannot delete the last preset.");
			return;
		}

		if (
			!window.confirm(
				`Are you sure you want to delete the "${selectedPreset}" preset? This cannot be undone.`,
			)
		) {
			return;
		}

		const newData = { ...editableData };
		delete newData[selectedPreset];

		setEditableData(newData);
		const remainingKeys = Object.keys(newData);
		const newSelected = remainingKeys[0];
		setSelectedPreset(newSelected);

		// Reset default if deleted
		let settingsUpdated = false;
		if (editedSettings.defaultPreset === selectedPreset) {
			setEditedSettings((prev) => ({
				...prev,
				defaultPreset: newSelected,
			}));
			settingsUpdated = true;
			toast.success(`Default preset reset to "${newSelected}".`);
		}

		// Clean up mappings that reference the deleted preset
		const newMappings = { ...editedSettings.presetMappings };
		Object.keys(newMappings).forEach((key) => {
			if (newMappings[key] === selectedPreset) {
				delete newMappings[key];
				settingsUpdated = true;
			}
		});
		if (settingsUpdated) {
			setEditedSettings((prev) => ({
				...prev,
				presetMappings: newMappings,
			}));
			toast.success("Cleaned up invalid mappings.");
		}

		toast.success(`Preset "${selectedPreset}" deleted.`);
	};

	const handleDefaultPresetChange = (e) => {
		setEditedSettings((prev) => ({
			...prev,
			defaultPreset: e.target.value,
		}));
	};

	const handleAddMapping = () => {
		if (!newMappingId.trim() || !newMappingPreset) {
			toast.error("Slider ID and Preset must be provided.");
			return;
		}
		if (editedSettings.presetMappings?.[newMappingId]) {
			toast.error("A mapping with this Slider ID already exists.");
			return;
		}

		setEditedSettings((prev) => ({
			...prev,
			presetMappings: {
				...(prev.presetMappings || {}),
				[newMappingId]: newMappingPreset,
			},
		}));
		setNewMappingId("");
		setNewMappingPreset("");
		toast.success(`Mapping "${newMappingId}" -> "${newMappingPreset}" added!`);
	};

	const handleDeleteMapping = (mappingId) => {
		const newMappings = { ...(editedSettings.presetMappings || {}) };
		delete newMappings[mappingId];
		setEditedSettings((prev) => ({
			...prev,
			presetMappings: newMappings,
		}));
		toast.success(`Mapping "${mappingId}" deleted.`);
	};

	const handleUpdateMapping = (mappingId, newPreset) => {
		setEditedSettings((prev) => ({
			...prev,
			presetMappings: {
				...(prev.presetMappings || {}),
				[mappingId]: newPreset,
			},
		}));
		toast.success(`Mapping "${mappingId}" updated to "${newPreset}".`);
	};

	const handleSave = () => {
		if (!editableData[editedSettings.defaultPreset]) {
			console.error("[Modal] Save blocked: Invalid default preset."); // Debug log
			toast.error("Default preset must be a valid existing preset.");
			return;
		}

		console.log("[Modal] Attempting save with:", {
			newData: editableData,
			newSettings: editedSettings,
		}); // Debug log

		onSave({ newData: editableData, newSettings: editedSettings });
	};

	if (!isOpen || !editableData || !editedSettings) return null;

	const currentImages = editableData[selectedPreset] || [];
	const canDeletePreset = Object.keys(editableData).length > 1;
	const presetKeys = Object.keys(editableData);
	const mappings = editedSettings.presetMappings || {};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<motion.div
						variants={modalVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
					>
						<div className="flex items-center justify-between p-4 border-b">
							<h2 className="text-xl font-bold text-gray-800">
								Edit Slider Images and Settings
							</h2>
							<button
								onClick={onClose}
								className="text-gray-500 hover:text-gray-800"
							>
								<FontAwesomeIcon icon={faTimes} size="lg" />
							</button>
						</div>

						<div className="p-6 space-y-6 overflow-y-auto">
							{/* Preset Selection and Management */}
							<div className="space-y-2">
								<label
									htmlFor="preset-select"
									className="block font-semibold text-gray-700"
								>
									Select Preset to Edit
								</label>
								<div className="flex items-center gap-2">
									<select
										id="preset-select"
										value={selectedPreset}
										onChange={(e) => setSelectedPreset(e.target.value)}
										className="w-full p-2 border rounded-md"
									>
										{presetKeys.map((key) => (
											<option key={key} value={key}>
												{key}
											</option>
										))}
									</select>
									<button
										onClick={handleDeletePreset}
										disabled={!canDeletePreset}
										className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
										aria-label="Delete selected preset"
										title="Delete selected preset"
									>
										<FontAwesomeIcon icon={faTrash} />
									</button>
								</div>
							</div>

							{/* Images in Selected Preset */}
							<div className="space-y-2">
								<h3 className="font-semibold text-gray-700">
									Images in "{selectedPreset}"
								</h3>
								<div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md bg-gray-50">
									{currentImages.length > 0 ? (
										currentImages.map((image) => (
											<div
												key={image.id}
												className="flex items-center justify-between bg-white p-2 rounded shadow-sm"
											>
												<img
													src={image.src}
													alt={image.alt}
													className="w-10 h-10 object-cover rounded mr-3"
												/>
												<p className="text-sm text-gray-600 truncate flex-grow">
													{image.src}
												</p>
												<button
													onClick={() => handleDeleteImage(image.id)}
													className="text-red-500 hover:text-red-700 ml-3 p-1"
													aria-label="Delete image"
												>
													<FontAwesomeIcon icon={faTrash} />
												</button>
											</div>
										))
									) : (
										<p className="text-gray-500 text-center py-4">
											No images in this preset.
										</p>
									)}
								</div>
							</div>

							{/* Add New Image */}
							<div className="space-y-2">
								<label
									htmlFor="new-image-url"
									className="block font-semibold text-gray-700"
								>
									Add New Image to "{selectedPreset}"
								</label>
								<div className="flex gap-2">
									<input
										id="new-image-url"
										type="text"
										value={newImageUrl}
										onChange={(e) => setNewImageUrl(e.target.value)}
										placeholder="https://example.com/image.jpg"
										className="w-full p-2 border rounded-md"
									/>
									<button
										onClick={handleAddImage}
										disabled={!newImageUrl.trim()}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-blue-300"
									>
										Add
									</button>
								</div>
							</div>

							{/* Create New Preset */}
							<div className="space-y-2 border-t pt-4">
								<label
									htmlFor="new-preset-name"
									className="block font-semibold text-gray-700"
								>
									Create New Preset
								</label>
								<div className="flex gap-2">
									<input
										id="new-preset-name"
										type="text"
										value={newPresetName}
										onChange={(e) => setNewPresetName(e.target.value)}
										placeholder="e.g., 'three', 'events-2025'"
										className="w-full p-2 border rounded-md"
									/>
									<button
										onClick={handleCreatePreset}
										disabled={!newPresetName.trim()}
										className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300"
									>
										Create
									</button>
								</div>
							</div>

							{/* Default Preset Selection */}
							<div className="space-y-2 border-t pt-4">
								<label
									htmlFor="default-preset"
									className="block font-semibold text-gray-700"
								>
									Default Preset (Fallback)
								</label>
								<select
									id="default-preset"
									value={editedSettings.defaultPreset}
									onChange={handleDefaultPresetChange}
									className="w-full p-2 border rounded-md"
								>
									{presetKeys.map((key) => (
										<option key={key} value={key}>
											{key}
										</option>
									))}
								</select>
							</div>

							{/* Preset Mappings Management */}
							<div className="space-y-2 border-t pt-4">
								<h3 className="font-semibold text-gray-700">
									Preset Mappings (Slider ID → Preset)
								</h3>
								<div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md bg-gray-50">
									{Object.keys(mappings).length > 0 ? (
										Object.entries(mappings).map(([mappingId, preset]) => (
											<div
												key={mappingId}
												className="flex items-center justify-between bg-white p-2 rounded shadow-sm"
											>
												<input
													type="text"
													value={mappingId}
													className="w-1/3 p-1 border rounded-md mr-2 bg-gray-100"
													disabled
												/>
												<select
													value={preset}
													onChange={(e) =>
														handleUpdateMapping(mappingId, e.target.value)
													}
													className="w-1/3 p-1 border rounded-md mr-2"
												>
													{presetKeys.map((key) => (
														<option key={key} value={key}>
															{key}
														</option>
													))}
												</select>
												<button
													onClick={() => handleDeleteMapping(mappingId)}
													className="text-red-500 hover:text-red-700 p-1"
													aria-label="Delete mapping"
												>
													<FontAwesomeIcon icon={faTrash} />
												</button>
											</div>
										))
									) : (
										<p className="text-gray-500 text-center py-4">
											No mappings defined.
										</p>
									)}
								</div>
								<div className="space-y-2">
									<label className="block font-semibold text-gray-700">
										Add New Mapping
									</label>
									<div className="flex gap-2">
										<input
											type="text"
											value={newMappingId}
											onChange={(e) => setNewMappingId(e.target.value)}
											placeholder="Slider ID (e.g., 'mainPage')"
											className="w-1/2 p-2 border rounded-md"
										/>
										<select
											value={newMappingPreset}
											onChange={(e) => setNewMappingPreset(e.target.value)}
											className="w-1/2 p-2 border rounded-md"
										>
											<option value="">Select Preset</option>
											{presetKeys.map((key) => (
												<option key={key} value={key}>
													{key}
												</option>
											))}
										</select>
										<button
											onClick={handleAddMapping}
											disabled={!newMappingId.trim() || !newMappingPreset}
											className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-blue-300"
										>
											Add
										</button>
									</div>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-end p-4 border-t space-x-3">
							<button
								onClick={onClose}
								className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
								disabled={isSaving}
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold disabled:bg-indigo-300"
								disabled={isSaving}
							>
								{isSaving ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default SliderEditModal;
