"use client";

import { useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Blop from "./Blop";

const getUserStatusInfo = (user) => {
	if (!user) return { text: "N/A", color: "gray", styleKey: "default" };
	if (user?.publicMetadata?.admin === true)
		return { text: "Board Member", color: "purple", styleKey: "admin" };
	if (user?.publicMetadata?.committee === true)
		return { text: "Committee", color: "orange", styleKey: "committee" };
	if (user?.publicMetadata?.member === true)
		return { text: "Member", color: "blue", styleKey: "member" };
	return { text: "User", color: "gray", styleKey: "default" };
};

const getStatusBadgeClass = (color) => {
	switch (color) {
		case "purple":
			return "bg-purple-200/80 text-purple-900";
		case "orange":
			return "bg-orange-200/80 text-orange-900";
		case "blue":
			return "bg-blue-200/80 text-blue-900";
		case "gray":
		default:
			return "bg-gray-300/80 text-gray-900";
	}
};

const getCardBackgroundStyle = (styleKey, skinActive) => {
	if (skinActive) {
		return "bg-transparent";
	}
	switch (styleKey) {
		case "admin":
			return "bg-gradient-to-br from-yellow-400 to-amber-500 text-black";
		case "committee":
			return "bg-gradient-to-l from-orange-600 to-yellow-500 text-black";
		case "member":
			return "bg-gradient-to-br from-blue-400 to-indigo-500 text-black";
		case "default":
		default:
			return "bg-gray-100 text-gray-800";
	}
};

const getBlopProps = (styleKey) => {
	switch (styleKey) {
		case "admin":
			return {
				color1: "#fef9c3",
				color2: "#fef08a",
				noiseAmplitude: 30,
				noiseScale: 0.6,
			};
		case "committee":
			return {
				color1: "#ffedd5",
				color2: "#fed7aa",
				noiseAmplitude: 40,
				noiseScale: 0.8,
			};
		case "member":
			return {
				color1: "#dbeafe",
				color2: "#bfdbfe",
				noiseAmplitude: 35,
				noiseScale: 0.7,
			};
		default:
			return {
				color1: "#e5e7eb",
				color2: "#d1d5db",
				noiseAmplitude: 30,
				noiseScale: 1,
			};
	}
};

const MOBILE_BREAKPOINT = 768;
const PLACEHOLDER_FAVORITE_IMG_MODAL =
	"https://api2.cultureconnection.se/assets/achievments-badges/9c153840-126c-4ba1-9906-647d1c3a2152.png";

const CARD_WIDTH_DESKTOP = "600px";
const CARD_HEIGHT_DESKTOP = "380px";
const CARD_WIDTH_MOBILE = "600px";
const CARD_HEIGHT_MOBILE = "380px";

const fetchUserFavoritesForModal = async () => {
	const response = await fetch("/api/user/favorites");
	if (!response.ok) {
		const errorData = await response.text();
		throw new Error(
			`Failed to fetch favorite badges. Status: ${response.status}. ${errorData}`,
		);
	}
	return response.json();
};

export default function UserCardModal({ isOpen, onClose, user }) {
	const [isMobile, setIsMobile] = useState(false);
	const [effectiveSkinUrl, setEffectiveSkinUrl] = useState(null);

	useEffect(() => {
		const checkScreenSize = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		checkScreenSize();
		window.addEventListener("resize", checkScreenSize);
		return () => window.removeEventListener("resize", checkScreenSize);
	}, []);

	useEffect(() => {
		if (isOpen && user?.publicMetadata?.selectedCardSkinUrl) {
			setEffectiveSkinUrl(user.publicMetadata.selectedCardSkinUrl);
		} else if (!isOpen) {
			setEffectiveSkinUrl(null);
		} else if (isOpen && !user?.publicMetadata?.selectedCardSkinUrl) {
			setEffectiveSkinUrl(null);
		}
	}, [isOpen, user?.publicMetadata?.selectedCardSkinUrl]);

	const {
		data: favoriteBadgesData,
		isLoading: isLoadingFavorites,
		isError: isErrorFavorites,
	} = useQuery({
		queryKey: ["userFavorites", user?.id],
		queryFn: fetchUserFavoritesForModal,
		enabled: !!user && isOpen,
		staleTime: 5 * 60 * 1000,
	});

	const displayedFavoriteBadges = useMemo(() => {
		const slots = [null, null, null];
		if (favoriteBadgesData && favoriteBadgesData.length > 0) {
			favoriteBadgesData.forEach((fav) => {
				if (fav.slot_position >= 1 && fav.slot_position <= 3) {
					slots[fav.slot_position - 1] = fav;
				}
			});
		}
		return slots;
	}, [favoriteBadgesData]);

	if (!isOpen) {
		return null;
	}

	const statusInfo = getUserStatusInfo(user);
	const cardBackgroundClass = getCardBackgroundStyle(
		statusInfo.styleKey,
		!!effectiveSkinUrl,
	);
	const blopBaseProps = getBlopProps(statusInfo.styleKey);
	const badgeClasses = getStatusBadgeClass(statusInfo.color);

	const userName = user
		? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
			user.emailAddresses?.[0]?.emailAddress ||
			"Unknown User"
		: "N/A";
	const userEmail = user
		? user.emailAddresses?.[0]?.emailAddress || "N/A"
		: "N/A";

	const hasAnyFavoriteSelected = displayedFavoriteBadges.some(
		(b) => b !== null,
	);

	const cardWidth = isMobile ? CARD_WIDTH_MOBILE : CARD_WIDTH_DESKTOP;
	const cardHeight = isMobile ? CARD_HEIGHT_MOBILE : CARD_HEIGHT_DESKTOP;

	const handleCardClick = (event) => {
		event.stopPropagation();

		if (typeof confetti !== "function") {
			console.error("Confetti function is not loaded!");
			return;
		}
		const originX = event.clientX / window.innerWidth;
		const originY = event.clientY / window.innerHeight;

		if (
			isNaN(originX) ||
			isNaN(originY) ||
			originX < 0 ||
			originX > 1 ||
			originY < 0 ||
			originY > 1
		) {
			console.warn(
				"Confetti: Invalid click coordinates, defaulting to center.",
				{ originX, originY },
			);
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { x: 0.5, y: 0.5 },
				colors: ["#FFC107", "#FF5722", "#E91E63", "#2196F3", "#4CAF50"],
				zIndex: 10000,
			});
			return;
		}

		const defaults = {
			spread: 360,
			ticks: 60,
			gravity: 0.1,
			decay: 0.94,
			startVelocity: 25,
			colors: ["#FFC107", "#FF5722", "#E91E63", "#2196F3", "#4CAF50"],
			zIndex: 10000,
			origin: { x: originX, y: originY },
		};

		confetti({
			...defaults,
			particleCount: 40,
			scalar: 1.2,
			shapes: ["star"],
		});

		confetti({
			...defaults,
			particleCount: 60,
			scalar: 0.8,
			shapes: ["circle"],
		});
	};

	const handleSkinImageError = () => {
		setEffectiveSkinUrl(null);
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="user-modal-title"
			className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${
				isOpen ? "flex" : "hidden pointer-events-none"
			}`}
			onClick={onClose}
		>
			<div className="absolute inset-0 bg-[rgb(0,0,0,0.8)]"></div>
			<div
				className={`
          relative rounded-xl
        flex-shrink-0
          transition-all duration-300 ease-in-out transform
          md:rotate-0 sm:rotate-0 rotate-90  origin-center
          flex
          ${isOpen ? "scale-100" : "scale-100 hidden"}
          ${!effectiveSkinUrl ? cardBackgroundClass : ""}
        `}
				style={{ width: cardWidth, height: cardHeight }}
				onClick={handleCardClick}
			>
				{effectiveSkinUrl && (
					<img
						key={effectiveSkinUrl}
						src={effectiveSkinUrl}
						alt="Card Skin"
						className="absolute w-full h-full z-10"
						onError={handleSkinImageError}
					/>
				)}
				<div
					className={`relative w-full h-full flex items-center justify-center
            ${effectiveSkinUrl ? "p-6 md:p-8" : "p-4 md:p-6"}
            ${cardBackgroundClass}
            z-20
            rounded-lg
            overflow-hidden
          `}
				>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onClose();
						}}
						className={`absolute top-8 right-8 z-40 p-1.5 rounded-full transition-colors ${
							statusInfo.styleKey === "default" || effectiveSkinUrl
								? "bg-black/30 hover:bg-black/40 text-white"
								: "bg-gray-300/50 hover:bg-gray-400/70 text-gray-800"
						}`}
						aria-label="Close user details"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 md:h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>

					{statusInfo.styleKey !== "default" && user && !effectiveSkinUrl && (
						<div className="absolute inset-0 z-0">
							<Blop
								size={
									isMobile
										? parseInt(cardHeight) * 0.8
										: parseInt(cardHeight) * 0.9
								}
								x={
									isMobile
										? parseInt(cardWidth) * 0.3
										: parseInt(cardWidth) * 0.3
								}
								y={
									isMobile
										? parseInt(cardHeight) * 0.3
										: parseInt(cardHeight) * 0.3
								}
								color1={blopBaseProps.color1}
								color2={blopBaseProps.color2}
								noiseAmplitude={blopBaseProps.noiseAmplitude}
								noiseScale={blopBaseProps.noiseScale}
							/>
						</div>
					)}

					{statusInfo.styleKey !== "default" && user && (
						<div
							className={`relative z-30 rounded-lg p-3 md:p-4 text-center space-y-1 md:space-y-2 w-full max-w-sm
                ${
									effectiveSkinUrl
										? "text-white"
										: `${
												statusInfo.styleKey === "admin" ||
												statusInfo.styleKey === "committee" ||
												statusInfo.styleKey === "member"
													? "bg-gray-800/20 backdrop-blur-sm"
													: "bg-gray-300/50"
											} text-inherit`
								}`}
						>
							{statusInfo.styleKey !== "default" && (
								<img
									src="/cc.svg"
									alt="Logo"
									className="absolute z-30 w-12 md:h-12 opacity-70 pointer-events-none"
								/>
							)}
							<h2
								id="user-modal-title"
								className="text-2xl text-stroke-1 text-stroke-black font-bold mb-1 drop-shadow-md"
							>
								{userName}
							</h2>
							<div className="text-sm drop-shadow-sm">
								<span className="font-medium">Email:</span> {userEmail}
							</div>
							<div className="text-sm drop-shadow-sm mb-2">
								<span className="font-medium">Status:</span>{" "}
								<span
									className={`px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
										effectiveSkinUrl
											? "bg-white/20 text-gray-100"
											: badgeClasses
									}`}
								>
									{statusInfo.text}
								</span>
							</div>

							<div
								className={`pt-2 mt-2 border-t ${
									effectiveSkinUrl ? "border-white/30" : "border-gray-400/50"
								}`}
							>
								<h3
									className={`text-md font-semibold mb-1 drop-shadow-sm ${
										effectiveSkinUrl ? "text-gray-200" : "text-gray-700"
									}`}
								>
									Favorite Badges:
								</h3>
								{isLoadingFavorites && (
									<p className="text-xs italic">Loading...</p>
								)}
								{isErrorFavorites && (
									<p className="text-xs text-red-400 italic">
										Could not load favorites.
									</p>
								)}
								{!isLoadingFavorites &&
									!isErrorFavorites &&
									(hasAnyFavoriteSelected ? (
										<div className="flex justify-center gap-1">
											{displayedFavoriteBadges.map((fav, index) => (
												<div
													key={index}
													className={`w-24 h-24 overflow-hidden flex items-center justify-center`}
													title={
														fav ? fav.title : `Empty Favorite Slot ${index + 1}`
													}
												>
													{fav && (
														<img
															src={fav.imgurl}
															alt={fav.title}
															className="w-full h-full object-cover"
															onError={(e) => {
																e.currentTarget.src =
																	PLACEHOLDER_FAVORITE_IMG_MODAL;
															}}
														/>
													)}
												</div>
											))}
										</div>
									) : (
										<p
											className={`text-xs italic ${
												effectiveSkinUrl ? "text-gray-300" : "text-gray-500"
											}`}
										>
											No favorite badges selected yet.
										</p>
									))}
							</div>
						</div>
					)}
					{statusInfo.styleKey === "default" && (
						<div className="relative z-20 text-center px-4">
							<h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">
								Become a Member!
							</h3>
							<p className="text-sm md:text-base text-gray-500 mb-6">
								Join our community to get your personalized member card.
							</p>
							<Link
								href="/membership"
								className="w-full md:w-auto mt-1 md:mt-2 text-center px-4 md:px-6 py-2 md:py-2.5 rounded-lg border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor2 text-white font-semibold text-sm md:text-base"
							>
								Learn More
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
