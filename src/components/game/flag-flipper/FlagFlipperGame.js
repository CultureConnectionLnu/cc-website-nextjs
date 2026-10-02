"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as FlagDataModule from "@/lib/flag-data";

const { flags, getRandomFlag, getRandomOptions } = FlagDataModule;

import { useUser } from "@clerk/nextjs";
import {
	faDoorOpen,
	faGraduationCap,
	faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

// --- SECURITY IMPORT ---
import { encryptScore } from "@/lib/secure-score";

const WRONG_ANSWER_FREEZE_DURATION = 1000;
const PENALTY_POINTS = 175;
const TICK_RATE_MS = 100;

const BADGE_IDS = {
	classic: "ach_1768975584162_mim40",
	blitz: "ach_1768978249619_dbo96",
};

const fetchAchievements = async () => {
	const response = await fetch("/api/achievements");
	if (!response.ok) return [];
	return response.json();
};

export function FlagFlipperGame({ onGameEnd, gameMode = "classic" }) {
	const { user, isLoaded, isSignedIn } = useUser();
	const [currentFlag, setCurrentFlag] = useState(null);
	const [options, setOptions] = useState([]);
	const [score, setScore] = useState(0);
	const [streak, setStreak] = useState(0);

	const [timeLeft, setTimeLeft] = useState(
		gameMode === "blitz" ? 3.0 : gameMode === "training" ? 9999 : 15.0,
	);

	const [internalGameState, setInternalGameState] = useState("loading");
	const [feedback, setFeedback] = useState("");
	const [isTransitioning, setIsTransitioning] = useState(false);

	const [nextMilestone, setNextMilestone] = useState(null);

	const gameContainerRef = useRef(null);
	const wrongAnswerFreezeTimeoutRef = useRef(null);
	const lastTickRef = useRef(Date.now());
	const gameStartTimeRef = useRef(Date.now());

	const isTraining = gameMode === "training";
	const gameNameForDB =
		gameMode === "blitz" ? "flag_flipper_blitz" : "flag_flipper";

	const { data: allAchievements } = useQuery({
		queryKey: ["achievements"],
		queryFn: fetchAchievements,
		enabled: !!user && !isTraining,
		staleTime: 1000 * 60 * 5,
	});

	useEffect(() => {
		if (!allAchievements || isTraining) return;

		const targetId = gameMode === "blitz" ? BADGE_IDS.blitz : BADGE_IDS.classic;
		const badgeEntry = allAchievements.find(
			(a) => a.id === targetId || a.original_id === targetId,
		);

		if (badgeEntry && badgeEntry.level_config) {
			const levels = [...badgeEntry.level_config].sort(
				(a, b) => a.progressNeeded - b.progressNeeded,
			);
			const currentHighScore = badgeEntry.currentUserProgress || 0;
			const nextLevel = levels.find((l) => l.progressNeeded > currentHighScore);

			if (nextLevel) {
				setNextMilestone({
					score: nextLevel.progressNeeded,
					title: nextLevel.levelTitle,
					img: nextLevel.levelImgUrl,
				});
			}
		}
	}, [allAchievements, gameMode, isTraining]);

	const { mutate: saveScore, isPending: isSavingScore } = useMutation({
		mutationFn: async ({ score: finalScore, isCheckpoint = false }) => {
			if (isTraining) return;

			if (!user?.id) throw new Error("User ID missing");

			const realDurationMs = Date.now() - gameStartTimeRef.current;

			// --- SECURITY UPDATE: ENCRYPT PAYLOAD ---
			const encryptedPayload = encryptScore(finalScore);

			const response = await fetch("/api/game/score", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					data: encryptedPayload, // The encrypted score + timestamp
					gameName: gameNameForDB,
					duration: realDurationMs,
				}),
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || "Failed to save score");
			}
			return {
				response: await response.json(),
				isCheckpoint,
				score: finalScore,
			};
		},
		onSuccess: ({ isCheckpoint, score }) => {
			if (!isCheckpoint) {
				toast.success("Score saved successfully!");
				confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
			} else {
				toast.custom(
					(t) => (
						<div
							className={`${
								t.visible ? "animate-enter" : "animate-leave"
							} max-w-md w-full bg-white shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-yellow-400`}
						>
							<div className="flex-1 w-0 p-4">
								<div className="flex items-start">
									<div className="flex-shrink-0 pt-0.5">
										<div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
											<FontAwesomeIcon
												icon={faTrophy}
												className="text-yellow-600"
											/>
										</div>
									</div>
									<div className="ml-3 flex-1">
										<p className="text-sm font-medium text-gray-900">
											Badge Unlocked!
										</p>
										<p className="mt-1 text-sm text-gray-500">
											You reached <strong>{score}</strong> points!
										</p>
									</div>
								</div>
							</div>
						</div>
					),
					{ duration: 4000 },
				);

				confetti({
					particleCount: 50,
					spread: 60,
					origin: { y: 0.8 },
					colors: ["#FFD700", "#FFA500"],
				});
			}
		},
	});

	const getPointsForStreak = (currentStreak) => {
		if (currentStreak >= 20) return 500;
		if (currentStreak >= 15) return 400;
		if (currentStreak >= 10) return 300;
		if (currentStreak >= 5) return 200;
		return 100;
	};

	const getStepDownStreak = (currentStreak) => {
		if (currentStreak >= 20) return 15;
		if (currentStreak >= 15) return 10;
		if (currentStreak >= 10) return 5;
		return 0;
	};

	const getBlitzTimeBonus = (currentStreak) => {
		if (currentStreak >= 20) return 0.6;
		if (currentStreak >= 15) return 0.7;
		if (currentStreak >= 10) return 0.8;
		if (currentStreak >= 5) return 0.9;
		return 1.0;
	};

	const currentTier = Math.min(4, Math.floor(streak / 5));
	const bubblesFilled = currentTier === 4 ? 5 : streak % 5;

	const setupNewRound = useCallback(() => {
		setFeedback("");
		if (
			typeof getRandomFlag === "function" &&
			typeof getRandomOptions === "function"
		) {
			const newFlag = getRandomFlag(flags);
			if (newFlag) {
				setCurrentFlag(newFlag);
				const newOptions = getRandomOptions(newFlag, flags, 2);
				setOptions(newOptions);
			} else {
				setInternalGameState("over");
			}
		} else {
			setInternalGameState("over");
		}
		setIsTransitioning(false);
	}, []);

	const handleAnswer = useCallback(
		(chosenFlag) => {
			if (internalGameState !== "playing" || isTransitioning || !currentFlag) {
				return;
			}
			setIsTransitioning(true);

			const tierStreak = streak;

			if (chosenFlag.name === currentFlag.name) {
				const nextStreak = streak + 1;
				const pointsEarned = getPointsForStreak(nextStreak);
				const newScore = score + pointsEarned;

				setStreak(nextStreak);
				setScore(newScore);

				if (nextMilestone && newScore >= nextMilestone.score) {
					saveScore({ score: newScore, isCheckpoint: true });
					setNextMilestone(null);
				}

				if (gameMode === "blitz") {
					const timeBonus = getBlitzTimeBonus(tierStreak);
					setTimeLeft((prev) => prev + timeBonus);
					setFeedback(`Correct! +${pointsEarned} (+${timeBonus}s)`);
				} else if (isTraining) {
					setFeedback("Correct!");
				} else {
					setFeedback(`Correct! +${pointsEarned}`);
				}

				if (isTraining || timeLeft > 0) {
					setupNewRound();
				} else {
					setInternalGameState("over");
					setIsTransitioning(false);
				}
			} else {
				const newStreak = getStepDownStreak(streak);
				setStreak(newStreak);

				if (gameMode !== "blitz") {
					setScore((prev) => Math.max(0, prev - PENALTY_POINTS));
				}

				if (gameMode === "blitz") {
					setFeedback(`Wrong! (-2s)`);
					setTimeLeft((prev) => Math.max(0, prev - 2));
				} else if (isTraining) {
					setFeedback("Wrong!");
				} else {
					setFeedback(`Wrong! -${PENALTY_POINTS}`);
				}

				if (wrongAnswerFreezeTimeoutRef.current) {
					clearTimeout(wrongAnswerFreezeTimeoutRef.current);
				}
				wrongAnswerFreezeTimeoutRef.current = setTimeout(() => {
					if (isTraining || (timeLeft > 0 && internalGameState === "playing")) {
						setupNewRound();
					} else {
						setInternalGameState("over");
						setIsTransitioning(false);
					}
				}, WRONG_ANSWER_FREEZE_DURATION);
			}
		},
		[
			internalGameState,
			isTransitioning,
			currentFlag,
			timeLeft,
			streak,
			setupNewRound,
			gameMode,
			isTraining,
			score,
			nextMilestone,
			saveScore,
		],
	);

	useEffect(() => {
		return () => {
			if (wrongAnswerFreezeTimeoutRef.current) {
				clearTimeout(wrongAnswerFreezeTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		setTimeLeft(gameMode === "blitz" ? 3.0 : isTraining ? 9999 : 15.0);
		setScore(0);
		setStreak(0);
		setFeedback("");
		setCurrentFlag(null);
		setOptions([]);
		gameContainerRef.current?.focus();
		setIsTransitioning(true);
		setupNewRound();
		setInternalGameState("playing");
		gameStartTimeRef.current = Date.now();
	}, [setupNewRound, gameMode, isTraining]);

	useEffect(() => {
		if (isTraining || internalGameState !== "playing") {
			return;
		}

		lastTickRef.current = Date.now();

		const timerId = setInterval(() => {
			const now = Date.now();
			const delta = (now - lastTickRef.current) / 1000;
			lastTickRef.current = now;

			setTimeLeft((prevTime) => {
				if (prevTime <= 0) {
					clearInterval(timerId);
					setInternalGameState("over");
					return 0;
				}
				return Math.max(0, prevTime - delta);
			});
		}, TICK_RATE_MS);

		return () => clearInterval(timerId);
	}, [internalGameState, isTraining]);

	useEffect(() => {
		if (internalGameState === "over") {
			if (wrongAnswerFreezeTimeoutRef.current) {
				clearTimeout(wrongAnswerFreezeTimeoutRef.current);
			}
			if (!isTraining && score > 0 && !isSavingScore) {
				if (isLoaded && isSignedIn && user && user.id) {
					saveScore({ score: score, isCheckpoint: false });
				} else {
					toast.error("Could not save score: User session issue.");
				}
			}
			setIsTransitioning(false);
			if (onGameEnd && !isTraining) {
				onGameEnd(score);
			}
		}
	}, [
		internalGameState,
		score,
		saveScore,
		onGameEnd,
		isSavingScore,
		user,
		isLoaded,
		isSignedIn,
		gameNameForDB,
		isTraining,
	]);

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (
				internalGameState !== "playing" ||
				isTransitioning ||
				options.length < 2
			)
				return;
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				handleAnswer(options[0]);
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				handleAnswer(options[1]);
			}
		};
		if (internalGameState === "playing") {
			window.addEventListener("keydown", handleKeyDown);
		} else {
			window.removeEventListener("keydown", handleKeyDown);
		}
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [internalGameState, isTransitioning, options, handleAnswer]);

	const handleLeaveGame = () => {
		if (onGameEnd) {
			onGameEnd(score);
		}
	};

	if (
		internalGameState === "loading" ||
		(internalGameState === "playing" && isTransitioning && !feedback)
	) {
		return (
			<div
				ref={gameContainerRef}
				tabIndex={-1}
				className="w-full max-w-2xl text-center text-xl text-slate-300 outline-none"
			>
				Loading next flag...
			</div>
		);
	}

	if (internalGameState === "over" && !isTraining) {
		return (
			<div className="flex flex-col items-center rounded-lg bg-slate-800 p-8 text-center shadow-xl">
				<h2 className="mb-4 text-4xl font-bold text-yellow-400">Game Over!</h2>
				<p className="mb-2 text-2xl text-slate-200">
					Mode:{" "}
					<span
						className={gameMode === "blitz" ? "text-red-400" : "text-sky-400"}
					>
						{gameMode === "blitz" ? "Risky Blitz" : "Classic"}
					</span>
				</p>
				<p className="mb-2 text-2xl text-slate-200">
					Final Score: <span className="font-bold text-white">{score}</span>
				</p>
				<p className="mb-6 text-lg text-slate-400">
					Max Streak: <span className="font-bold text-sky-400">{streak}</span>
				</p>
				{isSavingScore && (
					<p className="text-lg text-sky-400">Saving your score...</p>
				)}
			</div>
		);
	}

	return (
		<div
			ref={gameContainerRef}
			tabIndex={-1}
			className={`w-full max-w-2xl rounded-xl p-6 shadow-2xl md:p-8 outline-none flex flex-col h-[600px] transition-colors duration-500 relative ${
				gameMode === "blitz"
					? "bg-slate-800 border-2 border-red-900/50"
					: "bg-slate-800"
			}`}
		>
			<div className="mb-2 flex items-center justify-between h-20 shrink-0 border-b border-slate-700 pb-2">
				{isTraining ? (
					<div className="w-full flex items-center justify-center">
						<div className="px-4 py-2 bg-slate-700 rounded-lg text-slate-300 font-bold uppercase tracking-widest text-lg border border-slate-600 flex items-center">
							<FontAwesomeIcon icon={faGraduationCap} className="mr-2" />
							Training Mode
						</div>
					</div>
				) : (
					<>
						<div className="flex flex-col justify-center space-y-2">
							<div className="text-2xl font-bold text-white leading-none">
								Score: <span className="text-yellow-400">{score}</span>
							</div>

							<div className="flex items-center gap-2">
								<div
									className={`px-2 py-0.5 rounded text-xs font-bold uppercase transition-colors duration-300 ${
										currentTier >= 4
											? "bg-purple-500 text-white animate-pulse"
											: currentTier >= 2
												? "bg-yellow-500 text-slate-900"
												: "bg-slate-600 text-slate-300"
									}`}
								>
									x{currentTier + 1}
								</div>
								<div className="flex gap-1">
									{[...Array(5)].map((_, i) => (
										<div
											key={i}
											className={`h-3 w-3 rounded-full border border-slate-500 transition-all duration-300 ${
												i < bubblesFilled
													? "bg-sky-400 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)] scale-110"
													: "bg-transparent scale-100"
											}`}
										/>
									))}
								</div>
							</div>
						</div>

						<div
							className={`text-3xl font-mono font-bold text-white px-4 py-2 rounded-lg shadow-inner min-w-[110px] text-center ${
								gameMode === "blitz" && timeLeft <= 5
									? "bg-red-600 animate-pulse"
									: "bg-slate-700"
							}`}
						>
							{timeLeft.toFixed(1)}
							<span className="text-sm ml-1 text-slate-300">s</span>
						</div>
					</>
				)}
			</div>

			{currentFlag && options.length === 2 && (
				<div className="flex flex-col flex-1 mt-4">
					<div className="mb-6 flex h-24 shrink-0 items-center justify-center rounded-lg bg-slate-700 p-4 shadow-inner">
						<h2 className="text-3xl font-bold text-white md:text-5xl drop-shadow-md text-center tracking-wide">
							{currentFlag.name}
						</h2>
					</div>

					<div className="h-14 mb-2 flex items-center justify-center shrink-0">
						{feedback ? (
							<div
								className={`rounded px-6 py-2 text-center text-lg font-bold w-full max-w-sm transition-transform animate-bounce ${
									feedback.startsWith("Correct")
										? "bg-green-600 text-white shadow-lg shadow-green-900/50"
										: "bg-red-600 text-white shadow-lg shadow-red-900/50"
								}`}
							>
								{feedback}
							</div>
						) : (
							<div className="w-full h-full"></div>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4 md:gap-8 flex-1 min-h-0">
						{options.map((option, index) => (
							<button
								key={option.code || index}
								onClick={() => handleAnswer(option)}
								disabled={isTransitioning}
								className="group relative flex h-full w-full flex-col items-center justify-center rounded-xl bg-slate-700 p-4 shadow-lg transition-all duration-150 hover:bg-sky-600 hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden"
							>
								<div className="relative w-full h-full flex items-center justify-center">
									<img
										src={option.imageUrl}
										alt={`Flag Option ${index + 1}`}
										className="max-h-full max-w-full object-contain shadow-sm pointer-events-none"
									/>
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			{isTraining && (
				<div className="mt-4 flex justify-center">
					<button
						onClick={handleLeaveGame}
						className="flex items-center gap-2 px-6 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-sm font-semibold"
					>
						<FontAwesomeIcon icon={faDoorOpen} />
						Leave Game
					</button>
				</div>
			)}
		</div>
	);
}
