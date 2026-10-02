"use client";

import { useQuery } from "@tanstack/react-query";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import CombinedFileManager from "../DriveManagment/CombinedFileManager";
import EditableTextArea from "./EditableTextArea";
import "react-datepicker/dist/react-datepicker.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_DISCORD_URL;

const fetchChannels = async () => {
	if (!API_BASE_URL) throw new Error("API URL not configured.");
	const response = await fetch(`${API_BASE_URL}/channels`);
	if (!response.ok) throw new Error("Failed to fetch channels");
	const data = await response.json();
	return data?.data?.channels || [];
};

const fetchRoles = async () => {
	if (!API_BASE_URL) throw new Error("API URL not configured.");
	const response = await fetch(`${API_BASE_URL}/roles`);
	if (!response.ok) throw new Error("Failed to fetch roles");
	const data = await response.json();
	return data?.data?.roles || [];
};

const defaultNewSchedule = {
	type: "weekly",
	name: "",
	turnon: true,
	imageturnon: true,
	channelId: "",
	responseChannelId: "",
	roleId: "",
	hour: "12",
	minutes: "00",
	dayoftheweek: "1",
	selectedDate: new Date(),
	daybefore: "0",
	seconds: "0",
	timezone: "Europe/Stockholm",
	messageContent:
		"**Friendly reminder:** Need to make a post on social media!\n\nReact with ❤️ to send the message.",
	automaticResponses: [{ title: "", content: "" }],
	Images: [],
};

