"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// CHANGED: Limit to 5
async function fetchRawScores(gameName) {
	const response = await fetch(
		`/api/game/score?gameName=${encodeURIComponent(gameName)}&limit=5`,
	);
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.message || "Failed to fetch scores");
	}
	return response.json();
}

async function fetchUserRank(gameName, userId) {
	if (!userId) return null;
	const response = await fetch(
		`/api/game/score?gameName=${encodeURIComponent(gameName)}&targetUserId=${encodeURIComponent(userId)}`,
	);
	if (!response.ok) {
		return null;
	}
	return response.json();
}

async function fetchUsersDetails(userIds) {
	if (!userIds || userIds.length === 0) {
		return {};
	}
	const response = await fetch(`/api/user/details`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ userIds }),
	});
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.message || "Failed to fetch user details");
	}
	return response.json();
}

async function deleteScoresForGame(gameName) {
	const response = await fetch(
		`/api/game/score?gameName=${encodeURIComponent(gameName)}`,
		{
			method: "DELETE",
		},
	);
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(
			errorData.message || "Failed to delete scores for the game",
		);
	}
	return response.json();
}

// Animation Variants
const containerVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, x: -20 },
	show: { opacity: 1, x: 0 },
};

export function Scoreboard({ onBackToMenu, initialGameMode = "classic" }) {
	const { user, isLoaded: isUserLoaded } = useUser();
	const queryClient = useQueryClient();

	const [viewMode, setViewMode] = useState(initialGameMode);
	const activeGameName =
		viewMode === "blitz" ? "flag_flipper_blitz" : "flag_flipper";

	const isAdmin = isUserLoaded && user?.publicMetadata?.admin === true;

	const {
		data: rawScores,
		isLoading: isLoadingScores,
		error: scoresError,
	} = useQuery({
		queryKey: ["rawGameScores", activeGameName],
		queryFn: () => fetchRawScores(activeGameName),
		enabled: true,
	});

	const { data: userRankData, isLoading: isLoadingRank } = useQuery({
		queryKey: ["userRank", activeGameName, user?.id],
		queryFn: () => fetchUserRank(activeGameName, user.id),
		enabled: !!user?.id,
	});

	const userIdsToFetch = React.useMemo(() => {
		if (!rawScores) return [];
		const ids = new Set(rawScores.map((s) => s.user_id).filter((id) => id));
		if (user?.id) ids.add(user.id);
		return Array.from(ids);
	}, [rawScores, user]);

	const {
		data: usersDetailsMap,
		isLoading: isLoadingUserDetails,
		error: userDetailsError,
	} = useQuery({
		queryKey: ["usersDetails", userIdsToFetch.join(",")],
		queryFn: () => fetchUsersDetails(userIdsToFetch),
		enabled: userIdsToFetch.length > 0,
	});

	const resetScoreboardMutation = useMutation({
		mutationFn: deleteScoresForGame,
		onSuccess: (data) => {
			toast.success(data.message || "Scoreboard reset successfully!");
			queryClient.invalidateQueries({
				queryKey: ["rawGameScores", activeGameName],
			});
			queryClient.invalidateQueries({ queryKey: ["userRank", activeGameName] });
		},
		onError: (error) => {
			toast.error(`Error resetting scoreboard: ${error.message}`);
		},
	});

	const handleResetScoreboard = () => {
		if (
			window.confirm(
				`Are you sure you want to reset all scores for "${activeGameName}"? This action cannot be undone.`,
			)
		) {
			resetScoreboardMutation.mutate(activeGameName);
		}
	};

	const enrichedScores = React.useMemo(() => {
		if (!rawScores || !usersDetailsMap) return [];
		return rawScores.map((scoreItem) => {
			const userData = usersDetailsMap[scoreItem.user_id];
			return {
				...scoreItem,
				user_name: userData ? userData.name : "Player",
			};
		});
	}, [rawScores, usersDetailsMap]);

	const isLoading =
		isLoadingScores || (userIdsToFetch.length > 0 && isLoadingUserDetails);
	const error = scoresError || userDetailsError;

	const isUserInTop5 = React.useMemo(() => {
		if (!rawScores || !user) return false;
		return rawScores.some((s) => s.user_id === user.id);
	}, [rawScores, user]);

	const showUserRankRow =
		user && userRankData?.found && !isUserInTop5 && !isLoading;

	const currentUserDisplayName = React.useMemo(() => {
		if (!user || !usersDetailsMap) return "You";
		const userData = usersDetailsMap[user.id];
		return userData ? userData.name : "You";
	}, [user, usersDetailsMap]);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className="w-full max-w-md mx-auto rounded-xl bg-slate-800 p-6 text-white shadow-2xl border border-slate-700/50"
		>
			<h2 className="mb-4 text-center text-3xl font-bold text-yellow-400">
				Top 5 Leaders
			</h2>

			{/* Internal Toggle */}
			<div className="flex justify-center mb-6">
				<div className="relative flex items-center bg-slate-700 p-1 rounded-full shadow-inner w-64">
					<div className="absolute inset-1">
						{viewMode === "classic" ? (
							<motion.div
								layoutId="sb-pill"
								className="w-1/2 h-full bg-sky-600 rounded-full shadow-md"
								transition={{ type: "spring", stiffness: 300, damping: 20 }}
							/>
						) : (
							<motion.div
								layoutId="sb-pill"
								className="w-1/2 h-full ml-auto bg-red-600 rounded-full shadow-md"
								transition={{ type: "spring", stiffness: 300, damping: 20 }}
							/>
						)}
					</div>

					<button
						onClick={() => setViewMode("classic")}
						className={`relative w-1/2 z-10 py-1 text-sm font-bold transition-colors ${viewMode === "classic" ? "text-white" : "text-slate-400 hover:text-white"}`}
					>
						Classic
					</button>
					<button
						onClick={() => setViewMode("blitz")}
						className={`relative w-1/2 z-10 py-1 text-sm font-bold transition-colors ${viewMode === "blitz" ? "text-white" : "text-slate-400 hover:text-white"}`}
					>
						Blitz
					</button>
				</div>
			</div>

			{/* FIXED HEIGHT CONTAINER TO PREVENT JUMPING */}
			<div className="relative min-h-[350px] flex flex-col">
				{error && (
					<div className="absolute inset-0 flex items-center justify-center text-red-400 text-center px-4">
						Error loading scores: {error.message}
					</div>
				)}

				{/* LOADING STATE - Skeleton */}
				{isLoading && !error && (
					<div className="space-y-3 w-full">
						{[...Array(5)].map((_, i) => (
							<div
								key={i}
								className="h-12 w-full bg-slate-700/50 rounded-lg animate-pulse"
							/>
						))}
					</div>
				)}

				{/* EMPTY STATE */}
				{!isLoading && !error && enrichedScores.length === 0 && (
					<div className="absolute inset-0 flex items-center justify-center text-slate-400 italic">
						No scores recorded yet for{" "}
						{viewMode === "blitz" ? "Blitz" : "Classic"}.
					</div>
				)}

				{/* SCORES LIST */}
				{!isLoading && !error && enrichedScores.length > 0 && (
					<motion.ul
						variants={containerVariants}
						initial="hidden"
						animate="show"
						className="space-y-3 w-full"
					>
						{enrichedScores.map((scoreItem, index) => {
							const isCurrentUser = user && scoreItem.user_id === user.id;
							return (
								<motion.li
									key={scoreItem.id || index}
									variants={itemVariants}
									className={`flex justify-between items-center rounded-lg p-3 text-lg transition-colors ${
										isCurrentUser
											? "bg-sky-900/60 border border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
											: "bg-slate-700 hover:bg-slate-600"
									}`}
								>
									<div className="flex items-center gap-3">
										<span
											className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
												index === 0
													? "bg-yellow-500 text-slate-900"
													: index === 1
														? "bg-slate-400 text-slate-900"
														: index === 2
															? "bg-amber-700 text-white"
															: "bg-slate-800 text-slate-400"
											}`}
										>
											{index + 1}
										</span>
										<span
											className={`font-medium truncate max-w-[140px] ${isCurrentUser ? "text-sky-200" : "text-slate-200"}`}
										>
											{scoreItem.user_name}
										</span>
									</div>
									<span
										className={`font-mono font-bold ${isCurrentUser ? "text-yellow-300" : "text-yellow-500"}`}
									>
										{scoreItem.score}
									</span>
								</motion.li>
							);
						})}
					</motion.ul>
				)}

				{/* USER RANK ROW (Sticky at bottom of this container if needed, or just appended) */}
				{showUserRankRow && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="mt-auto pt-4" // Pushes to bottom of container
					>
						<div className="flex items-center justify-center mb-2">
							<div className="h-px w-full bg-slate-600/50"></div>
						</div>

						<div className="flex justify-between items-center rounded-lg bg-slate-800 border border-slate-600 p-3 text-lg opacity-80">
							<div className="flex items-center gap-3">
								<span className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-slate-700 text-slate-300">
									{userRankData.rank}
								</span>
								<span className="font-medium text-slate-300">
									{currentUserDisplayName}
								</span>
							</div>
							<span className="font-mono font-bold text-slate-400">
								{userRankData.score}
							</span>
						</div>
					</motion.div>
				)}
			</div>

			<div className="mt-6 flex flex-col items-center space-y-3">
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={onBackToMenu}
					className="w-full max-w-xs rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-md hover:bg-blue-500"
				>
					Back to Menu
				</motion.button>

				{isAdmin && (
					<button
						onClick={handleResetScoreboard}
						disabled={resetScoreboardMutation.isPending}
						className="text-xs text-red-400/50 hover:text-red-400 transition-colors"
					>
						{resetScoreboardMutation.isPending
							? "Resetting..."
							: "Reset Scoreboard (Admin)"}
					</button>
				)}
			</div>
		</motion.div>
	);
}
