import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { faTrashAlt, faUsersSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQueryClient } from "@tanstack/react-query";
import ColorPicker from "@/components/ColorPicker";

const modalVariants = {
	hidden: { opacity: 0, scale: 0.9 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

const dropdownVariants = {
	hidden: { opacity: 0, y: -10 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
	exit: { opacity: 0, y: -10, transition: { duration: 0.1 } },
};

export default function EditEventModal({
	isOpen,
	onClose,
	eventData,
	editEventMutation,
	deleteEventMutation,
}) {
	const [title, setTitle] = useState("");
	const [date, setDate] = useState(new Date());
	const [description, setDescription] = useState("");
	const [location, setLocation] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [attendees, setAttendees] = useState(false);
	const [cardColor, setCardColor] = useState("bg-white");
	const [isLimitEnabled, setIsLimitEnabled] = useState(false);
	const [limitValue, setLimitValue] = useState(0);
	const [cardEnabled, setCardEnabled] = useState(true);
	const [inDescription, setInDescription] = useState([
		{ title: "", description: "" },
	]);
	const [freezeNotAllowed, setFreezeNotAllowed] = useState(true);
	const [isClosed, setIsClosed] = useState(false);
	const [activeTab, setActiveTab] = useState("main");
	const [error, setError] = useState("");
	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
	const colorPickerRef = useRef(null);
	const queryClient = useQueryClient();

	const queryData = queryClient.getQueryData(["events"]);
	const liveEventData =
		queryData?.find((e) => e.id === eventData?.id) || eventData;

	useEffect(() => {
		const currentData = liveEventData || eventData;
		if (isOpen && currentData) {
			setTitle(currentData.title || "");
			const eventDate = currentData.date
				? new Date(currentData.date)
				: new Date();
			setDate(isNaN(eventDate.getTime()) ? new Date() : eventDate);
			setDescription(currentData.description || "");
			setLocation(currentData.location || "");
			setImageUrl(currentData.imageUrl || "");
			setAttendees(
				typeof currentData.attendees === "boolean"
					? currentData.attendees
					: false,
			);
			setCardColor(currentData.cardColor || "bg-white");
			setIsLimitEnabled(
				typeof currentData.isLimitEnabled === "boolean"
					? currentData.isLimitEnabled
					: false,
			);
			setLimitValue(
				typeof currentData.attendanceLimit === "number"
					? currentData.attendanceLimit
					: 0,
			);
			setCardEnabled(
				typeof currentData.cardEnabled === "boolean"
					? currentData.cardEnabled
					: true,
			);
			setInDescription(
				currentData.inDescription && currentData.inDescription.length > 0
					? currentData.inDescription
					: [{ title: "", description: "" }],
			);
			setFreezeNotAllowed(
				typeof currentData.freezenotallow === "boolean"
					? currentData.freezenotallow
					: true,
			);
			setIsClosed(
				typeof currentData.closed === "boolean" ? currentData.closed : false,
			);
			setError("");
			setActiveTab("main");
		}
		setIsColorPickerOpen(false);
	}, [isOpen, liveEventData, eventData]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				colorPickerRef.current &&
				!colorPickerRef.current.contains(event.target)
			) {
				setIsColorPickerOpen(false);
			}
		};
		if (isColorPickerOpen)
			document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isColorPickerOpen]);

	const handleInDescriptionChange = (index, field, value) => {
		const updatedDetails = [...inDescription];
		updatedDetails[index][field] = value;
		setInDescription(updatedDetails);
	};

	const addInDescriptionItem = () => {
		setInDescription([...inDescription, { title: "", description: "" }]);
	};

	const removeInDescriptionItem = (index) => {
		if (inDescription.length <= 1) return;
		const updatedDetails = inDescription.filter((_, i) => i !== index);
		setInDescription(updatedDetails);
	};

	const handleSave = (resetAttendeesFlag = false) => {
		setError("");
		const trimmedTitle = title.trim();
		const trimmedDesc = description.trim();
		const trimmedLocation = location.trim();
		if (
			!trimmedTitle ||
			!date ||
			isNaN(date?.getTime()) ||
			!trimmedDesc ||
			!trimmedLocation
		) {
			setError(
				"Please fill in required fields (Title, Date, Description, Location) with valid values.",
			);
			setActiveTab("main");
			return;
		}
		if (!liveEventData?.id) {
			setError("Cannot save event: Original event data is missing.");
			return;
		}
		if (isLimitEnabled && (!Number.isInteger(limitValue) || limitValue <= 0)) {
			setError(
				"Attendance limit must be a positive whole number when enabled.",
			);
			setActiveTab("main");
			return;
		}

		const finalInDescription = inDescription.filter(
			(item) => item.title?.trim() || item.description?.trim(),
		);
		const updatedEventData = {
			id: liveEventData.id,
			title: trimmedTitle,
			date: date.toISOString(),
			description: trimmedDesc,
			location: trimmedLocation,
			imageUrl,
			attendees,
			cardColor,
			isLimitEnabled,
			attendanceLimit: isLimitEnabled ? limitValue : null,
			cardEnabled,
			resetAttendees: resetAttendeesFlag,
			inDescription: finalInDescription,
			freezenotallow: freezeNotAllowed,
			closed: isClosed,
		};

		editEventMutation.mutate(updatedEventData, {
			onError: (apiError) => {
				setError(apiError.message || "Failed to update event.");
			},
		});
	};

	const handleResetAttendeesClick = () => {
		if (!liveEventData?.id) {
			setError("Cannot reset attendees: Event data is missing.");
			return;
		}
		if (
			confirm(
				"Are you sure you want to reset the attendee list for this event? This will remove all registered attendees and waiting list users and cannot be undone.",
			)
		) {
			handleSave(true);
		}
	};

	const handleDeleteClick = () => {
		if (!liveEventData?.id || !deleteEventMutation) return;
		if (
			confirm(
				`Are you sure you want to permanently delete the event "${liveEventData.title}"? This cannot be undone.`,
			)
		) {
			deleteEventMutation.mutate(liveEventData.id, {
				onSuccess: () => {
					onClose();
				},
				onError: (apiError) => {
					setError(apiError.message || "Failed to delete event.");
				},
			});
		}
	};

	const handleColorSelect = (selectedColorClass) => {
		setCardColor(selectedColorClass);
		setIsColorPickerOpen(false);
	};

	if (!isOpen || !liveEventData) return null;

	const isMutating =
		editEventMutation.isPending || deleteEventMutation?.isPending;

	return (
		<motion.div
			className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-50 flex justify-center items-center p-4"
			initial="hidden"
			animate="visible"
			exit="exit"
			variants={modalVariants}
			onClick={onClose}
		>
			<motion.div
				className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full relative max-h-[90vh]"
				onClick={(e) => e.stopPropagation()}
				variants={modalVariants}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-20 bg-white rounded-full p-1"
					aria-label="Close modal"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<div className="flex border-b">
					<button
						type="button"
						onClick={() => setActiveTab("main")}
						className={`flex-1 py-2 px-4 text-center text-sm font-medium focus:outline-none ${activeTab === "main" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"}`}
					>
						Main Card
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("details")}
						className={`flex-1 py-2 px-4 text-center text-sm font-medium focus:outline-none ${activeTab === "details" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"}`}
					>
						More Details
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("danger")}
						className={`flex-1 py-2 px-4 text-center text-sm font-medium focus:outline-none ${activeTab === "danger" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"}`}
					>
						Danger Zone
					</button>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSave(false);
					}}
					className="overflow-y-auto max-h-[calc(90vh-160px)]"
				>
					{error && (
						<p className="text-red-500 text-sm p-4 mb-0 bg-red-50">{error}</p>
					)}

					{activeTab === "main" && (
						<div className="p-4 md:p-6 space-y-4">
							<div>
								<label
									htmlFor="edit-title"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Title *
								</label>
								<input
									type="text"
									id="edit-title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="edit-date"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Date & Time *
								</label>
								<ReactDatePicker
									id="edit-date"
									selected={date}
									onChange={(d) => setDate(d)}
									showTimeSelect
									dateFormat="Pp"
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
									wrapperClassName="w-full"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="edit-description"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Description *
								</label>
								<textarea
									id="edit-description"
									rows="3"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
									required
								></textarea>
							</div>
							<div>
								<label
									htmlFor="edit-location"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Location *
								</label>
								<input
									type="text"
									id="edit-location"
									value={location}
									onChange={(e) => setLocation(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="edit-imageUrl"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Image URL (Optional)
								</label>
								<input
									type="url"
									id="edit-imageUrl"
									value={imageUrl}
									onChange={(e) => setImageUrl(e.target.value)}
									placeholder="https://example.com/image.jpg"
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
								/>
							</div>
							<div className="relative" ref={colorPickerRef}>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Card Color (Optional)
								</label>
								<button
									type="button"
									onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
								>
									<span className="flex items-center">
										<span
											className={`inline-block w-5 h-5 rounded mr-2 border border-gray-400 ${cardColor}`}
										></span>
										{cardColor}
									</span>
									<svg
										className={`w-5 h-5 text-gray-400 transform transition-transform ${isColorPickerOpen ? "rotate-180" : ""}`}
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
								<AnimatePresence>
									{isColorPickerOpen && (
										<motion.div
											initial="hidden"
											animate="visible"
											exit="exit"
											variants={dropdownVariants}
											className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
										>
											<ColorPicker onSelectColor={handleColorSelect} />
										</motion.div>
									)}
								</AnimatePresence>
							</div>
							<div className="flex items-center pt-2 border-t">
								<input
									id="edit-cardEnabled"
									type="checkbox"
									checked={cardEnabled}
									onChange={(e) => setCardEnabled(e.target.checked)}
									className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="edit-cardEnabled"
									className="ml-2 block text-sm font-medium text-gray-900"
								>
									Card Enabled (Visible to Users)
								</label>
							</div>
							<div className="space-y-3 pt-2 border-t">
								<div className="flex items-center">
									<input
										id="edit-attendees"
										type="checkbox"
										checked={attendees}
										onChange={(e) => setAttendees(e.target.checked)}
										className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
									/>
									<label
										htmlFor="edit-attendees"
										className="ml-2 block text-sm text-gray-900"
									>
										Allow Attendance Tracking
									</label>
								</div>
								{attendees && (
									<div className="pl-6 space-y-2">
										<div className="flex items-center">
											<input
												id="edit-limit-enabled"
												type="checkbox"
												checked={isLimitEnabled}
												onChange={(e) => setIsLimitEnabled(e.target.checked)}
												className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
											/>
											<label
												htmlFor="edit-limit-enabled"
												className="ml-2 block text-sm text-gray-900"
											>
												Enable Attendance Limit
											</label>
										</div>
										{isLimitEnabled && (
											<div>
												<label
													htmlFor="edit-limit-value"
													className="block text-sm font-medium text-gray-700 mb-1"
												>
													Limit Value *
												</label>
												<input
													type="number"
													id="edit-limit-value"
													value={limitValue}
													onChange={(e) =>
														setLimitValue(parseInt(e.target.value, 10) || 0)
													}
													min="1"
													className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
													required={isLimitEnabled}
												/>
											</div>
										)}
									</div>
								)}
							</div>
							<div className="flex items-center pt-2 border-t">
								<input
									id="edit-freezeNotAllowed"
									type="checkbox"
									checked={freezeNotAllowed}
									onChange={(e) => setFreezeNotAllowed(e.target.checked)}
									className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="edit-freezeNotAllowed"
									className="ml-2 block text-sm font-medium text-gray-900"
								>
									Disallow Frozen Users (Enforce Freeze)
								</label>
							</div>
							<div className="flex items-center pt-2 border-t">
								<input
									id="edit-isClosed"
									type="checkbox"
									checked={isClosed}
									onChange={(e) => setIsClosed(e.target.checked)}
									className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="edit-isClosed"
									className="ml-2 block text-sm font-medium text-gray-900"
								>
									Close Event (Prevent Unattending)
								</label>
							</div>
						</div>
					)}

					{activeTab === "details" && (
						<div className="p-4 md:p-6 space-y-4">
							<h3 className="text-lg font-medium text-gray-800 mb-3">
								Detailed Information Sections
							</h3>
							{inDescription.map((item, index) => (
								<div
									key={index}
									className="p-3 border rounded-md space-y-2 relative bg-gray-50"
								>
									<label
										htmlFor={`edit-detail-title-${index}`}
										className="block text-sm font-medium text-gray-700"
									>
										Section Title (Optional)
									</label>
									<input
										type="text"
										id={`edit-detail-title-${index}`}
										placeholder="e.g., Schedule, What to Bring"
										value={item.title}
										onChange={(e) =>
											handleInDescriptionChange(index, "title", e.target.value)
										}
										className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
									/>
									<label
										htmlFor={`edit-detail-text-${index}`}
										className="block text-sm font-medium text-gray-700"
									>
										Section Text *
									</label>
									<textarea
										id={`edit-detail-text-${index}`}
										rows="3"
										placeholder="Enter details for this section..."
										value={item.description}
										onChange={(e) =>
											handleInDescriptionChange(
												index,
												"description",
												e.target.value,
											)
										}
										className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
										required={!item.title}
									></textarea>
									{inDescription.length > 1 && (
										<button
											type="button"
											onClick={() => removeInDescriptionItem(index)}
											className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 bg-white rounded-full"
											aria-label="Remove section"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={2}
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
										</button>
									)}
								</div>
							))}
							<button
								type="button"
								onClick={addInDescriptionItem}
								className="mt-2 px-3 py-1.5 border border-dashed border-gray-400 text-sm text-gray-600 rounded hover:bg-gray-100"
							>
								+ Add Section
							</button>
						</div>
					)}

					{activeTab === "danger" && (
						<div className="p-4 md:p-6 space-y-6">
							<div>
								<h3 className="text-lg font-medium text-red-700 mb-2">
									Reset Attendee List
								</h3>
								<p className="text-sm text-gray-600 mb-3">
									This will permanently remove all registered attendees and
									waiting list users from this event. This action cannot be
									undone.
								</p>
								<button
									type="button"
									onClick={handleResetAttendeesClick}
									className={`w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-semibold flex items-center justify-center gap-2 ${isMutating ? "opacity-50 cursor-not-allowed" : ""}`}
									disabled={isMutating}
								>
									<FontAwesomeIcon icon={faUsersSlash} /> Reset Attendee List
								</button>
							</div>
							<div>
								<h3 className="text-lg font-medium text-red-700 mb-2">
									Delete Event
								</h3>
								<p className="text-sm text-gray-600 mb-3">
									This will permanently delete the event and all associated
									attendee data. This action cannot be undone.
								</p>
								<button
									type="button"
									onClick={handleDeleteClick}
									className={`w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2 ${isMutating ? "opacity-50 cursor-not-allowed" : ""}`}
									disabled={isMutating}
								>
									<FontAwesomeIcon icon={faTrashAlt} /> Delete This Event
								</button>
							</div>
						</div>
					)}

					{activeTab !== "danger" && (
						<div className="p-4 md:px-6 pb-4 flex justify-end space-x-3 border-t mt-0 bg-gray-50">
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
								disabled={isMutating}
							>
								Cancel
							</button>
							<button
								type="submit"
								className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition ${isMutating ? "opacity-50 cursor-not-allowed" : ""}`}
								disabled={isMutating}
							>
								{editEventMutation.isPending ? "Saving..." : "Save Changes"}
							</button>
						</div>
					)}
				</form>
			</motion.div>
		</motion.div>
	);
}
