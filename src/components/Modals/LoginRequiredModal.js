"use client";

import { SignInButton } from "@clerk/nextjs";
import { faUserLock, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";

export default function LoginRequiredModal({ isOpen, onClose }) {
	// If not open, render nothing
	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<div
				className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
				onClick={onClose}
			>
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					className="bg-white rounded-2xl p-6 w-full max-w-sm relative text-center"
					onClick={(e) => e.stopPropagation()}
				>
					<button
						onClick={onClose}
						className="absolute top-4 right-4 text-gray-400"
					>
						<FontAwesomeIcon icon={faXmark} className="text-xl" />
					</button>

					<div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
						<FontAwesomeIcon icon={faUserLock} className="text-2xl" />
					</div>

					<h2 className="text-xl font-bold mb-2">Login Required</h2>
					<p className="text-gray-500 mb-6 text-sm">
						Please log in to claim this badge.
					</p>

					<SignInButton mode="modal">
						<button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">
							Log In / Sign Up
						</button>
					</SignInButton>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}
