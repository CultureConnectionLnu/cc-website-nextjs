"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faXmark,
	faChevronLeft,
	faChevronRight,
	faLock,
	faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

const modalVariants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const slideVariants = {
	enter: (direction) => ({
		x: direction > 0 ? 100 : -100,
		opacity: 0,
	}),
	center: {
		zIndex: 1,
		x: 0,
		opacity: 1,
	},
	exit: (direction) => ({
		zIndex: 0,
		x: direction < 0 ? 100 : -100,
		opacity: 0,
	}),
};

const formatDate = (isoDateString) => {
	if (!isoDateString) return null;
	try {
		const dateObj = new Date(isoDateString);
		if (isNaN(dateObj.getTime())) return "Invalid Date";
		return dateObj.toLocaleDateString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch (e) {
		return "Error formatting date";
	}
};

const placeholderImg =
	"https://api2.cultureconnection.se/assets/achievments-badges/5b765b8d-b7af-4c4b-9a85-c6ace210faca.png";

export default function AchievementModal({
	isOpen,
	onClose,
	achievementData,
	isAdminOrCommittee = false,
	onEdit = () => {},
	onDelete = () => {},
	onOpenQrCodeModal = () => {},
}) {
	const [currentSlide, setCurrentSlide] = useState(0);
	const [direction, setDirection] = useState(0);

	// Parse Levels if they exist
	const levels = achievementData?.level_config || [];
	const isLeveled = levels.length > 0;
	const userProgress = achievementData?.currentUserProgress || 0;

	// Determine initial slide index when modal opens
	useEffect(() => {
		if (isOpen && isLeveled) {
			// Sort levels by progress needed
			const sortedLevels = [...levels].sort(
				(a, b) => a.progressNeeded - b.progressNeeded,
			);

			let targetIndex = 0;
			for (let i = 0; i < sortedLevels.length; i++) {
				if (userProgress >= sortedLevels[i].progressNeeded) {
					targetIndex = i; // User has achieved this, potential start point
				} else {
					// If unachieved, show the next goal (or first if none)
					if (i === 0) targetIndex = 0;
					else targetIndex = Math.min(i, sortedLevels.length - 1);
					break;
				}
			}
			setCurrentSlide(targetIndex);
		} else {
			setCurrentSlide(0);
		}
	}, [isOpen, isLeveled, levels, userProgress]);

	if (!isOpen || !achievementData) return null;

	// SORTED LEVELS for display
	const sortedLevels = isLeveled
		? [...levels].sort((a, b) => a.progressNeeded - b.progressNeeded)
		: [];

	// Determine current view data (Level vs Base)
	const currentLevelData = isLeveled ? sortedLevels[currentSlide] : null;

	// Display Data
	const displayTitle = currentLevelData?.levelTitle || achievementData.title;
	const displayImg = currentLevelData?.levelImgUrl || achievementData.imgurl;
	const displayDesc =
		currentLevelData?.levelDescription || achievementData.description;
	const displayAchieveDesc =
		currentLevelData?.levelAchiveDescription ||
		achievementData.currentUserAchievedDescription;

	// --- CHANGED: Use specific global count if available, else fall back to total ---
	const slideGlobalCount =
		currentLevelData?.globalCount ?? achievementData.totalAchievedCount;

	// Status Logic
	const progressTarget = isLeveled
		? currentLevelData.progressNeeded
		: achievementData.attendanceNeed || 1;

	const isSlideAchieved = isLeveled
		? userProgress >= currentLevelData.progressNeeded
		: achievementData.currentUserAchieved;

	const isGlobalAchieved = achievementData.currentUserAchieved;
	const achievedDate = formatDate(achievementData.currentUserAchievedDate);

	// Progress Bar Logic
	let progressPercentage = 0;
	if (userProgress >= progressTarget) {
		progressPercentage = 100;
	} else {
		progressPercentage = Math.min(100, (userProgress / progressTarget) * 100);
	}

	// Navigation Handlers
	const paginate = (newDirection) => {
		const nextIndex = currentSlide + newDirection;
		if (nextIndex >= 0 && nextIndex < sortedLevels.length) {
			setDirection(newDirection);
			setCurrentSlide(nextIndex);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
					initial="hidden"
					animate="visible"
					exit="exit"
					variants={modalVariants}
					onClick={onClose}
				>
					<motion.div
						className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full relative flex flex-col min-h-[500px]"
						onClick={(e) => e.stopPropagation()}
						variants={modalVariants}
					>
						{/* Close Button */}
						<button
							onClick={onClose}
							className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 z-30 bg-white/80 rounded-full p-1 h-8 w-8 flex items-center justify-center backdrop-blur-sm shadow-sm"
							aria-label="Close modal"
						>
							<FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
						</button>

						{/* --- SLIDER CONTENT AREA --- */}
						<div className="flex-grow relative flex flex-col">
							{/* Navigation Arrows (Only if Leveled) */}
							{isLeveled && (
								<>
									{currentSlide > 0 && (
										<button
											onClick={() => paginate(-1)}
											className="absolute left-2 top-1/3 z-20 text-gray-400 hover:text-indigo-600 p-2 transition-colors"
										>
											<FontAwesomeIcon
												icon={faChevronLeft}
												className="h-8 w-8"
											/>
										</button>
									)}
									{currentSlide < sortedLevels.length - 1 && (
										<button
											onClick={() => paginate(1)}
											className="absolute right-2 top-1/3 z-20 text-gray-400 hover:text-indigo-600 p-2 transition-colors"
										>
											<FontAwesomeIcon
												icon={faChevronRight}
												className="h-8 w-8"
											/>
										</button>
									)}
								</>
							)}

							<div className="p-6 flex flex-col items-center flex-grow overflow-hidden relative">
								<AnimatePresence initial={false} custom={direction} mode="wait">
									<motion.div
										key={currentSlide}
										custom={direction}
										variants={slideVariants}
										initial="enter"
										animate="center"
										exit="exit"
										transition={{
											x: { type: "spring", stiffness: 300, damping: 30 },
											opacity: { duration: 0.2 },
										}}
										className="w-full flex flex-col items-center"
									>
										{/* BADGE IMAGE */}
										<div
											className={`w-64 h-64 mb-4 relative flex items-center justify-center`}
										>
											{!isSlideAchieved && (
												<div className="absolute inset-0 rounded-full flex items-center justify-center z-10">
													<FontAwesomeIcon
														icon={faLock}
														className="text-gray-500 h-16 w-16 opacity-50"
													/>
												</div>
											)}

											<img
												src={displayImg || placeholderImg}
												alt={displayTitle}
												className={`w-full h-full object-cover transition-all duration-300 ${!isSlideAchieved ? "grayscale opacity-60" : "drop-shadow-xl"}`}
												onError={(e) => {
													e.currentTarget.src = placeholderImg;
												}}
											/>
										</div>
										{isLeveled && (
											<div className="absolute bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-indigo-200">
												Level {currentSlide + 1} of {sortedLevels.length}
											</div>
										)}
										{/* TITLE & META */}
										<h2
											className={`text-2xl font-bold text-center mb-1 flex items-center gap-2 ${isSlideAchieved ? "text-amber-700" : "text-gray-500"}`}
										>
											{displayTitle}
											{isSlideAchieved && (
												<FontAwesomeIcon
													icon={faCheckCircle}
													className="text-green-500 text-lg"
												/>
											)}
										</h2>

										<p className="text-xs text-center text-gray-400 mb-4">
											Global Achievers:{" "}
											<span className="font-medium text-gray-600">
												{slideGlobalCount}
											</span>
										</p>

										{/* DESCRIPTION */}
										<p className="text-center text-gray-600 mb-6 px-4 leading-relaxed">
											{isSlideAchieved ? displayAchieveDesc : displayDesc}
										</p>

										{/* USER SPECIFIC STATS */}
										{isGlobalAchieved && !isLeveled && achievedDate && (
											<p className="text-xs text-green-600 font-semibold mb-4 bg-green-50 px-3 py-1 rounded-full">
												Earned on {achievedDate}
											</p>
										)}

										{/* PROGRESS BAR */}
										{(achievementData.attendanceCounter ||
											achievementData.onScore) && (
											<div className="w-full max-w-xs space-y-2">
												<div className="flex justify-between text-xs font-semibold text-gray-500 px-1">
													<span>
														{isSlideAchieved ? "Completed" : "Progress"}
													</span>
													<span
														className={
															isSlideAchieved
																? "text-green-600"
																: "text-indigo-600"
														}
													>
														{Math.floor(userProgress)} / {progressTarget}
													</span>
												</div>
												<div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
													<div
														className={`h-full rounded-full transition-all duration-500 ease-out ${
															isSlideAchieved
																? "bg-gradient-to-r from-green-400 to-green-600"
																: "bg-gradient-to-r from-indigo-400 to-indigo-600"
														}`}
														style={{ width: `${progressPercentage}%` }}
													></div>
												</div>
												{!isSlideAchieved && (
													<p className="text-[10px] text-center text-gray-400 italic">
														{progressTarget - userProgress} points needed for
														this level
													</p>
												)}
											</div>
										)}
									</motion.div>
								</AnimatePresence>
							</div>
						</div>

						{/* ADMIN ACTIONS */}
						{isAdminOrCommittee && (
							<div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-center gap-3 z-10">
								<button
									onClick={onOpenQrCodeModal}
									className="px-4 py-2 text-xs font-semibold bg-white text-cyan-600 border border-cyan-200 rounded-lg shadow-sm hover:bg-cyan-50 transition hover:-translate-y-0.5"
								>
									Generate QR
								</button>
								<button
									onClick={onEdit}
									className="px-4 py-2 text-xs font-semibold bg-white text-amber-600 border border-amber-200 rounded-lg shadow-sm hover:bg-amber-50 transition hover:-translate-y-0.5"
								>
									Edit Badge
								</button>
								<button
									onClick={onDelete}
									className="px-4 py-2 text-xs font-semibold bg-white text-red-600 border border-red-200 rounded-lg shadow-sm hover:bg-red-50 transition hover:-translate-y-0.5"
								>
									Delete
								</button>
							</div>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
