"use client";

import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import React, { useEffect, useState } from "react";

const modalVariants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const zoomOverlayVariants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1 },
	exit: { opacity: 0 },
};

export default function UserIdentityQrModal({ isOpen, onClose, userName }) {
	const [qrCodeValue, setQrCodeValue] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isZoomed, setIsZoomed] = useState(false);
	const [zoomSize, setZoomSize] = useState(300);

	useEffect(() => {
		if (isOpen && !qrCodeValue && !isLoading) {
			const fetchUserId = async () => {
				setIsLoading(true);
				setError(null);
				try {
					const response = await fetch("/api/user/generate-identity-token");
					const data = await response.json();
					if (!response.ok) {
						throw new Error(data.message || "Failed to fetch user identity");
					}
					setQrCodeValue(data.userIdentityString);
				} catch (error) {
					console.error("Error fetching user identity string:", error);
					setError(error.message);
					setQrCodeValue(null);
				} finally {
					setIsLoading(false);
				}
			};
			fetchUserId();
		} else if (!isOpen) {
			setQrCodeValue(null);
			setError(null);
			setIsLoading(false);
		}
	}, [isOpen, qrCodeValue, isLoading]);

	useEffect(() => {
		if (!isOpen) {
			setIsZoomed(false);
			return;
		}

		const calculateSize = () => {
			const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
			setZoomSize(size);
		};

		calculateSize();
		window.addEventListener("resize", calculateSize);
		return () => window.removeEventListener("resize", calculateSize);
	}, [isOpen]);

	if (!isOpen) return null;

	const handleQrClick = () => qrCodeValue && setIsZoomed(true);
	const handleZoomClose = () => setIsZoomed(false);

	return (
		<AnimatePresence>
			<motion.div
				className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4"
				initial="hidden"
				animate="visible"
				exit="exit"
				variants={modalVariants}
				onClick={onClose}
			>
				<motion.div
					className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full relative flex flex-col"
					onClick={(e) => e.stopPropagation()}
					variants={modalVariants}
					style={{ visibility: isZoomed ? "hidden" : "visible" }}
				>
					<div className="p-5 border-b border-gray-200 flex justify-between items-center">
						<h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
							My Identity QR Code
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-400 hover:text-gray-700 z-20 bg-white rounded-full p-1 h-7 w-7 flex items-center justify-center"
							aria-label="Close modal"
						>
							<FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
						</button>
					</div>

					<div className="p-6 flex flex-col items-center justify-center flex-grow min-h-[300px]">
						{userName && (
							<p className="text-center text-gray-700 mb-1 font-medium">
								{userName}
							</p>
						)}
						<p className="text-center text-sm text-gray-500 mb-4">
							Admins or Committee members can scan this code to identify you.
						</p>
						{isLoading && <p>Loading your QR code...</p>}
						{error && (
							<p className="text-red-500 text-center">Error: {error}</p>
						)}
						{qrCodeValue && !isLoading && !error ? (
							<motion.div
								layoutId="user-identity-qr-code"
								onClick={handleQrClick}
								className="cursor-pointer p-2 bg-white rounded-lg shadow-lg border mx-auto"
							>
								<QRCodeCanvas
									id="user-identity-qr-code"
									value={qrCodeValue}
									size={240}
									level={"M"}
									includeMargin={true}
								/>
							</motion.div>
						) : (
							!isLoading &&
							!error && (
								<p className="text-red-500">Could not generate QR Code.</p>
							)
						)}
						<p className="text-xs text-gray-400 mt-4 text-center">
							This QR code contains your public user ID.
						</p>
					</div>
				</motion.div>
			</motion.div>

			<AnimatePresence>
				{isZoomed && qrCodeValue && (
					<motion.div
						className="fixed inset-0 z-[80] flex justify-center items-center bg-black/80"
						onClick={handleZoomClose}
						variants={zoomOverlayVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						<motion.div
							layoutId="user-identity-qr-code"
							className="bg-white p-4 rounded-lg shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							<QRCodeCanvas
								value={qrCodeValue}
								size={zoomSize}
								level={"M"}
								includeMargin={true}
							/>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</AnimatePresence>
	);
}
