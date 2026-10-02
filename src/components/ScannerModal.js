// src/components/ScannerModal.js
"use client";

import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode";
import React, { useCallback, useEffect, useRef, useState } from "react";

const modalVariants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const fullscreenVariants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, transition: { duration: 0.15 } },
};

const SCANNER_ELEMENT_ID = "responsive-qr-reader";

// --- Desktop View Sub-Component ---
const DesktopView = ({ onClose, cameraError }) => (
	<motion.div
		className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
		initial="hidden"
		animate="visible"
		exit="exit"
		variants={modalVariants}
		onClick={onClose}
	>
		<motion.div
			className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white p-6 shadow-xl"
			onClick={(e) => e.stopPropagation()}
			variants={modalVariants}
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center text-gray-500 transition-colors hover:text-gray-800"
				aria-label="Close scanner"
			>
				<FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
			</button>
			<h2 className="mb-4 text-center text-xl font-semibold text-gray-800">
				Scan Achievement QR Code
			</h2>
			<div
				id={SCANNER_ELEMENT_ID}
				className="relative w-full aspect-square overflow-hidden rounded-lg border-2 border-gray-300"
			>
				{cameraError && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-100 p-4 text-center">
						<p className="text-sm text-red-600">{cameraError}</p>
					</div>
				)}
			</div>
			<p className="mt-3 text-center text-xs text-gray-500">
				Point your camera at the QR code.
			</p>
		</motion.div>
	</motion.div>
);

// --- Mobile View Sub-Component ---
const MobileView = ({ onClose, cameraError }) => (
	<motion.div
		className="fixed inset-0 z-[70] bg-black"
		initial="hidden"
		animate="visible"
		exit="exit"
		variants={fullscreenVariants}
	>
		<div id={SCANNER_ELEMENT_ID} className="absolute inset-0" />
		<button
			type="button"
			onClick={onClose}
			className="absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
			aria-label="Close scanner"
		>
			<FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
		</button>
		{cameraError && (
			<div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-4 text-center">
				<p className="text-base text-red-400">{cameraError}</p>
			</div>
		)}
		{!cameraError && (
			<p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-white/80">
				Point your camera at the QR code
			</p>
		)}
	</motion.div>
);

// --- Main ScannerModal Component ---
function ScannerModal({ isOpen, onClose, onScanSuccess, onScanError }) {
	const html5QrCodeRef = useRef(null);
	const [cameraError, setCameraError] = useState(null);
	const [isDesktop, setIsDesktop] = useState(true);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 768px)");
		setIsDesktop(mediaQuery.matches);
		const handler = (event) => setIsDesktop(event.matches);
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	const stopScanner = useCallback(() => {
		if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
			html5QrCodeRef.current.stop().catch((err) => {
				console.error(
					"Failed to stop the scanner, may have already been stopped.",
					err,
				);
			});
		}
	}, []);

	const startScanner = useCallback(async () => {
		setCameraError(null);
		const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
		if (!scannerElement) return;
		scannerElement.innerHTML = "";

		const qrCodeInstance = new Html5Qrcode(SCANNER_ELEMENT_ID, false);
		html5QrCodeRef.current = qrCodeInstance;

		const config = {
			fps: 10,
			qrbox: (viewfinderWidth, viewfinderHeight) => {
				const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
				const qrboxSize = Math.floor(minEdge * 0.8);
				return { width: qrboxSize, height: qrboxSize };
			},
			rememberLastUsedCamera: true,
			supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
		};

		try {
			await qrCodeInstance.start(
				{ facingMode: "environment" },
				config,
				(decodedText) => onScanSuccess && onScanSuccess(decodedText),
				(errorMessage) => {},
			);
		} catch (err) {
			const errorMessage =
				err.message || "Could not start QR Scanner. Check camera permissions.";
			console.error("Error starting scanner:", errorMessage);
			setCameraError(errorMessage);
			if (onScanError) onScanError(errorMessage);
		}
	}, [onScanSuccess, onScanError]);

	useEffect(() => {
		if (isOpen) {
			const timerId = setTimeout(() => startScanner(), 200);
			return () => clearTimeout(timerId);
		} else {
			stopScanner();
		}
	}, [isOpen, startScanner, stopScanner]);

	useEffect(() => {
		return () => stopScanner();
	}, [stopScanner]);

	return (
		<>
			<style jsx global>{`
        div[id^="qr-shaded-region"] {
          border: none !important;
        }
      `}</style>
			<AnimatePresence>
				{isOpen &&
					(isDesktop ? (
						<DesktopView onClose={onClose} cameraError={cameraError} />
					) : (
						<MobileView onClose={onClose} cameraError={cameraError} />
					))}
			</AnimatePresence>
		</>
	);
}

export default ScannerModal;