function DiscordSchedulerForm({
	initialData,
	onSubmit,
	onCancel,
	isSubmitting,
}) {
	const [formData, setFormData] = useState(() => {
		const data = initialData ? { ...initialData } : { ...defaultNewSchedule };
		data.automaticResponses = Array.isArray(data.automaticResponses)
			? data.automaticResponses
			: [{ title: "", content: "" }];
		data.Images = Array.isArray(data.Images) ? data.Images : [];
		if (data.selectedDate && !(data.selectedDate instanceof Date)) {
			data.selectedDate = new Date(data.selectedDate);
		} else if (!data.selectedDate) {
			data.selectedDate = new Date();
		}
		data.hour = String(data.hour || "12");
		data.minutes = String(data.minutes || "00");
		data.dayoftheweek = String(data.dayoftheweek || "1");
		data.daybefore = String(data.daybefore || "0");
		return data;
	});

	const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
	const [dayOfWeekDropdownOpen, setDayOfWeekDropdownOpen] = useState(false);
	const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
	const [targetImageInputIndex, setTargetImageInputIndex] = useState(null);

	const { data: channels = [], isError: isChannelsError } = useQuery({
		queryKey: ["discordChannels"],
		queryFn: fetchChannels,
		staleTime: Infinity,
	});

	const { data: roles = [], isError: isRolesError } = useQuery({
		queryKey: ["discordRoles"],
		queryFn: fetchRoles,
		staleTime: Infinity,
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleCheckboxChange = (e) => {
		const { name, checked } = e.target;
		setFormData((prev) => ({ ...prev, [name]: checked }));
	};

	const handleTimeChange = (e) => {
		const [hour, minutes] = e.target.value.split(":");
		setFormData((prev) => ({
			...prev,
			hour: hour || "0",
			minutes: minutes || "0",
		}));
	};

	const handleDateChange = (date) => {
		setFormData((prev) => ({ ...prev, selectedDate: date }));
	};

	const handleAutoResponseChange = (index, field, value) => {
		setFormData((prev) => {
			const newResponses = [...prev.automaticResponses];
			newResponses[index] = { ...newResponses[index], [field]: value };
			return { ...prev, automaticResponses: newResponses };
		});
	};

	const addAutoResponse = () => {
		setFormData((prev) => ({
			...prev,
			automaticResponses: [
				...prev.automaticResponses,
				{ title: "", content: "" },
			],
		}));
	};

	const removeAutoResponse = (indexToRemove) => {
		setFormData((prev) => ({
			...prev,
			automaticResponses: prev.automaticResponses.filter(
				(_, index) => index !== indexToRemove,
			),
		}));
	};

	const handleImageChange = (index, value) => {
		setFormData((prev) => {
			const newImages = [...prev.Images];
			newImages[index] = { ...newImages[index], Imgurl: value };
			return { ...prev, Images: newImages };
		});
	};

	const addImage = () => {
		setFormData((prev) => ({
			...prev,
			Images: [...prev.Images, { Imgurl: "" }],
		}));
	};

	const removeImage = (indexToRemove) => {
		setFormData((prev) => ({
			...prev,
			Images: prev.Images.filter((_, index) => index !== indexToRemove),
		}));
	};

	const openFileManager = (imgIndex) => {
		setTargetImageInputIndex(imgIndex);
		setIsFileManagerOpen(true);
	};

	const handleImageSelected = (selectedUrl) => {
		if (targetImageInputIndex !== null) {
			handleImageChange(targetImageInputIndex, selectedUrl);
		}
		setIsFileManagerOpen(false);
		setTargetImageInputIndex(null);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const payload = { ...formData };
		payload.automaticResponses = payload.automaticResponses.filter(
			(r) => r.title?.trim() || r.content?.trim(),
		);
		payload.Images = payload.Images.filter((img) => img.Imgurl?.trim());

		if (payload.type === "date") {
			const sel = payload.selectedDate || new Date();
			payload.year = sel.getFullYear().toString();
			payload.month = (sel.getMonth() + 1).toString();
			payload.day = sel.getDate().toString();
			payload.time = `${String(sel.getHours()).padStart(2, "0")}:${String(sel.getMinutes()).padStart(2, "0")}:${String(sel.getSeconds()).padStart(2, "0")}`;
		} else {
			delete payload.year;
			delete payload.month;
			delete payload.day;
			delete payload.time;
		}
		payload.hour = String(payload.hour);
		payload.minutes = String(payload.minutes);
		payload.dayoftheweek = String(payload.dayoftheweek);
		payload.daybefore = String(payload.daybefore);

		onSubmit(payload);
	};

	function DaysOfWeekLabel(val) {
		const days = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		];
		return days[parseInt(String(val), 10)] || "Sunday";
	}

	const contetntText = `This Message will only appear in the "Channel ID" when your time was set.`;
	const responseText = `This Message will only appear in the "Response Channel ID" after it has been liked by the user. AutoRespond is not required.`;

	return (
		<>
			<form
				onSubmit={handleSubmit}
				className="space-y-6 bg-white p-6 rounded shadow-md border"
			>
				<h3 className="text-xl font-semibold mb-4 text-center">
					{initialData ? "Edit Scheduled Message" : "Add New Scheduled Message"}
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700"
						>
							Schedule Name
						</label>
						<input
							type="text"
							name="name"
							id="name"
							value={formData.name}
							onChange={handleChange}
							required
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
						/>
					</div>
					<div className="flex items-end space-x-4">
						<div className="flex items-center">
							<input
								type="checkbox"
								name="turnon"
								id="turnon"
								checked={formData.turnon}
								onChange={handleCheckboxChange}
								className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
							/>
							<label
								htmlFor="turnon"
								className="ml-2 block text-sm font-medium text-gray-700"
							>
								Enabled
							</label>
						</div>
						<div className="flex items-center">
							<input
								type="checkbox"
								name="imageturnon"
								id="imageturnon"
								checked={formData.imageturnon}
								onChange={handleCheckboxChange}
								className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
							/>
							<label
								htmlFor="imageturnon"
								className="ml-2 block text-sm font-medium text-gray-700"
							>
								Send Image
							</label>
						</div>
					</div>
				</div>

				<fieldset className="border p-4 rounded space-y-4">
					<legend className="text-md font-medium text-gray-800 px-1">
						Discord Settings
					</legend>
					{isChannelsError && (
						<p className="text-red-500 text-sm">Error loading channels.</p>
					)}
					{isRolesError && (
						<p className="text-red-500 text-sm">Error loading roles.</p>
					)}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label
								htmlFor="channelId"
								className="block text-sm font-medium text-gray-700"
							>
								Target Channel
							</label>
							<select
								name="channelId"
								id="channelId"
								value={formData.channelId}
								onChange={handleChange}
								required
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
							>
								<option value="">Select Channel...</option>
								{channels.map((channel) => (
									<option key={channel.id} value={channel.id}>
										{channel.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="responseChannelId"
								className="block text-sm font-medium text-gray-700"
							>
								Response Channel (Optional)
							</label>
							<select
								name="responseChannelId"
								id="responseChannelId"
								value={formData.responseChannelId}
								onChange={handleChange}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
							>
								<option value="">Select Channel...</option>
								{channels.map((channel) => (
									<option key={channel.id} value={channel.id}>
										{channel.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="roleId"
								className="block text-sm font-medium text-gray-700"
							>
								Role to Ping (Optional)
							</label>
							<select
								name="roleId"
								id="roleId"
								value={formData.roleId}
								onChange={handleChange}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
							>
								<option value="">Select Role...</option>
								{roles.map((role) => (
									<option key={role.id} value={role.id}>
										{role.name}
									</option>
								))}
							</select>
						</div>
					</div>
				</fieldset>
				<fieldset className="border p-4 rounded space-y-4">
					<legend className="text-md font-medium text-gray-800 px-1">
						Schedule Timing
					</legend>
					<div>
						<label
							htmlFor="type"
							className="block text-sm font-medium text-gray-700"
						>
							Schedule Type
						</label>
						<div className="relative mt-1">
							<button
								type="button"
								onClick={() => setTypeDropdownOpen((p) => !p)}
								className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
							>
								<span className="block truncate">
									{formData.type === "weekly" ? "Weekly" : "Specific Date"}
								</span>
								<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
									<svg
										className="h-5 w-5 text-gray-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z"
											clipRule="evenodd"
										/>
									</svg>
								</span>
							</button>
							{typeDropdownOpen && (
								<div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
									<button
										type="button"
										onClick={() => {
											handleChange({
												target: { name: "type", value: "weekly" },
											});
											setTypeDropdownOpen(false);
										}}
										className="text-gray-900 relative cursor-default select-none py-2 pl-3 pr-9 w-full text-left hover:bg-indigo-600 hover:text-white"
									>
										Weekly
									</button>
									<button
										type="button"
										onClick={() => {
											handleChange({ target: { name: "type", value: "date" } });
											setTypeDropdownOpen(false);
										}}
										className="text-gray-900 relative cursor-default select-none py-2 pl-3 pr-9 w-full text-left hover:bg-indigo-600 hover:text-white"
									>
										Specific Date
									</button>
								</div>
							)}
						</div>
					</div>

					{formData.type === "weekly" && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="time"
									className="block text-sm font-medium text-gray-700"
								>
									Time (HH:MM)
								</label>
								<input
									type="time"
									id="time"
									value={`${String(formData.hour).padStart(2, "0")}:${String(formData.minutes).padStart(2, "0")}`}
									onChange={handleTimeChange}
									required
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
								/>
							</div>
							<div>
								<label
									htmlFor="dayoftheweek"
									className="block text-sm font-medium text-gray-700"
								>
									Day of the Week
								</label>
								<div className="relative mt-1">
									<button
										type="button"
										onClick={() => setDayOfWeekDropdownOpen((p) => !p)}
										className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
									>
										<span className="block truncate">
											{DaysOfWeekLabel(formData.dayoftheweek)}
										</span>
										<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
											<svg
												className="h-5 w-5 text-gray-400"
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												aria-hidden="true"
											>
												<path
													fillRule="evenodd"
													d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z"
													clipRule="evenodd"
												/>
											</svg>
										</span>
									</button>
									{dayOfWeekDropdownOpen && (
										<div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
											{["0", "1", "2", "3", "4", "5", "6"].map((val) => (
												<button
													key={val}
													type="button"
													onClick={() => {
														handleChange({
															target: { name: "dayoftheweek", value: val },
														});
														setDayOfWeekDropdownOpen(false);
													}}
													className="text-gray-900 relative cursor-default select-none py-2 pl-3 pr-9 w-full text-left hover:bg-indigo-600 hover:text-white"
												>
													{DaysOfWeekLabel(val)}
												</button>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{formData.type === "date" && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="selectedDate"
									className="block text-sm font-medium text-gray-700"
								>
									Date and Time
								</label>
								<DatePicker
									selected={formData.selectedDate}
									onChange={handleDateChange}
									showTimeSelect
									timeIntervals={15}
									timeFormat="HH:mm"
									dateFormat="yyyy-MM-dd HH:mm"
									required
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
								/>
							</div>
							<div>
								<label
									htmlFor="daybefore"
									className="block text-sm font-medium text-gray-700"
								>
									Remind Days Before
								</label>
								<input
									type="number"
									name="daybefore"
									id="daybefore"
									value={formData.daybefore}
									onChange={handleChange}
									min="0"
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
								/>
							</div>
						</div>
					)}
				</fieldset>

				<fieldset className="border p-4 rounded">
					<legend className="text-md font-medium text-gray-800 px-1">
						Message Content (for Target Channel)
					</legend>
					<EditableTextArea
						idx={"messageContent"}
						resp={{ content: formData.messageContent || "" }}
						handleNewAutoRespFieldChange={(idx, field, newText) =>
							handleChange({
								target: { name: "messageContent", value: newText },
							})
						}
						RoleIDfetcher={formData.roleId}
						textDescrition={contetntText}
						header={"Primary Message"}
					/>
				</fieldset>

				<fieldset className="border p-4 rounded">
					<legend className="text-md font-medium text-gray-800 px-1">
						Automatic Responses (for Response Channel - Optional)
					</legend>
					<p className="text-xs text-gray-500 mb-3">
						If multiple responses are added, one will be chosen randomly when a
						user reacts.
					</p>
					<div className="space-y-3">
						{formData.automaticResponses.map((resp, index) => (
							<div
								key={index}
								className="p-3 border rounded bg-gray-50 space-y-2 relative"
							>
								<button
									type="button"
									onClick={() => removeAutoResponse(index)}
									className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 bg-white rounded-full leading-none text-lg"
									aria-label={`Remove response ${index + 1}`}
								>
									&times;
								</button>
								<div>
									<label
										htmlFor={`respTitle-${index}`}
										className="block text-xs font-medium text-gray-600"
									>
										Response Title {index + 1} (Internal Use)
									</label>
									<input
										type="text"
										id={`respTitle-${index}`}
										value={resp.title || ""}
										onChange={(e) =>
											handleAutoResponseChange(index, "title", e.target.value)
										}
										className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
									/>
								</div>
								<div>
									<label
										htmlFor={`respContent-${index}`}
										className="block text-xs font-medium text-gray-600"
									>
										Response Content {index + 1}
									</label>
									<EditableTextArea
										idx={index}
										resp={resp}
										handleNewAutoRespFieldChange={handleAutoResponseChange}
										RoleIDfetcher={formData.roleId}
										textDescrition={responseText}
										header={`Response ${index + 1}`}
									/>
								</div>
							</div>
						))}
					</div>
					<button
						type="button"
						onClick={addAutoResponse}
						className="mt-3 px-3 py-1.5 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-100 text-sm"
					>
						+ Add Automatic Response
					</button>
				</fieldset>

				<fieldset className="border p-4 rounded">
					<legend className="text-md font-medium text-gray-800 px-1">
						Images (Optional)
					</legend>
					<p className="text-xs text-gray-500 mb-3">
						If multiple images are added and 'Send Image' is enabled, one will
						be chosen randomly.
					</p>
					<div className="space-y-2">
						{formData.Images.map((img, index) => (
							<div key={index} className="flex items-center gap-2">
								<input
									type="url"
									value={img.Imgurl || ""}
									onChange={(e) => handleImageChange(index, e.target.value)}
									placeholder="https://example.com/image.jpg"
									className="flex-grow border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
								/>
								<button
									type="button"
									onClick={() => openFileManager(index)}
									className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
									title="Select Image from Drive"
								>
									Select
								</button>
								<button
									type="button"
									onClick={() => removeImage(index)}
									className="text-red-500 hover:text-red-700 text-xs p-1 leading-none"
									aria-label={`Remove image ${index + 1}`}
								>
									Remove
								</button>
							</div>
						))}
					</div>
					<button
						type="button"
						onClick={addImage}
						className="mt-3 px-3 py-1.5 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-100 text-sm"
					>
						+ Add Image URL
					</button>
				</fieldset>

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
						className={`px-4 py-2 rounded text-white text-sm ${
							isSubmitting
								? "bg-gray-400 cursor-not-allowed"
								: "bg-purple-600 hover:bg-purple-700"
						}`}
					>
						{isSubmitting
							? "Saving..."
							: initialData
								? "Update Schedule"
								: "Add Schedule"}
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

DiscordSchedulerForm.propTypes = {
	initialData: PropTypes.object,
	onSubmit: PropTypes.func.isRequired,
	onCancel: PropTypes.func.isRequired,
	isSubmitting: PropTypes.bool.isRequired,
};

export default DiscordSchedulerForm;
