"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ColorPicker from "../ColorPicker";
import CombinedFileManager from "./DriveManagment/CombinedFileManager";

const fetchCards = async () => {
	const response = await fetch("/api/main/cards");
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to fetch cards: ${response.statusText}`,
		);
	}
	return response.json();
};

const createCard = async (newCardData) => {
	const response = await fetch("/api/admin/cards", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(newCardData),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to create card: ${response.statusText}`,
		);
	}
	return response.json();
};

const updateCard = async (updatedCardData) => {
	const response = await fetch("/api/admin/cards", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(updatedCardData),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to update card: ${response.statusText}`,
		);
	}
	return response.json();
};

const deleteCard = async (cardId) => {
	const response = await fetch(`/api/admin/cards?id=${cardId}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to delete card: ${response.statusText}`,
		);
	}
	return response.json();
};

function CardForm({ initialData, onSubmit, onCancel, isSubmitting }) {
	const [formData, setFormData] = useState({
		title: "",
		date: "",
		time: "",
		location: "",
		bgColor: "bg-gray-200",
		description: "",
		imageUrl: "",
		url: "",
		inDescription: [],
		...initialData,
		inDescription: Array.isArray(initialData?.inDescription)
			? initialData.inDescription.map((item) => ({
					...item,
					ImagesUrl: Array.isArray(item.ImagesUrl) ? item.ImagesUrl : [],
				}))
			: [],
		imageUrl: initialData?.imageUrl || "",
		url: initialData?.url || "",
		bgColor: initialData?.bgColor || "bg-gray-200",
	});

	const [showColorPicker, setShowColorPicker] = useState(false);
	const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
	const [targetInputIndex, setTargetInputIndex] = useState({
		descIndex: null,
		imgIndex: null,
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleColorSelect = (colorClass) => {
		setFormData((prev) => ({ ...prev, bgColor: colorClass }));
	};

	const handleInDescriptionChange = (index, field, value) => {
		setFormData((prev) => {
			const newInDescription = [...prev.inDescription];
			if (!newInDescription[index])
				newInDescription[index] = { title: "", description: "", ImagesUrl: [] };
			newInDescription[index] = { ...newInDescription[index], [field]: value };
			return { ...prev, inDescription: newInDescription };
		});
	};

	const addInDescriptionItem = () => {
		setFormData((prev) => ({
			...prev,
			inDescription: [
				...prev.inDescription,
				{ title: "", description: "", ImagesUrl: [] },
			],
		}));
	};

	const removeInDescriptionItem = (indexToRemove) => {
		setFormData((prev) => ({
			...prev,
			inDescription: prev.inDescription.filter(
				(_, index) => index !== indexToRemove,
			),
		}));
	};

	const handleImageUrlChange = (descIndex, imgIndex, value) => {
		setFormData((prev) => {
			const newInDescription = [...prev.inDescription];
			const newImagesUrl = [...(newInDescription[descIndex]?.ImagesUrl || [])];
			newImagesUrl[imgIndex] = value;
			newInDescription[descIndex] = {
				...newInDescription[descIndex],
				ImagesUrl: newImagesUrl,
			};
			return { ...prev, inDescription: newInDescription };
		});
	};

	const addImageUrl = (descIndex) => {
		setFormData((prev) => {
			const newInDescription = [...prev.inDescription];
			const newImagesUrl = [
				...(newInDescription[descIndex]?.ImagesUrl || []),
				"",
			];
			newInDescription[descIndex] = {
				...newInDescription[descIndex],
				ImagesUrl: newImagesUrl,
			};
			return { ...prev, inDescription: newInDescription };
		});
	};

	const removeImageUrl = (descIndex, imgIndexToRemove) => {
		setFormData((prev) => {
			const newInDescription = [...prev.inDescription];
			const currentImages = newInDescription[descIndex]?.ImagesUrl || [];
			const newImagesUrl = currentImages.filter(
				(_, index) => index !== imgIndexToRemove,
			);
			newInDescription[descIndex] = {
				...newInDescription[descIndex],
				ImagesUrl: newImagesUrl,
			};
			return { ...prev, inDescription: newInDescription };
		});
	};

	const openFileManager = (descIndex, imgIndex) => {
		setTargetInputIndex({ descIndex, imgIndex });
		setIsFileManagerOpen(true);
	};

	const handleImageSelected = (selectedUrl) => {
		if (
			targetInputIndex.descIndex !== null &&
			targetInputIndex.imgIndex !== null
		) {
			handleImageUrlChange(
				targetInputIndex.descIndex,
				targetInputIndex.imgIndex,
				selectedUrl,
			);
		}
		setIsFileManagerOpen(false);
		setTargetInputIndex({ descIndex: null, imgIndex: null });
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const cleanedFormData = {
			...formData,
			inDescription: formData.inDescription
				.map((item) => ({
					...item,
					ImagesUrl: (item.ImagesUrl || []).filter((url) => url?.trim()),
				}))
				.filter(
					(item) =>
						item.title?.trim() ||
						item.description?.trim() ||
						item.ImagesUrl?.length > 0,
				),
		};
		onSubmit(cleanedFormData);
	};

	return (
		<>
			<form
				onSubmit={handleSubmit}
				className="space-y-4 bg-white p-6 rounded shadow-md border"
			>
				<h3 className="text-lg font-medium mb-4">
					{initialData ? "Edit Card" : "Add New Card"}
				</h3>
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-medium text-gray-700"
					>
						Title
					</label>
					<input
						type="text"
						name="title"
						id="title"
						value={formData.title}
						onChange={handleChange}
						required
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					/>
				</div>
				<div>
					<label
						htmlFor="imageUrl"
						className="block text-sm font-medium text-gray-700"
					>
						Main Image URL (Optional)
					</label>
					<input
						type="url"
						name="imageUrl"
						id="imageUrl"
						value={formData.imageUrl}
						onChange={handleChange}
						placeholder="https://example.com/image.jpg"
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					/>
				</div>
				<div>
					<label
						htmlFor="url"
						className="block text-sm font-medium text-gray-700"
					>
						External Link URL (Optional)
					</label>
					<input
						type="url"
						name="url"
						id="url"
						value={formData.url}
						onChange={handleChange}
						placeholder="https://example.com/signup"
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					/>
				</div>
				<div>
					<label
						htmlFor="description"
						className="block text-sm font-medium text-gray-700"
					>
						Main Description (Optional)
					</label>
					<textarea
						name="description"
						id="description"
						value={formData.description}
						onChange={handleChange}
						rows="3"
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					></textarea>
				</div>
				<div>
					<label
						htmlFor="date"
						className="block text-sm font-medium text-gray-700"
					>
						Date
					</label>
					<input
						type="text"
						name="date"
						id="date"
						value={formData.date}
						onChange={handleChange}
						required
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					/>
				</div>
				<div>
					<label
						htmlFor="time"
						className="block text-sm font-medium text-gray-700"
					>
						Time
					</label>
					<input
						type="text"
						name="time"
						id="time"
						value={formData.time}
						onChange={handleChange}
						required
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					/>
				</div>
				<div>
					<label
						htmlFor="location"
						className="block text-sm font-medium text-gray-700"
					>
						Location
					</label>
					<input
						type="text"
						name="location"
						id="location"
						value={formData.location}
						onChange={handleChange}
						required
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700">
						Background Color
					</label>
					<div className="mt-1 flex items-center gap-3">
						<div
							className={`w-8 h-8 rounded border border-gray-400 ${formData.bgColor}`}
							title={formData.bgColor}
						></div>
						<input
							type="text"
							name="bgColor"
							value={formData.bgColor}
							onChange={handleChange}
							placeholder="e.g., bg-blue-300"
							className="flex-grow border border-gray-300 rounded-md shadow-sm p-2 text-sm"
						/>
						<button
							type="button"
							onClick={() => setShowColorPicker(!showColorPicker)}
							className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
						>
							{showColorPicker ? "Hide" : "Pick"} Color
						</button>
					</div>
					{showColorPicker && (
						<div
							className="mt-2 border rounded max-h-60 overflow-y-auto"
							onClick={(e) => e.stopPropagation()}
						>
							<ColorPicker onSelectColor={handleColorSelect} />
						</div>
					)}
				</div>

				<div className="pt-4 border-t">
					<h4 className="text-md font-medium text-gray-800 mb-2">
						Detailed Sections (In Description)
					</h4>
					{formData.inDescription.map((item, descIndex) => (
						<div
							key={descIndex}
							className="p-3 border rounded mb-3 bg-gray-50 space-y-2 relative"
						>
							<button
								type="button"
								onClick={() => removeInDescriptionItem(descIndex)}
								className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 bg-white rounded-full leading-none"
								aria-label={`Remove section ${descIndex + 1}`}
							>
								&times;
							</button>
							<div>
								<label
									htmlFor={`inDescTitle-${descIndex}`}
									className="block text-xs font-medium text-gray-600"
								>
									Section Title {descIndex + 1}
								</label>
								<input
									type="text"
									id={`inDescTitle-${descIndex}`}
									value={item.title || ""}
									onChange={(e) =>
										handleInDescriptionChange(
											descIndex,
											"title",
											e.target.value,
										)
									}
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
								/>
							</div>
							<div>
								<label
									htmlFor={`inDescDesc-${descIndex}`}
									className="block text-xs font-medium text-gray-600"
								>
									Section Description {descIndex + 1}
								</label>
								<textarea
									id={`inDescDesc-${descIndex}`}
									value={item.description || ""}
									onChange={(e) =>
										handleInDescriptionChange(
											descIndex,
											"description",
											e.target.value,
										)
									}
									rows="2"
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
								/>
							</div>
							<div className="pt-2 border-t border-gray-200 mt-2">
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Gallery Image URLs (Section {descIndex + 1})
								</label>
								{(item.ImagesUrl || []).map((url, imgIndex) => (
									<div key={imgIndex} className="flex items-center gap-2 mb-1">
										<input
											type="url"
											value={url || ""}
											onChange={(e) =>
												handleImageUrlChange(
													descIndex,
													imgIndex,
													e.target.value,
												)
											}
											placeholder="https://example.com/gallery.jpg"
											className="flex-grow border border-gray-300 rounded-md shadow-sm p-1 text-xs"
										/>
										<button
											type="button"
											onClick={() => openFileManager(descIndex, imgIndex)}
											className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
											title="Select Image"
										>
											Select
										</button>
										<button
											type="button"
											onClick={() => removeImageUrl(descIndex, imgIndex)}
											className="text-red-500 hover:text-red-700 text-xs p-0.5 leading-none"
											aria-label={`Remove image ${imgIndex + 1}`}
										>
											Remove
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={() => addImageUrl(descIndex)}
									className="mt-1 px-2 py-1 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-100 text-xs"
								>
									+ Add Image URL
								</button>
							</div>
						</div>
					))}
					<button
						type="button"
						onClick={addInDescriptionItem}
						className="mt-2 px-3 py-1.5 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-100 text-sm"
					>
						+ Add Section
					</button>
				</div>

				<div className="flex justify-end gap-3 pt-4 border-t">
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						className={`px-4 py-2 rounded text-white text-sm ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}
					>
						{isSubmitting
							? "Saving..."
							: initialData
								? "Update Card"
								: "Add Card"}
					</button>
				</div>
			</form>

			{isFileManagerOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] max-h-[700px] flex flex-col">
						<div className="flex justify-between items-center p-4 border-b">
							<h4 className="text-lg font-semibold">Select Image</h4>
							<button
								onClick={() => setIsFileManagerOpen(false)}
								className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
								aria-label="Close"
							>
								&times;
							</button>
						</div>
						<div className="flex-grow overflow-y-auto">
							<CombinedFileManager onImageSelect={handleImageSelected} />
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export default function CardManagement() {
	const queryClient = useQueryClient();
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingCard, setEditingCard] = useState(null);
	const [generalError, setGeneralError] = useState(null);

	const {
		data: cards = [],
		isLoading,
		isError,
		error: fetchError,
	} = useQuery({
		queryKey: ["cards"],
		queryFn: fetchCards,
	});

	const handleMutationSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ["cards"] });
		setIsFormOpen(false);
		setEditingCard(null);
		setGeneralError(null);
	};

	const handleMutationError = (error) => {
		console.error("Mutation error:", error);
		setGeneralError(error.message || "An error occurred.");
	};

	const createMutation = useMutation({
		mutationFn: createCard,
		onSuccess: handleMutationSuccess,
		onError: handleMutationError,
	});
	const updateMutation = useMutation({
		mutationFn: updateCard,
		onSuccess: handleMutationSuccess,
		onError: handleMutationError,
	});
	const deleteMutation = useMutation({
		mutationFn: deleteCard,
		onSuccess: handleMutationSuccess,
		onError: handleMutationError,
	});

	const handleAddClick = () => {
		setEditingCard(null);
		setIsFormOpen(true);
		setGeneralError(null);
	};

	const handleEditClick = (card) => {
		setEditingCard(card);
		setIsFormOpen(true);
		setGeneralError(null);
	};

	const handleDeleteClick = (cardId) => {
		if (window.confirm(`Are you sure you want to delete card ID ${cardId}?`)) {
			setGeneralError(null);
			deleteMutation.mutate(cardId);
		}
	};

	const handleFormSubmit = (formData) => {
		setGeneralError(null);
		if (editingCard) {
			updateMutation.mutate({ ...formData, id: editingCard.id });
		} else {
			createMutation.mutate(formData);
		}
	};

	const handleFormClose = () => {
		setIsFormOpen(false);
		setEditingCard(null);
	};

	const isMutating =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	return (
		<div className="bg-gray-50 p-4 rounded border mt-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold text-gray-800">
					Manage Activities/Cards
				</h2>
				<button
					onClick={handleAddClick}
					className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
				>
					Add New Card
				</button>
			</div>

			{generalError && (
				<p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
					Error: {generalError}
				</p>
			)}

			{isFormOpen && (
				<div className="my-6">
					<CardForm
						initialData={editingCard}
						onSubmit={handleFormSubmit}
						onCancel={handleFormClose}
						isSubmitting={createMutation.isPending || updateMutation.isPending}
					/>
				</div>
			)}

			{isLoading && <p>Loading cards...</p>}
			{isError && (
				<p className="text-red-500">
					Error loading cards: {fetchError?.message}
				</p>
			)}

			{!isLoading && !isError && (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-100">
							<tr>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									ID
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Title
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Date
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Time
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Location
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									BG Color
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{cards.length === 0 && (
								<tr>
									<td colSpan="7" className="text-center py-4 text-gray-500">
										No cards found.
									</td>
								</tr>
							)}
							{cards.map((card) => (
								<tr key={card.id}>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{card.id}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
										{card.title}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{card.date}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{card.time}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{card.location}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{card.bgColor}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
										<button
											onClick={() => handleEditClick(card)}
											disabled={isMutating}
											className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
										>
											Edit
										</button>
										<button
											onClick={() => handleDeleteClick(card.id)}
											disabled={isMutating}
											className="text-red-600 hover:text-red-900 disabled:opacity-50"
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
