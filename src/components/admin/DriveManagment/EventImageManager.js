"use client";

import {
	faArrowLeft,
	faChevronLeft,
	faChevronRight,
	faExclamationTriangle,
	faFolder,
	faPlus,
	faSpinner,
	faTrashAlt,
	faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_FETCHPICTURE_URL;
const ITEMS_PER_PAGE = 48;

const fetchApiItems = async (channelName = null) => {
	if (!API_BASE_URL) {
		throw new Error(
			"API base URL not configured (NEXT_PUBLIC_FETCHPICTURE_URL).",
		);
	}
	const url = channelName
		? `${API_BASE_URL}/assets/${encodeURIComponent(channelName)}/`
		: `${API_BASE_URL}/assets/`;
	const response = await fetch(url);
	if (!response.ok) {
		let errorData;
		try {
			errorData = await response.json();
		} catch (parseError) {
			throw new Error(
				`Failed to fetch: ${response.status} ${response.statusText}`,
			);
		}
		throw new Error(
			errorData?.error ||
				errorData?.message ||
				`Failed to fetch: ${response.status} ${response.statusText}`,
		);
	}
	const data = await response.json();
	if (channelName) {
		if (Array.isArray(data)) {
			return {
				type: "imageList",
				channel: channelName,
				images: data.map((imgObj) => ({
					url: imgObj.url,
					websiteUrl: imgObj.websiteUrl,
					orientation: imgObj.orientation,
					name: imgObj.url
						? imgObj.url.substring(imgObj.url.lastIndexOf("/") + 1)
						: "unknown",
				})),
			};
		} else {
			console.error("Unexpected data format for image list:", data);
			return { type: "imageList", channel: channelName, images: [] };
		}
	} else {
		return { type: "channelList", channels: data.channels || [] };
	}
};

const createChannel = async (channelName) => {
	if (!API_BASE_URL) throw new Error("API base URL not configured.");
	const response = await fetch(`${API_BASE_URL}/assets/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ channelName }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error ||
				errorData.message ||
				`Failed to create channel: ${response.statusText}`,
		);
	}
	return response.json();
};

const uploadImages = async ({ channelName, files }) => {
	if (!API_BASE_URL) throw new Error("API base URL not configured.");
	if (!channelName) throw new Error("Channel name is required for upload.");
	if (!files || files.length === 0)
		throw new Error("No files selected for upload.");
	const formData = new FormData();
	for (const file of files) {
		formData.append("images", file);
	}
	const response = await fetch(
		`${API_BASE_URL}/assets/${encodeURIComponent(channelName)}/upload`,
		{ method: "POST", body: formData },
	);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error ||
				errorData.message ||
				`Failed to upload images: ${response.statusText}`,
		);
	}
	return response.json();
};

const deleteImageApi = async ({ channelName, imageUrl }) => {
	if (!API_BASE_URL) throw new Error("API base URL not configured.");
	if (!channelName) throw new Error("Channel name is required for deletion.");
	if (!imageUrl) throw new Error("Image URL is required for deletion.");
	const response = await fetch(
		`${API_BASE_URL}/assets/${encodeURIComponent(channelName)}/images`,
		{
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ imageUrl }),
		},
	);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error ||
				errorData.message ||
				`Failed to delete image: ${response.statusText}`,
		);
	}
	return response.json();
};

const overlayVariants = {
	hidden: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
	visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
};

export function EventImageManager({ onImageSelect }) {
	const [currentChannel, setCurrentChannel] = useState(null);
	const [copiedUrl, setCopiedUrl] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [activeView, setActiveView] = useState("website");
	const queryClient = useQueryClient();
	const [newChannelName, setNewChannelName] = useState("");
	const [filesToUpload, setFilesToUpload] = useState(null);
	const [uploadError, setUploadError] = useState(null);
	const [createError, setCreateError] = useState(null);
	const [deleteError, setDeleteError] = useState(null);
	const [deletingImage, setDeletingImage] = useState(null);
	const fileInputRef = useRef(null);

	const {
		data: queryData,
		isLoading,
		isFetching,
		error: queryError,
		isError: isQueryError,
	} = useQuery({
		queryKey: ["eventImages", currentChannel || "root"],
		queryFn: () => fetchApiItems(currentChannel),
		keepPreviousData: true,
	});

	const createChannelMutation = useMutation({
		mutationFn: createChannel,
		onSuccess: () => {
			setNewChannelName("");
			setCreateError(null);
			queryClient.invalidateQueries({ queryKey: ["eventImages", "root"] });
			alert("Channel created successfully!");
		},
		onError: (error) => {
			setCreateError(error.message || "Failed to create channel.");
		},
	});

	const uploadImagesMutation = useMutation({
		mutationFn: uploadImages,
		onSuccess: () => {
			setFilesToUpload(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
			setUploadError(null);
			queryClient.invalidateQueries({
				queryKey: ["eventImages", currentChannel],
			});
			alert("Images uploaded successfully!");
		},
		onError: (error) => {
			setUploadError(error.message || "Failed to upload images.");
		},
	});

	const deleteImageMutation = useMutation({
		mutationFn: deleteImageApi,
		onSuccess: () => {
			setDeleteError(null);
			setDeletingImage(null);
			queryClient.invalidateQueries({
				queryKey: ["eventImages", currentChannel],
			});
			alert("Image deleted successfully!");
		},
		onError: (error) => {
			setDeleteError(
				`Failed to delete image: ${error.message || "Unknown error"}`,
			);
			setDeletingImage(null);
		},
	});

	useEffect(() => {
		setCurrentPage(1);
		setDeleteError(null);
		if (currentChannel) {
			setActiveView("website");
		}
	}, [currentChannel]);

	const prefetchChannel = (channelName) => {
		if (!channelName) return;
		queryClient.prefetchQuery({
			queryKey: ["eventImages", channelName],
			queryFn: () => fetchApiItems(channelName),
			staleTime: 60 * 1000,
		});
	};

	const handleItemClick = (item, itemType) => {
		if (itemType === "channel") {
			setCurrentChannel(item);
		} else if (itemType === "image") {
			const urlToUse =
				activeView === "website" ? item.websiteUrl || item.url : item.url;
			if (urlToUse) {
				if (typeof onImageSelect === "function") {
					onImageSelect(urlToUse);
				} else {
					navigator.clipboard
						.writeText(urlToUse)
						.then(() => {
							setCopiedUrl(urlToUse);
							setTimeout(() => setCopiedUrl(null), 2000);
						})
						.catch((err) => alert("Failed to copy URL."));
				}
			} else {
				alert("No URL available for this image.");
			}
		}
	};

	const handleDeleteImageClick = (imageUrl) => {
		if (!currentChannel) return;
		if (
			window.confirm(
				`Are you sure you want to delete this image?\n${imageUrl.substring(
					imageUrl.lastIndexOf("/") + 1,
				)}`,
			)
		) {
			setDeleteError(null);
			setDeletingImage(imageUrl);
			deleteImageMutation.mutate({ channelName: currentChannel, imageUrl });
		}
	};

	const handleBackClick = () => {
		setCurrentChannel(null);
	};

	const getPaginatedData = () => {
		if (!queryData) return { items: [], totalPages: 0 };
		let itemsToPaginate = [];
		if (queryData.type === "channelList") {
			itemsToPaginate = queryData.channels;
		} else if (queryData.type === "imageList") {
			itemsToPaginate = queryData.images;
		}
		const totalItems = itemsToPaginate.length;
		const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;
		const paginatedItems = itemsToPaginate.slice(startIndex, endIndex);
		return { items: paginatedItems, totalPages };
	};

	const { items: displayedItems, totalPages } = getPaginatedData();
	const handlePageChange = (newPage) => {
		if (newPage >= 1 && newPage <= totalPages) {
			setCurrentPage(newPage);
		}
	};
	const handleCreateChannelSubmit = (e) => {
		e.preventDefault();
		if (!newChannelName.trim()) {
			setCreateError("Channel name cannot be empty.");
			return;
		}
		setCreateError(null);
		const sanitizedName = newChannelName
			.trim()
			.replace(/[^a-zA-Z0-9-_]/g, "-")
			.toLowerCase();
		if (!sanitizedName) {
			setCreateError("Invalid channel name after sanitization.");
			return;
		}
		createChannelMutation.mutate(sanitizedName);
	};
	const handleFileSelect = (e) => {
		setFilesToUpload(e.target.files);
		setUploadError(null);
	};
	const handleUploadSubmit = () => {
		if (!filesToUpload || filesToUpload.length === 0) {
			setUploadError("Please select files to upload.");
			return;
		}
		if (!currentChannel) {
			setUploadError("Cannot upload without selecting a channel first.");
			return;
		}
		setUploadError(null);
		uploadImagesMutation.mutate({
			channelName: currentChannel,
			files: filesToUpload,
		});
	};

	if (!API_BASE_URL) {
		return (
			<div className="p-4 text-red-600">
				Error: NEXT_PUBLIC_FETCHPICTURE_URL environment variable is not set.
			</div>
		);
	}

	return (
		<div className="p-4 font-sans">
			<div className="mb-4 flex items-center justify-between flex-wrap gap-y-2">
				<div className="flex items-center gap-4">
					{currentChannel && (
						<button
							onClick={handleBackClick}
							disabled={isFetching}
							className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
						>
							<FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Back
						</button>
					)}
					{isFetching && <FontAwesomeIcon icon={faSpinner} spin />}
					{currentChannel && !isFetching && (
						<span className="font-semibold text-gray-700">
							Channel: {currentChannel}
						</span>
					)}
				</div>
				{totalPages > 1 && (
					<div className="flex items-center gap-2">
						<button
							onClick={() => handlePageChange(currentPage - 1)}
							disabled={currentPage === 1 || isFetching}
							className="p-1 disabled:opacity-50 text-gray-600 hover:text-black"
							aria-label="Previous Page"
						>
							<FontAwesomeIcon icon={faChevronLeft} />
						</button>
						<span className="text-sm text-gray-700">
							Page {currentPage} of {totalPages}
						</span>
						<button
							onClick={() => handlePageChange(currentPage + 1)}
							disabled={currentPage === totalPages || isFetching}
							className="p-1 disabled:opacity-50 text-gray-600 hover:text-black"
							aria-label="Next Page"
						>
							<FontAwesomeIcon icon={faChevronRight} />
						</button>
					</div>
				)}
			</div>

			{!currentChannel && (
				<form
					onSubmit={handleCreateChannelSubmit}
					className="mb-6 p-4 border rounded bg-gray-50 flex items-end gap-3"
				>
					<div className="flex-grow">
						<label
							htmlFor="newChannelName"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							New Channel Name
						</label>
						<input
							type="text"
							id="newChannelName"
							value={newChannelName}
							onChange={(e) => setNewChannelName(e.target.value)}
							placeholder="e.g., event-photos-2024"
							className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
							disabled={createChannelMutation.isPending}
						/>
					</div>
					<button
						type="submit"
						disabled={createChannelMutation.isPending || !newChannelName.trim()}
						className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{createChannelMutation.isPending ? (
							<FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
						) : (
							<FontAwesomeIcon icon={faPlus} className="mr-2" />
						)}{" "}
						Create
					</button>
					{createError && (
						<p className="text-red-600 text-xs mt-1 self-center">
							{createError}
						</p>
					)}
				</form>
			)}

			{currentChannel && (
				<div className="mb-6 p-4 border rounded bg-gray-50 space-y-3">
					<h4 className="text-md font-medium text-gray-700">
						Upload Images to "{currentChannel}"
					</h4>
					<div>
						<label
							htmlFor="imageUpload"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Select Images
						</label>
						<input
							type="file"
							id="imageUpload"
							ref={fileInputRef}
							multiple
							accept="image/jpeg, image/png, image/gif, image/webp"
							onChange={handleFileSelect}
							className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
							disabled={uploadImagesMutation.isPending}
						/>
					</div>
					<button
						onClick={handleUploadSubmit}
						disabled={
							uploadImagesMutation.isPending ||
							!filesToUpload ||
							filesToUpload.length === 0
						}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{uploadImagesMutation.isPending ? (
							<FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
						) : (
							<FontAwesomeIcon icon={faUpload} className="mr-2" />
						)}{" "}
						Upload {filesToUpload ? `(${filesToUpload.length})` : ""}
					</button>
					{uploadError && (
						<p className="text-red-600 text-xs mt-1">{uploadError}</p>
					)}
				</div>
			)}

			{isLoading && !isFetching && <div>Loading...</div>}
			{isQueryError && !isFetching && (
				<div className="text-red-600">
					Error loading data: {queryError?.message || "Unknown error"}
				</div>
			)}
			{deleteError && (
				<div className="my-2 p-2 text-sm text-red-700 bg-red-100 border border-red-400 rounded">
					{deleteError}
				</div>
			)}

			{!isLoading && !isQueryError && queryData && (
				<>
					{queryData.type === "imageList" && (
						<div className="mb-4 p-1 bg-gray-200 rounded-lg inline-flex">
							<button
								onClick={() => setActiveView("website")}
								className={`px-4 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
									activeView === "website"
										? "bg-blue-600 text-white shadow"
										: "text-gray-700 hover:bg-gray-300"
								}`}
							>
								Website Optimized
							</button>
							<button
								onClick={() => setActiveView("original")}
								className={`px-4 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
									activeView === "original"
										? "bg-blue-600 text-white shadow"
										: "text-gray-700 hover:bg-gray-300"
								}`}
							>
								Originals
							</button>
						</div>
					)}

					<div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
						{queryData.type === "channelList" && (
							<>
								{displayedItems.length === 0 && !isLoading && (
									<div>No channels found.</div>
								)}
								{displayedItems.map((channelName) => (
									<div
										key={channelName}
										onClick={() => handleItemClick(channelName, "channel")}
										onMouseEnter={() => prefetchChannel(channelName)}
										className={`border border-gray-300 rounded p-2 text-center cursor-pointer overflow-hidden relative min-h-[150px] bg-gray-100 flex flex-col justify-between items-center transition-transform duration-200 ease-in-out transform motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md`}
									>
										<FontAwesomeIcon
											icon={faFolder}
											className="text-5xl text-gray-500 mt-4 mb-2"
										/>
										<span
											className="text-sm break-words block mt-auto w-full"
											title={channelName}
										>
											{channelName.length > 25
												? channelName.substring(0, 22) + "..."
												: channelName}
										</span>
									</div>
								))}
							</>
						)}
						{queryData.type === "imageList" && (
							<>
								{displayedItems.length === 0 && !isLoading && (
									<div>This channel is empty.</div>
								)}
								{displayedItems.map((image) => {
									const urlForAction =
										activeView === "website"
											? image.websiteUrl || image.url
											: image.url;
									const showCopiedOverlay =
										!onImageSelect && copiedUrl === urlForAction;
									const isBeingDeleted = deletingImage === image.url;
									return (
										<div
											key={image.url}
											className={`border border-gray-300 rounded p-2 text-center overflow-hidden relative min-h-[150px] bg-white flex flex-col justify-between transition-transform duration-200 ease-in-out transform ${
												isBeingDeleted
													? "opacity-50"
													: "motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md"
											}`}
										>
											<div
												className={`flex-grow flex items-center justify-center mb-2 ${
													onImageSelect ? "cursor-pointer" : ""
												}`}
												onClick={() =>
													!isBeingDeleted && handleItemClick(image, "image")
												}
											>
												<img
													src={image.websiteUrl || image.url}
													alt={image.name}
													className="max-w-full max-h-[100px] h-auto object-contain block mx-auto"
													loading="lazy"
													onError={(e) => {
														e.target.style.display = "none";
														const errorIcon = document.createElement("span");
														errorIcon.innerHTML = `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="exclamation-triangle" class="svg-inline--fa fa-exclamation-triangle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" style="width: 40px; height: 40px; color: #dc3545;"><path fill="currentColor" d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-60.075-39.993-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.999 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>`;
														if (e.target.parentNode) {
															e.target.parentNode.appendChild(errorIcon);
														}
													}}
												/>
											</div>
											<div className="flex justify-between items-center mt-auto pt-1">
												<span
													className="text-xs break-words text-left flex-1 mr-1"
													title={image.name}
												>
													{image.name.length > 20
														? image.name.substring(0, 18) + "..."
														: image.name}
												</span>
												{!onImageSelect && (
													<button
														onClick={() =>
															!isBeingDeleted &&
															handleDeleteImageClick(image.url)
														}
														disabled={isBeingDeleted}
														className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
														title="Delete Image"
													>
														{isBeingDeleted ? (
															<FontAwesomeIcon
																icon={faSpinner}
																spin
																size="xs"
															/>
														) : (
															<FontAwesomeIcon icon={faTrashAlt} size="xs" />
														)}
													</button>
												)}
											</div>
											<AnimatePresence>
												{showCopiedOverlay && (
													<motion.div
														variants={overlayVariants}
														initial="hidden"
														animate="visible"
														exit="hidden"
														className="absolute inset-0 bg-gray-500/70 text-white flex items-center justify-center text-base font-bold rounded z-10 pointer-events-none"
													>
														URL Copied
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									);
								})}
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default EventImageManager;
