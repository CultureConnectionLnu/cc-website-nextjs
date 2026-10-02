// src/components/Events/EventManageModal.js
import React, {
	useState,
	useMemo,
	useEffect,
	useRef,
	useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faXmark,
	faQrcode,
	faUsers,
	faCheck,
	faUserSlash,
	faSnowflake,
	faUserCheck,
	faUserTimes,
	faEdit,
	faSave,
	faTrashAlt,
	faUsersSlash,
} from "@fortawesome/free-solid-svg-icons";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ColorPicker from "@/components/ColorPicker";
import toast from "react-hot-toast";

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

function EventManageModal({
	isOpen,
	onClose,
	eventData,
	isAdminOrCommittee,
	verifyAttendeeMutation,
	removeAttendeeMutation,
	freezeUnverifiedMutation,
	editEventMutation,
	deleteEventMutation,
}) {
	const [activeTab, setActiveTab] = useState("qr");
	const [searchTerm, setSearchTerm] = useState("");
	const [attendeeActionStatus, setAttendeeActionStatus] = useState({});
	const [optimisticAttendeeOverrides, setOptimisticAttendeeOverrides] =
		useState({});
	const [isQrFullScreen, setIsQrFullScreen] = useState(false);

	const [title, setTitle] = useState("");
	const [date, setDate] = useState(new Date());
	const [description, setDescription] = useState("");
	const [location, setLocation] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [attendeesEnabled, setAttendeesEnabled] = useState(false);
	const [cardColor, setCardColor] = useState("bg-white");
	const [isLimitEnabled, setIsLimitEnabled] = useState(false);
	const [limitValue, setLimitValue] = useState(0);
	const [cardEnabled, setCardEnabled] = useState(true);
	const [inDescription, setInDescription] = useState([
		{ title: "", description: "" },
	]);
	const [freezeNotAllowed, setFreezeNotAllowed] = useState(true);
	const [isClosed, setIsClosed] = useState(false);
	const [editError, setEditError] = useState("");
	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
	const colorPickerRef = useRef(null);

	const eventId = eventData?.id;
	const eventTitle = eventData?.title;
	const isAttendance = eventData?.attendees === true;

	useEffect(() => {
		if (isOpen && eventData) {
			setTitle(eventData.title || "");
			const eventDate = eventData.date ? new Date(eventData.date) : new Date();
			setDate(isNaN(eventDate.getTime()) ? new Date() : eventDate);
			setDescription(eventData.description || "");
			setLocation(eventData.location || "");
			setImageUrl(eventData.imageUrl || "");
			setAttendeesEnabled(
				typeof eventData.attendees === "boolean" ? eventData.attendees : false,
			);
			setCardColor(eventData.cardColor || "bg-white");
			setIsLimitEnabled(
				typeof eventData.isLimitEnabled === "boolean"
					? eventData.isLimitEnabled
					: false,
			);
			setLimitValue(
				typeof eventData.attendanceLimit === "number"
					? eventData.attendanceLimit
					: 0,
			);
			setCardEnabled(
				typeof eventData.cardEnabled === "boolean"
					? eventData.cardEnabled
					: true,
			);
			setInDescription(
				eventData.inDescription && eventData.inDescription.length > 0
					? eventData.inDescription
					: [{ title: "", description: "" }],
			);
			setFreezeNotAllowed(
				typeof eventData.freezenotallow === "boolean"
					? eventData.freezenotallow
					: true,
			);
			setIsClosed(
				typeof eventData.closed === "boolean" ? eventData.closed : false,
			);
			setEditError("");
			setActiveTab("qr");
			setOptimisticAttendeeOverrides({});
		}
		setIsColorPickerOpen(false);
	}, [isOpen, eventData]);

	const qrCodeValue = useMemo(() => {
		if (!eventId) return null;
		return JSON.stringify({
			type: "event_checkin",
			eventId: eventId,
		});
	}, [eventId]);

	const attendeesList = useMemo(
		() => eventData?.attendeeDetails || [],
		[eventData],
	);

	const getDisplayStatus = useCallback(
		(userId) => {
			const override = optimisticAttendeeOverrides[userId];
			if (override) {
				return override;
			}
			const attendee = attendeesList.find((att) => att.userID === userId);
			return (
				attendee || {
					userID: userId,
					waiting: false,
					verified: false,
					fullName: `User (${userId.substring(5)})`,
					primaryEmailAddress: null,
				}
			);
		},
		[attendeesList, optimisticAttendeeOverrides],
	);

	const filteredAttendees = useMemo(() => {
		if (!attendeesList) return [];
		let usersToFilter = attendeesList.map((att) => ({
			...att,
			displayVerified: getDisplayStatus(att.userID).verified,
		}));

		if (!searchTerm) return usersToFilter;
		const lowerSearchTerm = searchTerm.toLowerCase();
		return usersToFilter.filter(
			(att) =>
				att.fullName?.toLowerCase().includes(lowerSearchTerm) ||
				att.userID?.toLowerCase().includes(lowerSearchTerm) ||
				att.primaryEmailAddress?.toLowerCase().includes(lowerSearchTerm),
		);
	}, [attendeesList, searchTerm, getDisplayStatus]);

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

	const handleColorSelect = (selectedColorClass) => {
		setCardColor(selectedColorClass);
		setIsColorPickerOpen(false);
	};

	const handleSave = (resetAttendeesFlag = false) => {
		setEditError("");
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
			setEditError(
				"Please fill in required fields (Title, Date, Description, Location).",
			);
			setActiveTab("edit");
			return;
		}
		if (!eventId) {
			setEditError("Cannot save event: Event ID is missing.");
			return;
		}
		if (isLimitEnabled && (!Number.isInteger(limitValue) || limitValue <= 0)) {
			setEditError("Attendance limit must be a positive whole number.");
			setActiveTab("edit");
			return;
		}

		const finalInDescription = inDescription.filter(
			(item) => item.title?.trim() || item.description?.trim(),
		);
		const updatedEventData = {
			id: eventId,
			title: trimmedTitle,
			date: date.toISOString(),
			description: trimmedDesc,
			location: trimmedLocation,
			imageUrl,
			attendees: attendeesEnabled,
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
				setEditError(apiError.message || "Failed to update event.");
			},
			onSuccess: () => {
				if (resetAttendeesFlag) {
					setOptimisticAttendeeOverrides({});
					toast.success("Attendees reset successfully!");
				} else {
					toast.success("Event updated successfully!");
				}
			},
		});
	};

	const handleResetAttendeesClick = () => {
		if (!eventId) {
			setEditError("Cannot reset attendees: Event ID is missing.");
			return;
		}
		if (
			confirm(
				"Are you sure you want to reset the attendee list? This will remove all registered attendees and waiting list users and cannot be undone.",
			)
		) {
			handleSave(true);
		}
	};

	const handleDeleteClick = () => {
		if (!eventId || !deleteEventMutation) return;
		if (
			confirm(
				`Are you sure you want to permanently delete the event "${title}"? This cannot be undone.`,
			)
		) {
			deleteEventMutation.mutate(eventId, {
				onSuccess: () => {
					onClose();
				},
				onError: (apiError) => {
					setEditError(apiError.message || "Failed to delete event.");
				},
			});
		}
	};

	const handleVerifyToggle = async (attendeeUserId, currentVerifiedStatus) => {
		if (!eventId || !verifyAttendeeMutation || verifyAttendeeMutation.isPending)
			return;

		const currentStatus = getDisplayStatus(attendeeUserId);
		const predictedStatus = {
			...currentStatus,
			verified: !currentVerifiedStatus,
		};

		setOptimisticAttendeeOverrides((prev) => ({
			...prev,
			[attendeeUserId]: predictedStatus,
		}));
		setAttendeeActionStatus((prev) => ({
			...prev,
			[attendeeUserId]: { message: "Processing...", error: false },
		}));

		try {
			await verifyAttendeeMutation.mutateAsync({
				eventId: eventId,
				attendeeUserId: attendeeUserId,
				verified: !currentVerifiedStatus,
			});
			setAttendeeActionStatus((prev) => ({
				...prev,
				[attendeeUserId]: { message: "Status updated.", error: false },
			}));
		} catch (error) {
			console.error("Verify toggle failed:", error);
			setAttendeeActionStatus((prev) => ({
				...prev,
				[attendeeUserId]: {
					message: error.message || "Verification failed.",
					error: true,
				},
			}));
			setOptimisticAttendeeOverrides((prev) => {
				const newState = { ...prev };
				delete newState[attendeeUserId];
				return newState;
			});
		}
	};

	const handleRemove = async (attendeeUserId) => {
		if (!eventId || !removeAttendeeMutation || removeAttendeeMutation.isPending)
			return;

		const currentStatus = getDisplayStatus(attendeeUserId);
		setOptimisticAttendeeOverrides((prev) => ({
			...prev,
			[attendeeUserId]: { ...currentStatus, _removed: true },
		}));
		setAttendeeActionStatus((prev) => ({
			...prev,
			[attendeeUserId]: { message: "Removing...", error: false },
		}));

		try {
			await removeAttendeeMutation.mutateAsync({
				eventId: eventId,
				attendeeUserId: attendeeUserId,
			});
			setAttendeeActionStatus((prev) => ({
				...prev,
				[attendeeUserId]: { message: "Removed.", error: false },
			}));
		} catch (error) {
			console.error("Remove attendee failed:", error);
			setAttendeeActionStatus((prev) => ({
				...prev,
				[attendeeUserId]: {
					message: error.message || "Removal failed.",
					error: true,
				},
			}));
			setOptimisticAttendeeOverrides((prev) => {
				const newState = { ...prev };
				delete newState[attendeeUserId];
				return newState;
			});
		}
	};

	const handleFreeze = async () => {
		if (
			!eventId ||
			!freezeUnverifiedMutation ||
			freezeUnverifiedMutation.isPending
		)
			return;
		if (!confirm("Freeze all currently unverified attendees for this event?"))
			return;
		setAttendeeActionStatus((prev) => ({
			...prev,
			_global: { message: "Freezing...", error: false },
		}));
		try {
			await freezeUnverifiedMutation.mutateAsync({ eventId });
			setAttendeeActionStatus((prev) => ({
				...prev,
				_global: { message: "Freeze request sent.", error: false },
			}));
		} catch (error) {
			console.error("Freeze failed:", error);
			setAttendeeActionStatus((prev) => ({
				...prev,
				_global: { message: error.message || "Freeze failed.", error: true },
			}));
		}
	};

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

	useEffect(() => {
		setOptimisticAttendeeOverrides({});
	}, [eventData]);

	useEffect(() => {
		if (!isOpen) {
			setActiveTab("qr");
			setSearchTerm("");
			setAttendeeActionStatus({});
			setOptimisticAttendeeOverrides({});
			setIsQrFullScreen(false);
		} else {
			setActiveTab("qr");
		}
	}, [isOpen]);

	const hasUnverified = attendeesList.some(
		(att) => !getDisplayStatus(att.userID).verified,
	);
	const isMutatingAttendees =
		verifyAttendeeMutation.isPending ||
		removeAttendeeMutation.isPending ||
		freezeUnverifiedMutation.isPending;
	const isMutatingEvent =
		editEventMutation.isPending || deleteEventMutation?.isPending;

	const confirmedCount = attendeesList.filter(
		(att) =>
			!getDisplayStatus(att.userID).waiting &&
			!optimisticAttendeeOverrides[att.userID]?._removed,
	).length;
	const waitingCount = attendeesList.filter(
		(att) =>
			getDisplayStatus(att.userID).waiting &&
			!optimisticAttendeeOverrides[att.userID]?._removed,
	).length;

	return (
		<>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4"
						onClick={onClose}
					>
						<motion.div
							initial="hidden"
							animate="visible"
							exit="exit"
							variants={modalVariants}
							transition={{ type: "spring", stiffness: 300, damping: 30 }}
							className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden p-0 relative border-2 border-gray-300 flex flex-col"
							onClick={(e) => e.stopPropagation()}
						>
							<button
								onClick={onClose}
								className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors z-20 h-7 w-7 flex items-center justify-center bg-white/50 rounded-full"
								aria-label="Close modal"
							>
								<FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
							</button>

							<div className="p-5 border-b border-gray-300 bg-white/30">
								<h2 className="text-xl font-bold text-center mb-3 text-gray-800">
									Manage Event: {eventTitle || "Event"}
								</h2>
								<div className="flex justify-center border-b border-gray-300">
									<button
										onClick={() => setActiveTab("qr")}
										className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
											activeTab === "qr"
												? "border-indigo-500 text-indigo-600"
												: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}`}
									>
										<FontAwesomeIcon icon={faQrcode} /> QR Check-in
									</button>
									<button
										onClick={() => setActiveTab("attendees")}
										className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
											activeTab === "attendees"
												? "border-indigo-500 text-indigo-600"
												: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}`}
									>
										<FontAwesomeIcon icon={faUsers} /> Attendees
									</button>
									<button
										onClick={() => setActiveTab("edit")}
										className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
											activeTab === "edit"
												? "border-indigo-500 text-indigo-600"
												: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}`}
									>
										<FontAwesomeIcon icon={faEdit} /> Edit Event
									</button>
								</div>
							</div>

							<div className="p-6 overflow-y-auto flex-grow">
								{activeTab === "qr" && (
									<div className="text-center">
										<p className="text-sm text-gray-600 mb-4">
											Users scan this code to check-in. Click to enlarge.
										</p>
										{qrCodeValue ? (
											<div
												className="inline-block cursor-pointer transition-transform hover:scale-105"
												onClick={() => setIsQrFullScreen(true)}
												title="Click to enlarge QR code"
											>
												<QRCodeCanvas
													id={`qr-code-event-modal-${eventId}`}
													value={qrCodeValue}
													size={220}
													level={"H"}
													includeMargin={true}
													className="mx-auto border bg-white p-2 rounded shadow"
												/>
											</div>
										) : (
											<p className="text-red-500">
												Could not generate QR Code.
											</p>
										)}
									</div>
								)}

								{activeTab === "attendees" && (
									<div>
										<div className="flex justify-between items-center mb-4">
											<h3 className="text-lg font-semibold text-gray-700">
												Attendee List
											</h3>
											{isAdminOrCommittee && (
												<span className="text-sm text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
													{confirmedCount} Confirmed
													{eventData?.isLimitEnabled &&
													typeof eventData?.attendanceLimit === "number"
														? ` / ${eventData.attendanceLimit}`
														: ""}
													{waitingCount > 0 && ` (${waitingCount} Waiting)`}
												</span>
											)}
										</div>
										<input
											type="text"
											placeholder="Search attendees by name or email..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="w-full mb-4 px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
										/>
										<div className="max-h-72 overflow-y-auto border rounded bg-white p-2 space-y-1 mb-4">
											{filteredAttendees.filter(
												(att) =>
													!optimisticAttendeeOverrides[att.userID]?._removed,
											).length === 0 && (
												<p className="text-center text-gray-500 italic p-2">
													No attendees match criteria.
												</p>
											)}
											{filteredAttendees
												.filter(
													(att) =>
														!optimisticAttendeeOverrides[att.userID]?._removed,
												)
												.map((attendee) => {
													const displayStatus = getDisplayStatus(
														attendee.userID,
													);
													const actionStatus =
														attendeeActionStatus[attendee.userID];
													const isProcessingUser =
														isMutatingAttendees &&
														(verifyAttendeeMutation.variables
															?.attendeeUserId === attendee.userID ||
															removeAttendeeMutation.variables
																?.attendeeUserId === attendee.userID);
													return (
														<div
															key={attendee.userID}
															className={`p-2 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors ${
																displayStatus.waiting
																	? "bg-yellow-50"
																	: "bg-gray-50"
															} ${
																isProcessingUser ? "opacity-50 cursor-wait" : ""
															}`}
														>
															<div>
																<span className="font-medium text-sm">
																	{attendee.fullName ||
																		`User (${attendee.userID.substring(5)})`}
																</span>
																<span className="block text-xs text-gray-500">
																	{attendee.primaryEmailAddress || "No email"}
																</span>
																{displayStatus.waiting && (
																	<span className="text-xs text-yellow-700 font-semibold">
																		{" "}
																		(Waiting List)
																	</span>
																)}
															</div>
															<div className="flex items-center space-x-1.5 flex-shrink-0 mt-1 sm:mt-0">
																<span
																	className={`text-xs px-2 py-0.5 rounded-full ${
																		displayStatus.verified
																			? "bg-green-100 text-green-700"
																			: "bg-gray-200 text-gray-600"
																	}`}
																>
																	{displayStatus.verified
																		? "Verified"
																		: "Not Verified"}
																</span>
																<button
																	type="button"
																	onClick={() =>
																		handleVerifyToggle(
																			attendee.userID,
																			displayStatus.verified,
																		)
																	}
																	disabled={isMutatingAttendees}
																	className={`p-1 rounded-full transition-colors ${
																		displayStatus.verified
																			? "bg-gray-500 text-white hover:bg-gray-600"
																			: "bg-green-500 text-white hover:bg-green-600"
																	} ${
																		isProcessingUser ||
																		verifyAttendeeMutation.isPending
																			? "opacity-70 cursor-not-allowed"
																			: ""
																	}`}
																	aria-label={
																		displayStatus.verified
																			? "Mark as not verified"
																			: "Mark as verified"
																	}
																>
																	<FontAwesomeIcon
																		icon={
																			displayStatus.verified
																				? faUserTimes
																				: faUserCheck
																		}
																		className="w-3 h-3"
																	/>
																</button>
																<button
																	type="button"
																	onClick={() => handleRemove(attendee.userID)}
																	disabled={isMutatingAttendees}
																	className={`p-1 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors ${
																		isProcessingUser ||
																		removeAttendeeMutation.isPending
																			? "opacity-70 cursor-not-allowed"
																			: ""
																	}`}
																	aria-label="Remove attendee"
																>
																	<FontAwesomeIcon
																		icon={faUserSlash}
																		className="w-3 h-3"
																	/>
																</button>
															</div>
															{actionStatus && (
																<p
																	className={`w-full text-xs text-center sm:text-right mt-1 ${
																		actionStatus.error
																			? "text-red-600"
																			: "text-blue-600"
																	}`}
																>
																	{actionStatus.message}
																</p>
															)}
														</div>
													);
												})}
										</div>
										<div className="mt-4 pt-4 border-t text-center">
											<button
												type="button"
												onClick={handleResetAttendeesClick}
												className={`px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-semibold flex items-center justify-center gap-2 mx-auto ${
													isMutatingEvent || !isAttendance
														? "opacity-50 cursor-not-allowed"
														: ""
												}`}
												disabled={isMutatingEvent || !isAttendance}
												title={
													!isAttendance
														? "Enable attendance tracking first"
														: "Reset Attendee List"
												}
											>
												<FontAwesomeIcon icon={faUsersSlash} /> Reset Attendee
												List
											</button>
											{hasUnverified && attendeesList.length > 0 && (
												<button
													type="button"
													onClick={handleFreeze}
													className={`mt-3 px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 border border-blue-300 text-sm transition mx-auto ${
														isMutatingAttendees
															? "opacity-50 cursor-not-allowed"
															: ""
													}`}
													disabled={isMutatingAttendees}
												>
													<FontAwesomeIcon
														icon={faSnowflake}
														className="mr-2"
													/>
													{freezeUnverifiedMutation.isPending
														? "Freezing..."
														: "Freeze All Unverified"}
												</button>
											)}
											{attendeeActionStatus._global && (
												<p
													className={`text-xs text-center mt-2 ${
														attendeeActionStatus._global.error
															? "text-red-600"
															: "text-blue-600"
													}`}
												>
													{attendeeActionStatus._global.message}
												</p>
											)}
										</div>
									</div>
								)}

								{activeTab === "edit" && (
									<form
										onSubmit={(e) => {
											e.preventDefault();
											handleSave(false);
										}}
									>
										<h3 className="text-lg font-semibold text-center mb-4 text-gray-700">
											Edit Event Details
										</h3>
										{editError && (
											<p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">
												{editError}
											</p>
										)}
										<div className="space-y-4 max-h-[calc(90vh-320px)] overflow-y-auto pr-2">
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
													onClick={() =>
														setIsColorPickerOpen(!isColorPickerOpen)
													}
													className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
												>
													<span className="flex items-center">
														<span
															className={`inline-block w-5 h-5 rounded mr-2 border border-gray-400 ${cardColor}`}
														></span>
														{cardColor}
													</span>
													<svg
														className={`w-5 h-5 text-gray-400 transform transition-transform ${
															isColorPickerOpen ? "rotate-180" : ""
														}`}
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
														checked={attendeesEnabled}
														onChange={(e) =>
															setAttendeesEnabled(e.target.checked)
														}
														className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
													/>
													<label
														htmlFor="edit-attendees"
														className="ml-2 block text-sm text-gray-900"
													>
														Allow Attendance Tracking
													</label>
												</div>
												{attendeesEnabled && (
													<div className="pl-6 space-y-2">
														<div className="flex items-center">
															<input
																id="edit-limit-enabled"
																type="checkbox"
																checked={isLimitEnabled}
																onChange={(e) =>
																	setIsLimitEnabled(e.target.checked)
																}
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
																		setLimitValue(
																			parseInt(e.target.value, 10) || 0,
																		)
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
													onChange={(e) =>
														setFreezeNotAllowed(e.target.checked)
													}
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

											<div className="pt-4 border-t">
												<h4 className="text-md font-medium text-gray-800 mb-3">
													Detailed Information Sections
												</h4>
												{inDescription.map((item, index) => (
													<div
														key={index}
														className="p-3 border rounded-md space-y-2 relative bg-gray-50 mb-3"
													>
														<label
															htmlFor={`edit-detail-title-${index}`}
															className="block text-sm font-medium text-gray-700"
														>
															Section Title (Optional)
														</label>
														<input
															id={`edit-detail-title-${index}`}
															value={item.title}
															onChange={(e) =>
																handleInDescriptionChange(
																	index,
																	"title",
																	e.target.value,
																)
															}
															placeholder="e.g., Schedule, What to Bring"
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
															value={item.description}
															onChange={(e) =>
																handleInDescriptionChange(
																	index,
																	"description",
																	e.target.value,
																)
															}
															placeholder="Enter details for this section..."
															className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
															required={!item.title?.trim()}
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

											<div className="pt-6 border-t border-red-300 mt-6">
												<h4 className="text-lg font-semibold text-red-700 mb-3">
													Danger Zone
												</h4>
												<div className="space-y-4">
													<div>
														<p className="text-sm text-gray-600 mb-2">
															Permanently delete this event and all its data.
														</p>
														<button
															type="button"
															onClick={handleDeleteClick}
															className={`w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2 ${
																isMutatingEvent
																	? "opacity-50 cursor-not-allowed"
																	: ""
															}`}
															disabled={isMutatingEvent}
														>
															<FontAwesomeIcon icon={faTrashAlt} /> Delete This
															Event
														</button>
													</div>
												</div>
											</div>
										</div>

										<div className="p-4 mt-4 flex justify-end space-x-3 border-t bg-gray-50">
											<button
												type="button"
												onClick={onClose}
												className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
												disabled={isMutatingEvent}
											>
												Cancel
											</button>
											<button
												type="submit"
												className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition ${
													isMutatingEvent ? "opacity-50 cursor-not-allowed" : ""
												}`}
												disabled={isMutatingEvent}
											>
												<FontAwesomeIcon icon={faSave} className="mr-2" />
												{editEventMutation.isPending
													? "Saving..."
													: "Save Changes"}
											</button>
										</div>
									</form>
								)}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isQrFullScreen && qrCodeValue && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[60] bg-black bg-opacity-80 backdrop-blur-md flex items-center justify-center p-4"
						onClick={() => setIsQrFullScreen(false)}
					>
						<motion.div
							initial={{ scale: 0.8 }}
							animate={{ scale: 1 }}
							exit={{ scale: 0.8 }}
							transition={{ type: "spring", stiffness: 300, damping: 25 }}
							className="relative bg-white p-6 rounded-lg shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							<QRCodeCanvas
								id={`qr-code-fullscreen-${eventId}`}
								value={qrCodeValue}
								size={
									typeof window !== "undefined"
										? Math.min(
												window.innerWidth * 0.8,
												window.innerHeight * 0.8,
												400,
											)
										: 300
								}
								level={"H"}
								includeMargin={true}
							/>
							<button
								onClick={() => setIsQrFullScreen(false)}
								className="absolute -top-4 -right-4 text-white bg-gray-800 hover:bg-black transition-colors z-20 h-10 w-10 flex items-center justify-center rounded-full shadow-lg"
								aria-label="Close full-screen QR code"
							>
								<FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

export default EventManageModal;
