"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

async function updateUserSettings(settings) {
	const response = await fetch("/api/user/settings", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(settings),
	});
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.message || "Failed to update settings");
	}
	return response.json();
}

export function SettingsView({
	onBackToMenu,
	userFromPage,
	isLoadedFromPage,
	isSignedInFromPage,
}) {
	const queryClient = useQueryClient();

	const [showNamePubliclyLocal, setShowNamePubliclyLocal] = useState(true);
	const [displayNameTypeLocal, setDisplayNameTypeLocal] = useState("fullName");

	useEffect(() => {
		if (isLoadedFromPage && userFromPage) {
			const meta = userFromPage.publicMetadata || {};
			setShowNamePubliclyLocal(
				typeof meta.showPublicName === "boolean" ? meta.showPublicName : true,
			);
			setDisplayNameTypeLocal(meta.displayNameType || "fullName");
		}
	}, [isLoadedFromPage, userFromPage]);

	const mutation = useMutation({
		mutationFn: updateUserSettings,
		onSuccess: (data, variables) => {
			toast.success("Preferences updated!");
			queryClient.setQueryData(["usersDetails"], (oldData) => {
				if (!oldData) {
					return oldData;
				}
				const newData = {
					...oldData,
					publicMetadata: {
						...oldData.publicMetadata,
						...data.settings,
					},
				};
				return newData;
			});
			onBackToMenu();
		},
		onError: (error, variables) => {
			toast.error(`Error: ${error.message}`);
			setShowNamePubliclyLocal(variables.showPublicName);
			if (variables.displayNameType) {
				setDisplayNameTypeLocal(variables.displayNameType);
			}
		},
	});

	const handleSaveSettings = () => {
		if (!isSignedInFromPage || !userFromPage || !userFromPage.id) {
			toast.error(
				"You must be signed in to change settings, or user ID is missing.",
			);
			return;
		}
		mutation.mutate({
			userId: userFromPage.id,
			showPublicName: showNamePubliclyLocal,
			displayNameType: displayNameTypeLocal,
		});
	};

	if (!isLoadedFromPage) {
		return <p className="text-center text-slate-300">Loading settings...</p>;
	}

	if (!isSignedInFromPage) {
		return (
			<div className="w-full max-w-md rounded-xl bg-slate-800 p-6 text-center text-white shadow-2xl">
				<p className="mb-4 text-slate-300">
					Please sign in to manage your display settings.
				</p>
				<button
					onClick={onBackToMenu}
					className="rounded-lg bg-blue-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors duration-150 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-75"
				>
					Back to Menu
				</button>
			</div>
		);
	}

	const actualUserFirstName = userFromPage?.firstName || "";
	const actualUserLastName = userFromPage?.lastName || "";
	const actualUsername = userFromPage?.username || "";

	return (
		<div className="w-full max-w-md mx-auto rounded-xl bg-slate-800 p-6 text-white shadow-2xl">
			<h2 className="mb-6 text-center text-3xl font-bold text-yellow-400">
				Display Settings
			</h2>

			<div className="mb-6 space-y-4">
				<div className="flex items-center justify-between rounded-lg bg-slate-700 p-4">
					<label htmlFor="showNameToggle" className="text-lg text-slate-200">
						Show my name on scoreboard
					</label>
					<button
						id="showNameToggle"
						onClick={() => setShowNamePubliclyLocal(!showNamePubliclyLocal)}
						disabled={mutation.isPending}
						className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
							showNamePubliclyLocal ? "bg-green-500" : "bg-slate-600"
						}`}
						role="switch"
						aria-checked={showNamePubliclyLocal}
					>
						<span
							aria-hidden="true"
							className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
								showNamePubliclyLocal ? "translate-x-5" : "translate-x-0"
							}`}
						/>
					</button>
				</div>

				{showNamePubliclyLocal && (
					<div className="rounded-lg bg-slate-700 p-4">
						<p className="mb-3 text-lg text-slate-200">Display my name as:</p>
						<div className="space-y-2">
							<div>
								<label className="inline-flex items-center">
									<input
										type="radio"
										className="form-radio h-5 w-5 accent-sky-500"
										name="namePreference"
										value="fullName"
										checked={displayNameTypeLocal === "fullName"}
										onChange={(e) => setDisplayNameTypeLocal(e.target.value)}
										disabled={mutation.isPending}
									/>
									<span className="ml-2 text-slate-100">
										Full Name (
										{`${actualUserFirstName} ${actualUserLastName}`.trim() ||
											"Not set"}
										)
									</span>
								</label>
							</div>
							<div>
								<label className="inline-flex items-center">
									<input
										type="radio"
										className="form-radio h-5 w-5 accent-sky-500"
										name="namePreference"
										value="username"
										checked={displayNameTypeLocal === "username"}
										onChange={(e) => setDisplayNameTypeLocal(e.target.value)}
										disabled={mutation.isPending || !actualUsername}
									/>
									<span className="ml-2 text-slate-100">
										Username ({actualUsername || "Not set"})
										{!actualUsername && (
											<span className="ml-1 text-xs text-yellow-400">
												(Set in your profile)
											</span>
										)}
									</span>
								</label>
							</div>
						</div>
					</div>
				)}
			</div>

			{mutation.isPending && (
				<p className="mb-4 text-center text-sm text-sky-400">Updating...</p>
			)}

			<div className="mt-8 flex flex-col items-center space-y-3">
				<button
					onClick={handleSaveSettings}
					disabled={mutation.isPending}
					className="w-full rounded-lg bg-green-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors duration-150 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-opacity-75 disabled:opacity-50"
				>
					Save Settings
				</button>
				<button
					onClick={onBackToMenu}
					className="w-full rounded-lg bg-blue-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors duration-150 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-75"
				>
					Back to Menu
				</button>
			</div>
		</div>
	);
}
