"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import DiscordSchedulerForm from "./DiscordSchedulerForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_DISCORD_URL;

const fetchScheduledMessages = async () => {
	if (!API_BASE_URL) throw new Error("API URL not configured.");
	const response = await fetch(`${API_BASE_URL}/scheduledMessages`);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to fetch schedules: ${response.statusText}`,
		);
	}
	const result = await response.json();
	return result?.data || [];
};

const createScheduledMessage = async (newScheduleData) => {
	if (!API_BASE_URL) throw new Error("API URL not configured.");
	const response = await fetch(`${API_BASE_URL}/scheduledMessages`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(newScheduleData),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to create schedule: ${response.statusText}`,
		);
	}
	return response.json();
};

const updateScheduledMessage = async (updatedScheduleData) => {
	if (!API_BASE_URL) throw new Error("API URL not configured.");
	if (!updatedScheduleData.id) throw new Error("Schedule ID is required.");

	const response = await fetch(
		`${API_BASE_URL}/scheduledMessages/${updatedScheduleData.id}`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updatedScheduleData),
		},
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to update schedule: ${response.statusText}`,
		);
	}
	return response.json();
};

const deleteScheduledMessage = async (scheduleId) => {
	if (!API_BASE_URL) throw new Error("API URL not configured.");
	const response = await fetch(
		`${API_BASE_URL}/scheduledMessages/${scheduleId}`,
		{ method: "DELETE" },
	);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to delete schedule: ${response.statusText}`,
		);
	}
	return response.json();
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

export default function DiscordSchedulerManagement() {
	const queryClient = useQueryClient();
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingSchedule, setEditingSchedule] = useState(null);
	const [generalError, setGeneralError] = useState(null);

	const {
		data: schedules = [],
		isLoading,
		isError,
		error: fetchError,
	} = useQuery({
		queryKey: ["scheduledMessages"],
		queryFn: fetchScheduledMessages,
	});

	const handleMutationSuccess = (action) => {
		console.log(`Schedule ${action} successful`);
		queryClient.invalidateQueries({ queryKey: ["scheduledMessages"] });
		setIsFormOpen(false);
		setEditingSchedule(null);
		setGeneralError(null);
	};

	const handleMutationError = (error, action) => {
		console.error(`Error ${action} schedule:`, error);
		setGeneralError(
			error.message || `An error occurred while ${action} schedule.`,
		);
	};

	const createMutation = useMutation({
		mutationFn: createScheduledMessage,
		onSuccess: () => handleMutationSuccess("creation"),
		onError: (error) => handleMutationError(error, "creating"),
	});

	const updateMutation = useMutation({
		mutationFn: updateScheduledMessage,
		onSuccess: () => handleMutationSuccess("update"),
		onError: (error) => handleMutationError(error, "updating"),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteScheduledMessage,
		onSuccess: () => handleMutationSuccess("deletion"),
		onError: (error) => handleMutationError(error, "deleting"),
	});

	const handleAddClick = () => {
		setEditingSchedule(null);
		setIsFormOpen(true);
		setGeneralError(null);
	};

	const handleEditClick = (schedule) => {
		setEditingSchedule(schedule);
		setIsFormOpen(true);
		setGeneralError(null);
	};

	const handleDeleteClick = (scheduleIdentifier, scheduleName) => {
		if (
			window.confirm(
				`Are you sure you want to delete schedule "${scheduleName}"?`,
			)
		) {
			setGeneralError(null);
			deleteMutation.mutate(scheduleIdentifier);
		}
	};

	const handleFormSubmit = (formData) => {
		setGeneralError(null);
		if (editingSchedule) {
			const payload = { ...formData, id: editingSchedule.id };
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(formData);
		}
	};

	const handleFormClose = () => {
		setIsFormOpen(false);
		setEditingSchedule(null);
		setGeneralError(null);
	};

	const isMutating =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	return (
		<div className="bg-gray-50 p-4 rounded border mt-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold text-gray-800">
					Discord Scheduled Messages
				</h2>
				<button
					type="button"
					onClick={handleAddClick}
					className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
					disabled={isMutating || isFormOpen}
				>
					Add New Schedule
				</button>
			</div>

			{generalError && (
				<p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
					Error: {generalError}
				</p>
			)}

			{isFormOpen && (
				<div className="my-6">
					<DiscordSchedulerForm
						key={editingSchedule ? editingSchedule.id || "edit" : "new"}
						initialData={editingSchedule}
						onSubmit={handleFormSubmit}
						onCancel={handleFormClose}
						isSubmitting={createMutation.isPending || updateMutation.isPending}
					/>
				</div>
			)}

			{isLoading && <p className="text-center py-4">Loading schedules...</p>}

			{isError && !isLoading && (
				<p className="text-red-500 text-center py-4">
					Error loading schedules: {fetchError?.message}
				</p>
			)}

			{!isLoading && !isError && !isFormOpen && (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-100">
							<tr>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Name
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Type
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Timing
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Target Channel
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{schedules.length === 0 && (
								<tr>
									<td colSpan="6" className="text-center py-4 text-gray-500">
										No scheduled messages found.
									</td>
								</tr>
							)}
							{schedules.map((schedule, index) => (
								<tr key={schedule.id || index}>
									<td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
										{schedule.name}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{schedule.type === "weekly" ? "Weekly" : "Date"}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{schedule.type === "weekly"
											? `${DaysOfWeekLabel(schedule.dayoftheweek)} at ${String(schedule.hour).padStart(2, "0")}:${String(schedule.minutes).padStart(2, "0")}`
											: `${schedule.year}-${schedule.month}-${schedule.day} ${schedule.time || ""}`}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
										{schedule.channelId}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm">
										{schedule.turnon ? (
											<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
												Enabled
											</span>
										) : (
											<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
												Disabled
											</span>
										)}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
										<button
											type="button"
											onClick={() => handleEditClick(schedule)}
											disabled={isMutating || isFormOpen}
											className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() =>
												handleDeleteClick(schedule.id || index, schedule.name)
											}
											disabled={isMutating}
											className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
