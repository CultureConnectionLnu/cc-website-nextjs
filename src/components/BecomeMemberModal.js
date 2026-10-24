"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const fetchVerificationList = async () => {
	const response = await fetch("/data/MemberVerefication.json", {
		cache: "no-store",
	});

	if (!response.ok) {
		if (response.status === 404) {
			console.log("Verification file not found, returning empty list.");
			return [];
		}
		throw new Error(
			`Failed to fetch verification list: ${response.statusText}`,
		);
	}
	return response.json();
};

const addUserToVerification = async (userId) => {
	if (!userId) {
		throw new Error("User information not available.");
	}

	const response = await fetch("/api/user/userverification", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ userId: userId }),
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result.error || `HTTP error! status: ${response.status}`);
	}

	return result;
};

export default function BecomeMemberModal({ isOpen, onClose, user }) {
	const queryClient = useQueryClient();

	const {
		data: verificationList,
		isLoading: isLoadingCheck,
		error: checkError,
	} = useQuery({
		queryKey: ["verificationList"],
		queryFn: fetchVerificationList,
		enabled: isOpen && !!user?.id,
	});

	const isInList =
		!!user?.id &&
		!!verificationList &&
		verificationList.some((entry) => entry.userID === user.id);

	const {
		mutate: submitVerification,
		isPending: isLoadingAdd,
		error: addError,
	} = useMutation({
		mutationFn: addUserToVerification,
		onSuccess: () => {
			// console.log("Verification added successfully, invalidating list cache.");
			queryClient.invalidateQueries({ queryKey: ["verificationList"] });
		},
		onError: (err) => {
			console.error("Error adding to verification list:", err);
		},
	});

	const handleAddToVerification = () => {
		if (user?.id) {
			submitVerification(user.id);
		} else {
			console.error("Cannot submit verification: User ID is missing.");
		}
	};

	const handleContentClick = (e) => {
		e.stopPropagation();
	};

	const displayError = addError?.message || checkError?.message || null;

	const modalVariants = {
		hidden: { opacity: 0, scale: 0.9 },
		visible: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 0.9 },
	};

	const backdropVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1 },
		exit: { opacity: 0 },
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					variants={backdropVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					transition={{ duration: 0.2 }}
					className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4"
					onClick={onClose}
				>
					<motion.div
						variants={modalVariants}
						transition={{ type: "spring", stiffness: 300, damping: 25 }}
						className="bg-white rounded-xl shadow-2xl p-6 md:p-8 max-w-md w-full relative text-center"
						onClick={handleContentClick}
					>
						<button
							type="button"
							onClick={onClose}
							className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors"
							aria-label="Close modal"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>

						<h2 className="text-2xl md:text-3xl font-bold mb-4 text-mainColor font-Header">
							Become a Member!
						</h2>
						<p className="font-bold text-mainColor mb-4 text-base md:text-lg">
							Membership is free and open to all users.
						</p>
						<p className="text-black mb-4 text-base md:text-lg">
							To pass verification please provide your{" "}
							<span className="text-md font-bold text-mainColor">
								full name and appropriate username.
							</span>
						</p>
						<p className="text-gray-600 mb-6 text-sm md:text-base">
							Click below to add yourself to the verification list. An admin
							will review your request.
						</p>

						<div className="mt-4 mb-4">
							{isLoadingCheck ? (
								<p className="text-gray-500">Checking status...</p>
							) : (
								<button
									type="button"
									onClick={handleAddToVerification}
									disabled={isInList || isLoadingAdd}
									className={`w-full md:w-auto mt-1 md:mt-2 text-center px-4 md:px-6 py-2 md:py-2.5 rounded-lg border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor text-white font-semibold text-sm md:text-base ${
										isInList
											? "bg-gray-400 text-gray-700 cursor-not-allowed"
											: "bg-accentColor hover:bg-accentColor/90 text-white"
									} ${isLoadingAdd ? "opacity-70 cursor-wait" : ""}`}
								>
									{isLoadingAdd && (
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
									)}
									{isLoadingAdd
										? "Processing..."
										: isInList
											? "Request Sent (Pending Review)"
											: "Add Me to Verification List"}
								</button>
							)}
						</div>

						{displayError && (
							<p className="text-red-600 mt-2 text-sm">{displayError}</p>
						)}

						<a
							href="/membership"
							className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block"
							onClick={onClose}
						>
							Learn More about Membership
						</a>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
