"use client";

import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackgroundFlagame } from "@/components/Background";
import Footer from "@/components/Footer";
import { FlagFlipperGame } from "@/components/game/flag-flipper/FlagFlipperGame";
import { Scoreboard } from "@/components/game/flag-flipper/Scoreboard";
import { SettingsView } from "@/components/game/flag-flipper/SettingsView";
import Header from "@/components/Header";

export default function FlagGamePage() {
	const [currentView, setCurrentView] = useState("menu");
	const [selectedMode, setSelectedMode] = useState("classic");
	const [lastGameScore, setLastGameScore] = useState(null);
	const { user, isLoaded, isSignedIn } = useUser();
	const router = useRouter();
	const [countdown, setCountdown] = useState(3);
	const queryClient = useQueryClient();
	const [settingsViewKey, setSettingsViewKey] = useState(Date.now());
	const [showRules, setShowRules] = useState(false);

	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			router.push("/");
		}
	}, [isLoaded, isSignedIn, router]);

	useEffect(() => {
		let timerId;
		if (currentView === "countdown" && countdown > 0) {
			timerId = setTimeout(() => {
				setCountdown(countdown - 1);
			}, 1000);
		} else if (currentView === "countdown" && countdown === 0) {
			setCurrentView("game");
		}
		return () => clearTimeout(timerId);
	}, [currentView, countdown]);

	const handleStartGamePress = () => {
		setLastGameScore(null);
		if (selectedMode === "training") {
			setCountdown(0);
			setCurrentView("game");
		} else {
			setCountdown(3);
			setCurrentView("countdown");
		}
	};

	const handleShowScoreboard = () => {
		if (queryClient) {
			queryClient.invalidateQueries({ queryKey: ["rawGameScores"] });
			queryClient.invalidateQueries({ queryKey: ["usersDetails"] });
		}
		setCurrentView("scoreboard");
	};

	const handleShowSettings = async () => {
		if (user) {
			try {
				await user.reload();
			} catch (error) {
				console.error("Error reloading user data:", error);
			}
		}
		await queryClient.invalidateQueries({ queryKey: ["usersDetails"] });
		setSettingsViewKey(Date.now());
		setCurrentView("settings");
	};

	const handleBackToMenu = () => {
		setCurrentView("menu");
	};

	const handleGameEnd = (score) => {
		if (selectedMode !== "training") {
			setLastGameScore(score);
		}
		setCurrentView("menu");
	};

	const ModeToggle = () => (
		<div className="relative flex items-center p-1 bg-slate-700/80 rounded-full w-80 shadow-inner">
			<div className="absolute inset-1 flex">
				<motion.div
					layoutId="active-pill"
					className={`h-full rounded-full shadow-md ${
						selectedMode === "classic"
							? "bg-sky-600"
							: selectedMode === "blitz"
								? "bg-red-600"
								: "bg-slate-500"
					}`}
					style={{
						width: "33.33%",
						marginLeft:
							selectedMode === "classic"
								? "0%"
								: selectedMode === "blitz"
									? "33.33%"
									: "66.66%",
					}}
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
				/>
			</div>

			<button
				onClick={() => setSelectedMode("classic")}
				className={`relative w-1/3 z-10 py-1.5 text-sm font-bold transition-colors duration-200 ${
					selectedMode === "classic"
						? "text-white"
						: "text-slate-400 hover:text-slate-200"
				}`}
			>
				Classic
			</button>
			<button
				onClick={() => setSelectedMode("blitz")}
				className={`relative w-1/3 z-10 py-1.5 text-sm font-bold transition-colors duration-200 ${
					selectedMode === "blitz"
						? "text-white"
						: "text-slate-400 hover:text-slate-200"
				}`}
			>
				Blitz
			</button>
			<button
				onClick={() => setSelectedMode("training")}
				className={`relative w-1/3 z-10 py-1.5 text-sm font-bold transition-colors duration-200 ${
					selectedMode === "training"
						? "text-white"
						: "text-slate-400 hover:text-slate-200"
				}`}
			>
				Training
			</button>
		</div>
	);

	const RulesTooltip = () => (
		<div className="relative inline-block z-30">
			<button
				onClick={(e) => {
					e.stopPropagation();
					setShowRules(!showRules);
				}}
				className="p-3 -m-3 focus:outline-none hover:text-white text-slate-400 transition-colors"
			>
				<FontAwesomeIcon icon={faInfoCircle} className="text-xl" />
			</button>

			<AnimatePresence>
				{showRules && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: 5 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 5 }}
						className="absolute bottom-full right-0 mb-3 w-64 p-4 bg-slate-900 text-xs text-slate-200 rounded-lg shadow-2xl border border-slate-600 z-40 origin-bottom-right"
					>
						{selectedMode === "classic" && (
							<p>
								<span className="font-bold text-sky-400">Classic:</span> 15
								seconds fixed. Score points by identifying flags correctly!
							</p>
						)}
						{selectedMode === "blitz" && (
							<p>
								<span className="font-bold text-red-400">Blitz:</span> Start
								with 3s. Correct: +1s. Wrong: -2s. High risk, high reward!
							</p>
						)}
						{selectedMode === "training" && (
							<p>
								<span className="font-bold text-slate-300">Training:</span> No
								timer, no score saving. Practice freely until you're ready.
							</p>
						)}
						<div className="absolute right-3 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-900"></div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);

	const renderView = () => {
		if (!isLoaded || !isSignedIn) {
			return <p className="text-center text-xl text-slate-300">Loading...</p>;
		}

		let userNameForDisplay = "Player";
		if (user) {
			const firstName = user.firstName || "";
			userNameForDisplay = firstName || "Player";
		}

		switch (currentView) {
			case "countdown":
				return (
					<div className="flex flex-col items-center text-center">
						<p className="mb-2 text-3xl font-semibold text-sky-300">
							Get ready!
						</p>
						<motion.p
							key={countdown}
							initial={{ scale: 0.5, opacity: 0 }}
							animate={{ scale: 1.5, opacity: 1 }}
							exit={{ scale: 2, opacity: 0 }}
							className="text-9xl font-bold text-yellow-400"
						>
							{countdown > 0 ? countdown : "Go!"}
						</motion.p>
					</div>
				);
			case "game":
				return (
					<FlagFlipperGame onGameEnd={handleGameEnd} gameMode={selectedMode} />
				);
			case "scoreboard":
				return (
					<Scoreboard
						onBackToMenu={handleBackToMenu}
						initialGameMode={
							selectedMode === "training" ? "classic" : selectedMode
						}
					/>
				);
			case "settings":
				return (
					<SettingsView
						key={settingsViewKey}
						userFromPage={user}
						isLoadedFromPage={isLoaded}
						isSignedInFromPage={isSignedIn}
						onBackToMenu={handleBackToMenu}
					/>
				);
			case "menu":
			default:
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="flex flex-col items-center w-full max-w-sm mx-auto space-y-4"
					>
						{userNameForDisplay !== "Player" && (
							<p className="text-2xl font-semibold text-sky-300 mb-2">
								Hi, {userNameForDisplay}!
							</p>
						)}

						<div className="flex items-center gap-3 w-full justify-center relative">
							<ModeToggle />
							<RulesTooltip />
						</div>

						{lastGameScore !== null && (
							<motion.div
								initial={{ scale: 0.9, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								className="py-1 px-4 bg-slate-700/30 rounded-lg"
							>
								<p className="text-lg text-yellow-300">
									Last Score: <span className="font-bold">{lastGameScore}</span>
								</p>
							</motion.div>
						)}

						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleStartGamePress}
							className={`w-full rounded-lg py-4 text-xl font-bold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 ${
								selectedMode === "blitz"
									? "bg-gradient-to-r from-red-600 to-red-500 shadow-red-900/50 focus:ring-red-400"
									: selectedMode === "training"
										? "bg-gradient-to-r from-slate-600 to-slate-500 shadow-slate-900/50 focus:ring-slate-400"
										: "bg-gradient-to-r from-green-600 to-green-500 shadow-green-900/50 focus:ring-green-300"
							}`}
						>
							Start {selectedMode === "training" ? "Training" : "Game"}
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={handleShowScoreboard}
							className="w-full rounded-lg bg-sky-600 py-3 text-lg font-bold text-white shadow-md hover:bg-sky-500"
						>
							Scoreboard
						</motion.button>

						<div className="flex w-full gap-3">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleShowSettings}
								className="flex-1 rounded-lg bg-slate-600 py-3 text-base font-bold text-white shadow-md hover:bg-slate-500"
							>
								Settings
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() =>
									(window.location.href = "https://cultureconnection.se")
								}
								className="flex-1 rounded-lg bg-slate-600 py-3 text-base font-bold text-white shadow-md hover:bg-slate-500"
							>
								Home
							</motion.button>
						</div>
					</motion.div>
				);
		}
	};

	return (
		<>
			{showRules && (
				<div
					className="fixed inset-0 z-20"
					onClick={() => setShowRules(false)}
				/>
			)}

			<BackgroundFlagame />
			<div className="w-full h-screen relative">
				<Header />
				<div className="flex min-h-screen flex-col items-center justify-center p-4 text-white">
					<div className="w-full max-w-2xl mt-24 rounded-xl bg-slate-800 p-6 shadow-2xl outline-none md:p-8 border border-slate-700/50 backdrop-blur-sm z-10">
						<header className="text-center mb-6">
							<h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-2">
								Flag Flipper
							</h1>
							{currentView !== "game" && currentView !== "countdown" && (
								<div className="flex justify-center mt-4">
									<Link href="/">
										<Image
											src="/cc.svg"
											width={220}
											height={220}
											alt="CC Logo"
											className="opacity-80 hover:opacity-100 transition-opacity"
										/>
									</Link>
								</div>
							)}
						</header>
						<SignedIn>{renderView()}</SignedIn>
						<SignedOut>
							{isLoaded && (
								<div className="mt-8 flex flex-col items-center rounded-lg bg-slate-800 p-8 shadow-xl">
									<p className="mb-4 text-xl text-slate-200">Redirecting...</p>
									<p className="mb-6 text-slate-300">
										You need to be signed in to play.
										<SignInButton mode="modal" afterSignInUrl="/flag-game">
											<button className="ml-1 text-sky-400 underline hover:text-sky-300">
												sign in
											</button>
										</SignInButton>
										.
									</p>
								</div>
							)}
							{!isLoaded && (
								<p className="text-center text-xl text-slate-300">
									Loading authentication...
								</p>
							)}
						</SignedOut>
					</div>
				</div>
				<Footer />
			</div>
		</>
	);
}
