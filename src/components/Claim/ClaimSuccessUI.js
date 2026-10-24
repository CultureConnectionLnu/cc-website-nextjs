"use client";

import {
	faArrowRight,
	faCheckCircle,
	faLock,
	faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import confetti from "canvas-confetti"; // Import confetti
import { motion } from "framer-motion";
import Link from "next/link";
import React, { useEffect, useMemo } from "react";

export default function ClaimSuccessUI({ result }) {
	const { achievement, newCount, achievedNow, message } = result;

	// --- TRIGGER CONFETTI ON MOUNT ---
	useEffect(() => {
		// Only fire confetti if they actually unlocked something or made progress
		// You can remove the 'if' if you want it every single time
		if (achievedNow || newCount > 0) {
			const duration = 3000;
			const animationEnd = Date.now() + duration;
			const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

			const randomInRange = (min, max) => Math.random() * (max - min) + min;

			const interval = setInterval(() => {
				const timeLeft = animationEnd - Date.now();

				if (timeLeft <= 0) {
					return clearInterval(interval);
				}

				const particleCount = 50 * (timeLeft / duration);

				// Fire from two sides
				confetti({
					...defaults,
					particleCount,
					origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
				});
				confetti({
					...defaults,
					particleCount,
					origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
				});
			}, 250);
		}
	}, [achievedNow, newCount]);

	// 1. Parse Levels
	const levels = useMemo(() => {
		if (!achievement.level_config) return [];
		try {
			return JSON.parse(achievement.level_config).sort(
				(a, b) => a.progressNeeded - b.progressNeeded,
			);
		} catch (e) {
			return [];
		}
	}, [achievement.level_config]);

	// 2. Determine State
	const isLeveled = levels.length > 0;
	const nextLevel = levels.find((l) => l.progressNeeded > newCount);
	const currentLevel = [...levels]
		.reverse()
		.find((l) => l.progressNeeded <= newCount);
	const isMaxed = !nextLevel && levels.length > 0;
	const target = nextLevel
		? nextLevel.progressNeeded
		: currentLevel
			? currentLevel.progressNeeded
			: achievement.attendanceNeed || 10;
	const progressPercent = Math.min(100, Math.max(0, (newCount / target) * 100));

	// Display Vars
	const displayImage = currentLevel
		? currentLevel.levelImgUrl || achievement.imgurl
		: achievement.imgurl;

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden relative">
			{/* Background Decoration */}
			<div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent -z-10"></div>
			<div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-60 -z-10"></div>
			<div className="absolute top-40 -left-20 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-60 -z-10"></div>

			{/* MAIN CARD */}
			<motion.div
				initial={{ scale: 0.95, opacity: 0, y: 20 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				transition={{ type: "spring", duration: 0.6 }}
				className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl shadow-indigo-100/50 border border-white relative z-10"
			>
				<h1 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
					{achievedNow ? "Badge Unlocked!" : "Progress Saved!"}
				</h1>
				<p className="text-gray-500 text-sm mb-8 font-medium">{message}</p>

				{/* Badge Image */}
				<div className="mb-8 relative group inline-block">
					{/* Subtle backdrop for image */}
					<div className="absolute inset-0 bg-indigo-50 rounded-full scale-90 blur-xl opacity-50"></div>

					<motion.img
						src={displayImage}
						alt="Badge"
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className="w-40 h-40 object-contain relative z-10 drop-shadow-md hover:scale-105 transition-transform duration-300"
					/>

					{currentLevel && (
						<motion.div
							initial={{ y: 10, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							delay={0.3}
							className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-indigo-600 text-xs font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap z-20 border border-indigo-50 flex items-center gap-1"
						>
							<FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
							{currentLevel.levelTitle}
						</motion.div>
					)}
				</div>

				{/* PROGRESS BAR SECTION */}
				{isLeveled && !isMaxed && (
					<div className="mb-8 w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
						<div className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
							<span>Current: {newCount}</span>
							<span>Goal: {target}</span>
						</div>
						<div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
							<motion.div
								className="h-full bg-indigo-500 rounded-full"
								initial={{ width: 0 }}
								animate={{ width: `${progressPercent}%` }}
								transition={{ duration: 1, ease: "easeOut" }}
							/>
						</div>
						<p className="text-xs text-center text-gray-500 mt-3">
							<span className="font-semibold text-indigo-600">
								{target - newCount} scans
							</span>{" "}
							until
							<span className="font-bold text-gray-800">
								{" "}
								{nextLevel?.levelTitle || "Next Level"}
							</span>
						</p>
					</div>
				)}

				{isMaxed && isLeveled && (
					<div className="mb-8 p-3 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100 font-bold text-sm flex items-center justify-center gap-2">
						<FontAwesomeIcon icon={faTrophy} /> MAX LEVEL ACHIEVED
					</div>
				)}
				{/* NEXT REWARDS SLIDER */}
				{isLeveled && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="mt-8 w-full max-w-md"
					>
						<h3 className="text-gray-400 text-xs font-bold mb-4 uppercase tracking-widest text-center">
							Badge Milestones
						</h3>

						{/* FIX: Increased padding (py-8) to prevent scale-110 from being clipped */}
						<div className="flex gap-4 overflow-x-auto px-6 py-8 -my-4 snap-x scrollbar-hide justify-center md:justify-start items-center">
							{levels.map((level, idx) => {
								const isUnlocked = newCount >= level.progressNeeded;
								const isNext =
									!isUnlocked &&
									(idx === 0 || newCount >= levels[idx - 1].progressNeeded);

								return (
									<div
										key={idx}
										className={`snap-center shrink-0 w-24 h-32 p-2 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 relative ${
											isUnlocked
												? "bg-white border-indigo-100 shadow-sm opacity-100"
												: isNext
													? "bg-white border-indigo-200 shadow-xl scale-110 z-20" // z-20 ensures it floats above others
													: "bg-gray-50 border-transparent opacity-50 grayscale"
										}`}
									>
										<div className="relative w-10 h-10">
											<img
												src={level.levelImgUrl || achievement.imgurl}
												className="w-full h-full object-contain"
											/>
											{isUnlocked && (
												<div className="absolute -right-1 -bottom-1 bg-green-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
													<FontAwesomeIcon icon={faCheckCircle} />
												</div>
											)}
											{!isUnlocked && (
												<div className="absolute inset-0 bg-white/40 flex items-center justify-center">
													<FontAwesomeIcon
														icon={faLock}
														className="text-gray-400 text-xs"
													/>
												</div>
											)}
										</div>
										<div className="text-center">
											<p
												className={`text-[10px] font-bold leading-tight ${isUnlocked ? "text-indigo-600" : "text-gray-600"}`}
											>
												{level.levelTitle}
											</p>
											<p className="text-[9px] text-gray-400 font-medium mt-1">
												{level.progressNeeded} pts
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</motion.div>
				)}

				<Link
					href="/achievements"
					className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
				>
					Back to Badge Page <FontAwesomeIcon icon={faArrowRight} />
				</Link>
			</motion.div>
		</div>
	);
}
