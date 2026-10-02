// src/components/admin/UserManagement.js
"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const filterOptions = [
	{ key: "all", label: "All" },
	{ key: "pending", label: "Pending" },
	{ key: "admin", label: "Admin" },
	{ key: "committee", label: "Committee" },
	{ key: "member", label: "Members" },
	{ key: "user", label: "User" },
	{ key: "freezed", label: "Freezed" },
	{ key: "unfreezed", label: "Unfreezed" },
];

const fetchAdminUsers = async () => {
	const response = await fetch("/api/admin/users");
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to fetch users: ${response.statusText}`,
		);
	}
	return response.json();
};

const updateUserMetadata = async ({ userId, metadataKey, metadataValue }) => {
	const response = await fetch("/api/admin/users", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ userId, metadataKey, metadataValue }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to update metadata: ${response.statusText}`,
		);
	}
	return response.json();
};

const removeAllMembers = async () => {
	const response = await fetch("/api/admin/users", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "removeAllMembers" }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to remove members: ${response.statusText}`,
		);
	}
	return response.json();
};

export default function UserManagement() {
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [activeFilter, setActiveFilter] = useState("all");
	const [bulkMessage, setBulkMessage] = useState(null);
	const [bulkError, setBulkError] = useState(null);
	const [updateError, setUpdateError] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);

	const usersPerPage = 10;

	const {
		data: users = [],
		isLoading: isLoadingUsers,
		isError: isUsersError,
		error: usersFetchError,
	} = useQuery({
		queryKey: ["admin", "users"],
		queryFn: fetchAdminUsers,
	});

	const { mutate: updateUserMutation, isPending: isUpdatingUser } = useMutation(
		{
			mutationFn: updateUserMetadata,
			onSuccess: (data, variables) => {
				console.log("Update successful:", data);
				queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
				setUpdateError(null);
			},
			onError: (error) => {
				console.error("Update user metadata error:", error);
				setUpdateError(error.message || "Failed to update user status.");
			},
		},
	);

	const { mutate: removeAllMembersMutation, isPending: isBulkRemoving } =
		useMutation({
			mutationFn: removeAllMembers,
			onSuccess: (data) => {
				console.log("Bulk remove result:", data);
				setBulkMessage(data.message || "Operation completed.");
				if (data.errors && data.errors.length > 0) {
					setBulkError(
						`Completed with ${data.errors.length} errors. Check server logs.`,
					);
				} else {
					setBulkError(null);
				}
				queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
				setUpdateError(null);
			},
			onError: (error) => {
				console.error("Bulk remove members error:", error);
				setBulkError(error.message || "Failed to perform bulk action.");
				setBulkMessage(null);
				setUpdateError(null);
			},
		});

	const handleUpdateMetadata = (userId, metadataKey, metadataValue) => {
		setUpdateError(null);
		setBulkMessage(null);
		setBulkError(null);
		updateUserMutation({ userId, metadataKey, metadataValue });
	};

	const handleConfirmMakeAdmin = (userId, userName) => {
		const confirmationMessage = `Are you sure you want to make ${userName || "this user"} an Admin? (This will also grant Member status)`;
		if (window.confirm(confirmationMessage)) {
			handleUpdateMetadata(userId, "admin", true);
		}
	};

	const handleRemoveAllMembers = () => {
		if (
			!window.confirm(
				"Are you sure you want to remove the 'Member' status from ALL non-admin users currently marked as members? This cannot be undone easily.",
			)
		) {
			return;
		}
		setUpdateError(null);
		setBulkMessage(null);
		setBulkError(null);
		removeAllMembersMutation();
	};

	const filteredUsers = useMemo(() => {
		const safeUsers = Array.isArray(users) ? users : [];
		let tempUsers = [...safeUsers];

		if (activeFilter !== "all") {
			tempUsers = tempUsers.filter((user) => {
				const isPending = Boolean(user.isPending);
				const isAdmin = Boolean(user.isAdmin);
				const isCommittee = Boolean(user.isCommittee);
				const isMember = Boolean(user.isMember);
				const isFreezed = Boolean(user.isFreezed);

				switch (activeFilter) {
					case "pending":
						return isPending;
					case "admin":
						return isAdmin;
					case "committee":
						return isCommittee;
					case "member":
						return isMember && !isAdmin && !isCommittee && !isPending;
					case "user":
						return !isAdmin && !isMember && !isCommittee && !isPending;
					case "freezed":
						return isFreezed;
					case "unfreezed":
						return !isFreezed;
					default:
						return true;
				}
			});
		}

		const normalizedSearchTerm = searchTerm
			.toLowerCase()
			.trim()
			.replace(/\s+/g, " ");
		if (normalizedSearchTerm) {
			tempUsers = tempUsers.filter((user) => {
				const firstName = user.firstName?.toLowerCase() || "";
				const lastName = user.lastName?.toLowerCase() || "";
				const fullName = `${firstName} ${lastName}`.trim();
				const reversedFullName = `${lastName} ${firstName}`.trim();
				const email = user.email?.toLowerCase() || "";
				const username = user.username?.toLowerCase() || "";
				return (
					fullName.includes(normalizedSearchTerm) ||
					reversedFullName.includes(normalizedSearchTerm) ||
					email.includes(normalizedSearchTerm) ||
					username.includes(normalizedSearchTerm) ||
					user.id.toLowerCase().includes(normalizedSearchTerm)
				);
			});
		}
		return tempUsers;
	}, [users, searchTerm, activeFilter]);

	const currentUsers = useMemo(() => {
		const indexOfLastUser = currentPage * usersPerPage;
		const indexOfFirstUser = indexOfLastUser - usersPerPage;
		return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
	}, [filteredUsers, currentPage]);

	const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, activeFilter]);

	useEffect(() => {
		if (totalPages === 0 && currentPage !== 1) {
			setCurrentPage(1);
			return;
		}
		if (totalPages > 0 && currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const handlePageChange = (page) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const getUserStatus = (user) => {
		if (user.isAdmin) return { text: "Admin", color: "purple" };
		if (user.isCommittee) return { text: "Committee", color: "orange" };
		if (user.isMember) return { text: "Member", color: "blue" };
		return { text: "User", color: "gray" };
	};

	const getStatusBadgeClass = (color) => {
		switch (color) {
			case "purple":
				return "bg-purple-100 text-purple-800";
			case "orange":
				return "bg-orange-100 text-orange-800";
			case "blue":
				return "bg-blue-100 text-blue-800";
			case "yellow":
				return "bg-yellow-100 text-yellow-800";
			case "green":
				return "bg-green-100 text-green-800";
			case "gray":
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	if (isLoadingUsers && users.length === 0) {
		return <p className="text-center text-gray-500 py-4">Loading users...</p>;
	}

	if (isUsersError && users.length === 0) {
		return (
			<p className="text-center text-red-600 py-4">
				Error loading users: {usersFetchError?.message || "Unknown error"}
			</p>
		);
	}

	return (
		<div className="bg-gray-50 p-4 rounded border mt-6">
			<div className="flex flex-wrap justify-between items-center gap-4 mb-3">
				<h2 className="text-xl font-semibold text-gray-800">User Management</h2>
				<button
					onClick={handleRemoveAllMembers}
					disabled={isBulkRemoving || isLoadingUsers}
					className={`px-3 py-1.5 rounded text-white text-sm font-semibold transition-colors duration-150 ease-in-out ${
						isBulkRemoving || isLoadingUsers
							? "bg-gray-400 cursor-not-allowed"
							: "bg-orange-600 hover:bg-orange-700"
					}`}
				>
					{isBulkRemoving ? "Processing..." : "Remove All Member Status"}
				</button>
			</div>

			<div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="md:col-span-1">
					<label htmlFor="user-search" className="sr-only">
						Search Users
					</label>
					<input
						type="text"
						id="user-search"
						placeholder="Search by name, email, username, or ID..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
					/>
				</div>
				<div className="md:col-span-2 flex flex-wrap gap-2 items-center">
					<span className="text-sm font-medium text-gray-600 mr-2">
						Filter by:
					</span>
					{filterOptions.map((option) => (
						<button
							key={option.key}
							onClick={() => setActiveFilter(option.key)}
							className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
								activeFilter === option.key
									? "bg-purple-600 text-white shadow-md"
									: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{updateError && (
				<p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
					Error: {updateError}
				</p>
			)}
			{bulkMessage && (
				<p className="text-green-700 bg-green-100 border border-green-400 rounded p-2 my-2 text-sm">
					{bulkMessage}
				</p>
			)}
			{bulkError && (
				<p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
					Bulk Action Error: {bulkError}
				</p>
			)}

			<div className="mb-2 text-sm text-gray-600">
				Showing {currentUsers.length} of {filteredUsers.length} filtered users
				(total {users.length}).
			</div>

			{/* Desktop Table View */}
			<div className="hidden md:block overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-100">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Name / Email
							</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Username
							</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								User Status
							</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Freezed
							</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{currentUsers.length === 0 && !isLoadingUsers && (
							<tr>
								<td
									colSpan="5"
									className="px-4 py-4 text-center text-sm text-gray-500"
								>
									No users match the current filter or search term.
								</td>
							</tr>
						)}
						{currentUsers.map((user) => {
							const status = getUserStatus(user);
							const isLoadingThisUser = isUpdatingUser;
							const userName =
								`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
								user.email;

							return (
								<tr key={user.id}>
									<td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
										<div className="flex items-center space-x-2">
											{user.isPending && (
												<span title="Pending Verification">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														className="h-4 w-4 text-orange-500"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														strokeWidth={2}
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
												</span>
											)}
											<span>{userName}</span>
										</div>
										{userName !== user.email && (
											<div className="text-xs text-gray-500">{user.email}</div>
										)}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
										{user.username || "N/A"}
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm">
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
												status.color,
											)}`}
										>
											{status.text}
										</span>
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm">
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
												user.isFreezed ? "yellow" : "green",
											)}`}
										>
											{user.isFreezed ? "True" : "False"}
										</span>
									</td>
									<td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-1 relative">
										{!user.isAdmin ? (
											<button
												onClick={() =>
													handleConfirmMakeAdmin(user.id, userName)
												}
												disabled={isLoadingThisUser}
												className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
													isLoadingThisUser
														? "bg-gray-400 cursor-not-allowed"
														: "bg-purple-500 hover:bg-purple-600"
												}`}
												aria-label={`Make ${userName} an admin`}
											>
												{isLoadingThisUser ? "..." : "Make Admin"}
											</button>
										) : (
											<button
												onClick={() =>
													handleUpdateMetadata(user.id, "admin", false)
												}
												disabled={isLoadingThisUser}
												className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
													isLoadingThisUser
														? "bg-gray-400 cursor-not-allowed"
														: "bg-red-500 hover:bg-red-600"
												}`}
												aria-label={`Remove admin status from ${userName}`}
											>
												{isLoadingThisUser ? "..." : "Remove Admin"}
											</button>
										)}

										<button
											onClick={() =>
												handleUpdateMetadata(
													user.id,
													"committee",
													!user.isCommittee,
												)
											}
											disabled={isLoadingThisUser}
											className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
												isLoadingThisUser
													? "bg-gray-400 cursor-not-allowed"
													: user.isCommittee
														? "bg-red-500 hover:bg-red-600"
														: "bg-orange-500 hover:bg-orange-600"
											}`}
											aria-label={`${
												user.isCommittee
													? "Remove committee status from"
													: "Make"
											} ${userName} a committee member`}
										>
											{isLoadingThisUser
												? "..."
												: user.isCommittee
													? "Remove Committee"
													: "Make Committee"}
										</button>

										<button
											onClick={() =>
												handleUpdateMetadata(user.id, "member", !user.isMember)
											}
											disabled={isLoadingThisUser || user.isAdmin}
											className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
												isLoadingThisUser || user.isAdmin
													? "bg-gray-400 cursor-not-allowed"
													: user.isMember
														? "bg-red-500 hover:bg-red-600"
														: user.isPending
															? "bg-green-500 hover:bg-green-600"
															: "bg-blue-500 hover:bg-blue-600"
											}`}
											aria-label={
												user.isMember
													? `Remove member status from ${userName}`
													: user.isPending
														? `Approve ${userName} as member`
														: `Make ${userName} a member`
											}
											title={
												user.isAdmin
													? "Admins automatically have Member status"
													: user.isPending
														? "Approve pending request"
														: ""
											}
										>
											{isLoadingThisUser
												? "..."
												: user.isMember
													? "Remove Member"
													: user.isPending
														? "Approve Member"
														: "Make Member"}
										</button>

										<button
											onClick={() =>
												handleUpdateMetadata(
													user.id,
													"freezed",
													!user.isFreezed,
												)
											}
											disabled={isLoadingThisUser}
											className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
												isLoadingThisUser
													? "bg-gray-400 cursor-not-allowed"
													: user.isFreezed
														? "bg-green-500 hover:bg-green-600"
														: "bg-yellow-500 hover:bg-yellow-600"
											}`}
											aria-label={`${
												user.isFreezed ? "Unfreeze" : "Freeze"
											} ${userName}`}
										>
											{isLoadingThisUser
												? "..."
												: user.isFreezed
													? "Unfreeze"
													: "Freeze"}
										</button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Mobile Card View */}
			<div className="md:hidden space-y-4">
				{currentUsers.length === 0 && !isLoadingUsers && (
					<p className="text-center text-sm text-gray-500 py-4">
						No users match the current filter or search term.
					</p>
				)}
				{currentUsers.map((user) => {
					const status = getUserStatus(user);
					const isLoadingThisUser = isUpdatingUser;
					const userName =
						`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
						user.email;

					return (
						<div
							key={user.id}
							className="bg-white p-4 rounded-md shadow border"
						>
							<div className="mb-3">
								<h3 className="font-medium text-gray-900 flex items-center space-x-2">
									{user.isPending && (
										<span title="Pending Verification">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4 text-orange-500"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={2}
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
										</span>
									)}
									<span>{userName}</span>
								</h3>
								{userName !== user.email && (
									<p className="text-xs text-gray-500">{user.email}</p>
								)}
							</div>
							<dl className="space-y-2 text-sm text-gray-700">
								<div>
									<dt className="font-medium">Username:</dt>
									<dd>{user.username || "N/A"}</dd>
								</div>
								<div>
									<dt className="font-medium">User Status:</dt>
									<dd>
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
												status.color,
											)}`}
										>
											{status.text}
										</span>
									</dd>
								</div>
								<div>
									<dt className="font-medium">Freezed:</dt>
									<dd>
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
												user.isFreezed ? "yellow" : "green",
											)}`}
										>
											{user.isFreezed ? "True" : "False"}
										</span>
									</dd>
								</div>
							</dl>
							<div className="mt-4 flex flex-wrap gap-2 justify-end">
								{!user.isAdmin ? (
									<button
										onClick={() => handleConfirmMakeAdmin(user.id, userName)}
										disabled={isLoadingThisUser}
										className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
											isLoadingThisUser
												? "bg-gray-400 cursor-not-allowed"
												: "bg-purple-500 hover:bg-purple-600"
										}`}
										aria-label={`Make ${userName} an admin`}
									>
										{isLoadingThisUser ? "..." : "Make Admin"}
									</button>
								) : (
									<button
										onClick={() =>
											handleUpdateMetadata(user.id, "admin", false)
										}
										disabled={isLoadingThisUser}
										className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
											isLoadingThisUser
												? "bg-gray-400 cursor-not-allowed"
												: "bg-red-500 hover:bg-red-600"
										}`}
										aria-label={`Remove admin status from ${userName}`}
									>
										{isLoadingThisUser ? "..." : "Remove Admin"}
									</button>
								)}

								<button
									onClick={() =>
										handleUpdateMetadata(
											user.id,
											"committee",
											!user.isCommittee,
										)
									}
									disabled={isLoadingThisUser}
									className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
										isLoadingThisUser
											? "bg-gray-400 cursor-not-allowed"
											: user.isCommittee
												? "bg-red-500 hover:bg-red-600"
												: "bg-orange-500 hover:bg-orange-600"
									}`}
									aria-label={`${
										user.isCommittee ? "Remove committee status from" : "Make"
									} ${userName} a committee member`}
								>
									{isLoadingThisUser
										? "..."
										: user.isCommittee
											? "Remove Committee"
											: "Make Committee"}
								</button>

								<button
									onClick={() =>
										handleUpdateMetadata(user.id, "member", !user.isMember)
									}
									disabled={isLoadingThisUser || user.isAdmin}
									className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
										isLoadingThisUser || user.isAdmin
											? "bg-gray-400 cursor-not-allowed"
											: user.isMember
												? "bg-red-500 hover:bg-red-600"
												: user.isPending
													? "bg-green-500 hover:bg-green-600"
													: "bg-blue-500 hover:bg-blue-600"
									}`}
									aria-label={
										user.isMember
											? `Remove member status from ${userName}`
											: user.isPending
												? `Approve ${userName} as member`
												: `Make ${userName} a member`
									}
									title={
										user.isAdmin
											? "Admins automatically have Member status"
											: user.isPending
												? "Approve pending request"
												: ""
									}
								>
									{isLoadingThisUser
										? "..."
										: user.isMember
											? "Remove Member"
											: user.isPending
												? "Approve Member"
												: "Make Member"}
								</button>

								<button
									onClick={() =>
										handleUpdateMetadata(user.id, "freezed", !user.isFreezed)
									}
									disabled={isLoadingThisUser}
									className={`px-2 py-1 rounded text-white text-xs font-semibold transition-colors duration-150 ease-in-out ${
										isLoadingThisUser
											? "bg-gray-400 cursor-not-allowed"
											: user.isFreezed
												? "bg-green-500 hover:bg-green-600"
												: "bg-yellow-500 hover:bg-yellow-600"
									}`}
									aria-label={`${
										user.isFreezed ? "Unfreeze" : "Freeze"
									} ${userName}`}
								>
									{isLoadingThisUser
										? "..."
										: user.isFreezed
											? "Unfreeze"
											: "Freeze"}
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{totalPages > 1 && (
				<div className="flex justify-center items-center mt-4 space-x-2">
					<button
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage === 1}
						className={`px-3 py-1 rounded text-sm font-medium ${
							currentPage === 1
								? "bg-gray-200 text-gray-500 cursor-not-allowed"
								: "bg-purple-500 text-white hover:bg-purple-600"
						}`}
					>
						Previous
					</button>
					<span className="text-sm text-gray-700">
						Page {currentPage} of {totalPages}
					</span>
					<button
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
						className={`px-3 py-1 rounded text-sm font-medium ${
							currentPage === totalPages
								? "bg-gray-200 text-gray-500 cursor-not-allowed"
								: "bg-purple-500 text-white hover:bg-purple-600"
						}`}
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
}
