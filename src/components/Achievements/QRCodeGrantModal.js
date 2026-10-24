"use client";

import {
	faCheck,
	faClock,
	faExpand,
	faFloppyDisk,
	faInfinity,
	faMinus,
	faPlus,
	faQrcode,
	faRotateLeft,
	faSync,
	faUsers,
	faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

// --- SCANNER SUB-COMPONENTS ---

const scannerModalVariants = {
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

const DesktopView = ({ onClose, cameraError }) => (
	<motion.div
		className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
		initial="hidden"
		animate="visible"
		exit="exit"
		variants={scannerModalVariants}
		onClick={onClose}
	>
		<motion.div
			className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white p-6 shadow-xl"
			onClick={(e) => e.stopPropagation()}
			variants={scannerModalVariants}
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-800"
				aria-label="Close scanner"
			>
				<FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
			</button>
			<h2 className="mb-4 text-center text-xl font-semibold text-gray-800">
				Scan User QR Code
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
				Point your camera at the user's QR code.
			</p>
		</motion.div>
	</motion.div>
);

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
			className="absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
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
				Point your camera at the user's QR code
			</p>
		)}
	</motion.div>
);

function ScannerModal({ isOpen, onClose, onScanSuccess, onScanError }) {
	const html5QrCodeRef = useRef(null);
	const [cameraError, setCameraError] = useState(null);
	const [isDesktop, setIsDesktop] = useState(true);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		setIsDesktop(mq.matches);
		const h = (e) => setIsDesktop(e.matches);
		mq.addEventListener("change", h);
		return () => mq.removeEventListener("change", h);
	}, []);

	const stopScanner = useCallback(() => {
		if (html5QrCodeRef.current?.isScanning) {
			html5QrCodeRef.current.stop().catch(() => {});
		}
	}, []);

	const startScanner = useCallback(async () => {
		setCameraError(null);
		const el = document.getElementById(SCANNER_ELEMENT_ID);
		if (!el) return;
		el.innerHTML = "";
		const qr = new Html5Qrcode(SCANNER_ELEMENT_ID, false);
		html5QrCodeRef.current = qr;
		const cfg = {
			fps: 10,
			qrbox: (w, h) => {
				const m = Math.min(w, h);
				return { width: m * 0.8, height: m * 0.8 };
			},
			rememberLastUsedCamera: true,
			supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
		};
		try {
			await qr.start(
				{ facingMode: "environment" },
				cfg,
				(text) => onScanSuccess?.(text),
				() => {},
			);
		} catch (e) {
			const msg =
				e.message || "Could not start QR Scanner. Check camera permissions.";
			setCameraError(msg);
			onScanError?.(msg);
		}
	}, [onScanSuccess, onScanError]);

	useEffect(() => {
		if (isOpen) {
			const id = setTimeout(startScanner, 200);
			return () => clearTimeout(id);
		} else {
			stopScanner();
		}
	}, [isOpen, startScanner, stopScanner]);

	useEffect(() => () => stopScanner(), [stopScanner]);

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

// --- MAIN COMPONENT ---

export default function QRCodeGrantModal({
	isOpen,
	onClose,
	achievementData,
	patchUserMutation,
	isAdmin,
	usersData = [],
	isLoadingUsers = false,
	isUsersError = false,
	usersError = null,
}) {
	const [activeTab, setActiveTab] = useState("qr");
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedUserIdForAction, setSelectedUserIdForAction] = useState(null);
	const [selectedUserNameForAction, setSelectedUserNameForAction] =
		useState(null);
	const [manualActionStatus, setManualActionStatus] = useState({
		message: "",
		error: false,
	});
	const [userViewFilter, setUserViewFilter] = useState("all");
	const [scoreInput, setScoreInput] = useState("");
	const [optimisticSelectedUserStatus, setOptimisticSelectedUserStatus] =
		useState(null);

	const [qrCodeValue, setQrCodeValue] = useState(null);
	const [isLoadingQrToken, setIsLoadingQrToken] = useState(false);
	const [qrTokenError, setQrTokenError] = useState(null);

	const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
	const [userScanMessageInGrantTab, setUserScanMessageInGrantTab] =
		useState("");
	const [isQrCodeZoomed, setIsQrCodeZoomed] = useState(false);

	// Safely handle potential undefined data
	const achievementIdForQr = achievementData?.id;
	const achievementTitle = achievementData?.title;
	const isAttendance = achievementData?.attendanceCounter === true;
	const attendanceNeedForDisplay = achievementData?.attendanceNeed;
	const isLeveledAchievement = achievementData?.level_config?.length > 0;
	const isScoreEnabled = achievementData?.onScore === true;

	// New Property: Static Check (DB stores 0/1, parser converts to boolean)
	const isStaticBadge = achievementData?.hasQrCodeExpiry === false;

	// --- REFRESH QR LOGIC ---
	const fetchQr = useCallback(() => {
		if (!achievementIdForQr) return;

		// Only show loading spinner if we don't have a value yet (initial load)
		// or to give visual feedback on manual refresh
		if (!qrCodeValue) setIsLoadingQrToken(true);
		setQrTokenError(null);

		fetch("/api/qr/generate-token", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ achievementId: achievementIdForQr }),
		})
			.then((r) => r.json().then((d) => ({ r, d })))
			.then(({ r, d }) => {
				if (!r.ok) throw new Error(d.message);
				setQrCodeValue(d.qrUrl); // Using new URL format
			})
			.catch((e) => {
				setQrTokenError(e.message);
			})
			.finally(() => setIsLoadingQrToken(false));
	}, [achievementIdForQr, qrCodeValue]);

	// --- EFFECT: Handle Open/Close & Auto-Refresh ---
	useEffect(() => {
		let intervalId;

		if (isOpen && activeTab === "qr" && achievementIdForQr) {
			fetchQr(); // Initial fetch

			// If Dynamic, refresh every 5s so the screen always shows a valid code
			if (!isStaticBadge) {
				intervalId = setInterval(fetchQr, 5000);
			}
		} else if (!isOpen) {
			// Cleanup state on close
			setQrCodeValue(null);
			setQrTokenError(null);
			setIsLoadingQrToken(false);
			setActiveTab("qr");
			setSearchTerm("");
			setSelectedUserIdForAction(null);
			setSelectedUserNameForAction(null);
			setManualActionStatus({ message: "", error: false });
			setUserViewFilter("all");
			setScoreInput("");
			setOptimisticSelectedUserStatus(null);
			setUserScanMessageInGrantTab("");
			setIsQrCodeZoomed(false);
			setIsScannerModalOpen(false);
		} else if (activeTab !== "qr") {
			setQrCodeValue(null);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isOpen, activeTab, achievementIdForQr, isStaticBadge]); // fetchQr is stable

	// --- MANUAL GRANT HANDLERS ---
	const handleGrantAfterUserScan = useCallback(
		async (targetUserId, targetUserName) => {
			if (!achievementIdForQr || patchUserMutation.isPending) {
				setUserScanMessageInGrantTab("System busy or missing data.");
				return;
			}
			setUserScanMessageInGrantTab(
				`User ${targetUserName} identified. Processing '${achievementTitle}'...`,
			);

			// Handle exploded ID just in case
			let targetAchId = achievementIdForQr;
			if (targetAchId.includes("_lvl_"))
				targetAchId = targetAchId.split("_lvl_")[0];

			const payload = {
				achievementId: targetAchId,
				targetUserId,
				action: isAttendance ? "updateCount" : "setAchieved",
				...(isAttendance ? { countChange: 1 } : { achieved: true }),
			};
			try {
				await patchUserMutation.mutateAsync(payload);
				setUserScanMessageInGrantTab(
					`Action successful for ${targetUserName}.`,
				);
			} catch (e) {
				setUserScanMessageInGrantTab(`Error: ${e.message}`);
			}
		},
		[achievementIdForQr, achievementTitle, isAttendance, patchUserMutation],
	);

	const handleUserQrScan = useCallback(
		async (decodedText) => {
			setIsScannerModalOpen(false);
			setUserScanMessageInGrantTab("Identifying user...");
			const targetUserId = decodedText;
			let targetUserName = targetUserId;
			try {
				const resp = await fetch(`/api/user/${targetUserId}/profile`);
				if (resp.ok) {
					const pd = await resp.json();
					targetUserName = pd.userName;
				}
			} catch {}
			await handleGrantAfterUserScan(targetUserId, targetUserName);
		},
		[handleGrantAfterUserScan],
	);

	const userStatusMap = useMemo(() => {
		const m = new Map();
		achievementData?.userHas?.forEach((u) => {
			m.set(u.userID, {
				achieved: u.achived,
				count: u.attendanceCount || 0,
				score: u.score,
			});
		});
		return m;
	}, [achievementData]);

	const filteredUsers = useMemo(() => {
		let us = usersData || [];
		if (userViewFilter === "achieved") {
			us = us.filter((u) => userStatusMap.get(u.id)?.achieved);
		}
		if (searchTerm) {
			const s = searchTerm.toLowerCase();
			us = us.filter(
				(u) =>
					u.username?.toLowerCase().includes(s) ||
					u.firstName?.toLowerCase().includes(s) ||
					u.lastName?.toLowerCase().includes(s) ||
					u.primaryEmailAddress?.toLowerCase().includes(s),
			);
		}
		return us;
	}, [usersData, userViewFilter, searchTerm, userStatusMap]);

	const selectedUserDisplayStatus = useMemo(() => {
		if (!selectedUserIdForAction) return null;
		const os = optimisticSelectedUserStatus;
		if (os?.userId === selectedUserIdForAction) return os.status;
		return (
			userStatusMap.get(selectedUserIdForAction) || {
				achieved: false,
				count: 0,
				score: null,
			}
		);
	}, [selectedUserIdForAction, optimisticSelectedUserStatus, userStatusMap]);

	const handleManualAction = async (type) => {
		if (
			!selectedUserIdForAction ||
			!achievementIdForQr ||
			patchUserMutation.isPending
		)
			return;
		setManualActionStatus({ message: "", error: false });

		// Explicitly handle exploded ID stripping for manual actions
		let targetAchId = achievementIdForQr;
		if (targetAchId.includes("_lvl_"))
			targetAchId = targetAchId.split("_lvl_")[0];

		const payload = {
			achievementId: targetAchId,
			targetUserId: selectedUserIdForAction,
		};
		let pred = { ...selectedUserDisplayStatus };

		if (type === "grant") {
			payload.action = "setAchieved";
			payload.achieved = true;
			pred.achieved = true;
		} else if (type === "revoke") {
			payload.action = "setAchieved";
			payload.achieved = false;
			pred = { achieved: false, count: 0, score: null };
		} else if (type === "increment") {
			payload.action = "updateCount";
			payload.countChange = 1;
			pred.count = (pred.count || 0) + 1;
		} else if (type === "decrement") {
			payload.action = "updateCount";
			payload.countChange = -1;
			pred.count = Math.max(0, (pred.count || 0) - 1);
		} else if (type === "setScore") {
			const v = parseInt(scoreInput, 10);
			if (isNaN(v)) {
				setManualActionStatus({ message: "Invalid score.", error: true });
				return;
			}
			payload.action = "updateScore";
			payload.score = v;
			pred.score = v;
		} else {
			setManualActionStatus({ message: "Invalid action.", error: true });
			return;
		}
		setOptimisticSelectedUserStatus({
			userId: selectedUserIdForAction,
			status: pred,
		});
		try {
			await patchUserMutation.mutateAsync(payload);
			setManualActionStatus({
				message: `Action '${type}' sent for ${
					selectedUserNameForAction || selectedUserIdForAction
				}.`,
				error: false,
			});
		} catch (e) {
			setManualActionStatus({ message: e.message, error: true });
			setOptimisticSelectedUserStatus(null);
		}
	};

	useEffect(() => {
		setOptimisticSelectedUserStatus(null);
	}, [achievementData, selectedUserIdForAction]);

	const handleSelectUserFromList = (u) => {
		setSelectedUserIdForAction(u.id);
		setSelectedUserNameForAction(
			`${u.firstName || ""} ${u.lastName || ""}`.trim() ||
				u.username ||
				u.primaryEmailAddress,
		);
		setManualActionStatus({ message: "", error: false });
		setOptimisticSelectedUserStatus(null);
	};

	return (
		<>
			<ScannerModal
				isOpen={isScannerModalOpen}
				onClose={() => setIsScannerModalOpen(false)}
				onScanSuccess={handleUserQrScan}
				onScanError={(e) => {
					setIsScannerModalOpen(false);
					setUserScanMessageInGrantTab(`Scanner Error: ${e}`);
				}}
			/>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
					>
						<motion.div
							className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-gray-300 flex flex-col"
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							transition={{ type: "spring", stiffness: 300, damping: 30 }}
							onClick={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								onClick={onClose}
								className="absolute top-3 right-3 h-7 w-7 bg-white/50 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-800"
								aria-label="Close modal"
							>
								<FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
							</button>
							<div className="p-5 border-b bg-white/30">
								<h2 className="text-xl font-bold text-center mb-3 text-gray-800">
									{achievementTitle || "Achievement"}
								</h2>
								<div className="flex justify-center border-b border-gray-300">
									<button
										type="button"
										onClick={() => setActiveTab("qr")}
										className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${
											activeTab === "qr"
												? "border-indigo-500 text-indigo-600"
												: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}`}
									>
										<FontAwesomeIcon icon={faQrcode} /> Grant Options
									</button>
									{isAdmin && (
										<button
											type="button"
											onClick={() => setActiveTab("manual")}
											className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${
												activeTab === "manual"
													? "border-indigo-500 text-indigo-600"
													: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
											}`}
										>
											<FontAwesomeIcon icon={faUsers} /> Manual Action
										</button>
									)}
								</div>
							</div>
							<div className="p-6 overflow-y-auto flex-grow">
								{activeTab === "qr" && (
									<div className="text-center flex flex-col items-center">
										{/* MODE INDICATOR */}
										<div className="mb-6 p-3 bg-white/50 rounded-lg border border-gray-200 inline-block text-left text-sm w-full max-w-md">
											<div className="flex items-start gap-2 mb-1">
												<span
													className={
														isStaticBadge ? "text-purple-600" : "text-amber-600"
													}
												>
													<FontAwesomeIcon
														icon={isStaticBadge ? faInfinity : faClock}
													/>
												</span>
												<span className="font-bold text-gray-700">
													{isStaticBadge
														? "Static Badge (Permanent)"
														: "Dynamic Badge (Rotating)"}
												</span>
											</div>
											<p className="text-xs text-gray-500 ml-6 leading-snug">
												{isStaticBadge
													? "URL is permanent. Safe to print on posters."
													: "URL changes every few seconds. Keep this screen open for attendees."}
											</p>
										</div>

										{/* INTERNAL SCANNER */}
										<button
											type="button"
											onClick={() => {
												setUserScanMessageInGrantTab("");
												setIsScannerModalOpen(true);
											}}
											className="w-full max-w-xs px-4 py-2 mb-4 font-semibold bg-green-500 hover:bg-green-600 text-white rounded-lg shadow transition-colors flex items-center justify-center gap-2"
											disabled={patchUserMutation.isPending}
										>
											<FontAwesomeIcon icon={faQrcode} />
											Scan User ID (Internal)
										</button>

										{userScanMessageInGrantTab && (
											<p className="text-sm text-gray-700 mb-4 bg-yellow-50 p-2 rounded border border-yellow-200">
												{userScanMessageInGrantTab}
											</p>
										)}

										<div className="my-4 border-t border-gray-300 w-3/4"></div>

										<p className="font-semibold text-gray-600 mb-3">
											Public Scanning (Native Camera)
										</p>

										{/* QR CODE CONTAINER - FIXED HEIGHT */}
										<div className="relative w-64 h-64 bg-white rounded-xl shadow-inner border border-gray-200 flex items-center justify-center mb-2 overflow-hidden">
											{isLoadingQrToken && !qrCodeValue ? (
												<div className="text-indigo-500 animate-pulse flex flex-col items-center">
													<FontAwesomeIcon
														icon={faSync}
														spin
														className="text-3xl mb-2"
													/>
													<span className="text-sm">Generating...</span>
												</div>
											) : qrTokenError ? (
												<div className="text-red-500 text-center px-4">
													<p className="text-sm font-bold mb-1">Error</p>
													<p className="text-xs">{qrTokenError}</p>
												</div>
											) : qrCodeValue ? (
												<motion.div
													layoutId={`qr-code-modal-${achievementIdForQr}`}
													onClick={() => setIsQrCodeZoomed(true)}
													className="cursor-pointer group relative p-2"
													initial={{ opacity: 0, scale: 0.8 }}
													animate={{ opacity: 1, scale: 1 }}
												>
													<QRCodeCanvas
														value={qrCodeValue}
														size={220}
														level="H"
														includeMargin
													/>
													<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/10 transition-opacity rounded-lg">
														<FontAwesomeIcon
															icon={faExpand}
															className="text-white drop-shadow-md text-2xl"
														/>
													</div>
												</motion.div>
											) : null}
										</div>

										<div className="flex items-center gap-3">
											<button
												type="button"
												onClick={() => {
													setIsLoadingQrToken(true);
													fetchQr();
												}}
												className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
											>
												<FontAwesomeIcon
													icon={faSync}
													className={isLoadingQrToken ? "animate-spin" : ""}
												/>
												Refresh Code
											</button>

											{!isStaticBadge && (
												<span className="text-[10px] text-amber-600 font-mono bg-amber-50 px-2 py-1 rounded border border-amber-100">
													Auto-refreshing (5s)
												</span>
											)}
										</div>
									</div>
								)}

								{/* MANUAL TAB */}
								{activeTab === "manual" && isAdmin && (
									<div>
										<h3 className="text-lg font-semibold text-center mb-1 text-gray-700">
											{selectedUserNameForAction
												? `Actions for: ${selectedUserNameForAction}`
												: "Select User and Action"}
										</h3>

										{isLoadingUsers && (
											<p className="text-center text-gray-500">
												Loading users...
											</p>
										)}
										{isUsersError && (
											<p className="text-center text-red-500">
												Error loading users:{" "}
												{usersError?.message || "Unknown error"}
											</p>
										)}

										{!isLoadingUsers && !isUsersError && usersData && (
											<div className="space-y-4 mt-3">
												<div className="flex flex-col sm:flex-row gap-4">
													<input
														type="text"
														placeholder="Search user..."
														value={searchTerm}
														onChange={(e) => {
															setSearchTerm(e.target.value);
															setSelectedUserIdForAction(null);
															setSelectedUserNameForAction(null);
															setOptimisticSelectedUserStatus(null);
															setManualActionStatus({
																message: "",
																error: false,
															});
														}}
														className="flex-grow px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
													/>
													<div className="flex items-center gap-3 flex-shrink-0">
														<span className="text-sm font-medium text-gray-600">
															View:
														</span>
														<label className="flex items-center gap-1 text-sm cursor-pointer">
															<input
																type="radio"
																name="userViewFilter"
																value="all"
																checked={userViewFilter === "all"}
																onChange={() => setUserViewFilter("all")}
																className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
															/>{" "}
															All
														</label>
														<label className="flex items-center gap-1 text-sm cursor-pointer">
															<input
																type="radio"
																name="userViewFilter"
																value="achieved"
																checked={userViewFilter === "achieved"}
																onChange={() => setUserViewFilter("achieved")}
																className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
															/>{" "}
															Achieved
														</label>
													</div>
												</div>

												<div className="max-h-60 overflow-y-auto border rounded bg-white p-2 space-y-1">
													{filteredUsers.length === 0 && (
														<p className="text-center text-gray-500 italic p-2">
															No users match criteria.
														</p>
													)}
													{filteredUsers.map((user) => {
														const baseStatus = userStatusMap.get(user.id);
														const isUserSelected =
															selectedUserIdForAction === user.id;
														const isUserPending =
															patchUserMutation?.isPending &&
															patchUserMutation?.variables?.targetUserId ===
																user.id;
														const displayStatus = isUserSelected
															? selectedUserDisplayStatus
															: baseStatus || {
																	achieved: false,
																	count: 0,
																	score: null,
																};
														const displayHasBadge = displayStatus?.achieved;
														const displayCount = displayStatus?.count ?? 0;
														const displayScore = displayStatus?.score ?? "-";

														return (
															<button
																key={user.id}
																type="button"
																onClick={() => handleSelectUserFromList(user)}
																className={`w-full text-left p-2 rounded flex justify-between items-center transition-colors ${
																	isUserSelected
																		? "bg-indigo-100 ring-1 ring-indigo-300"
																		: "hover:bg-gray-50"
																} ${
																	isUserPending ? "opacity-50 cursor-wait" : ""
																}`}
																disabled={isUserPending}
															>
																<div>
																	<span className="font-medium text-sm">
																		{`${user.firstName || ""} ${
																			user.lastName || ""
																		}` || user.username}
																	</span>
																	<span className="block text-xs text-gray-500">
																		{user.primaryEmailAddress}
																	</span>
																</div>
																<div className="flex items-center gap-2 flex-shrink-0 ml-2 text-xs">
																	{isAttendance && (
																		<span className="text-gray-600">
																			Count: {displayCount}
																		</span>
																	)}
																	{isScoreEnabled && (
																		<span className="text-gray-600">
																			Score: {displayScore}
																		</span>
																	)}
																	{displayHasBadge && (
																		<FontAwesomeIcon
																			icon={faCheck}
																			className="text-green-500 h-4 w-4"
																			title="Has Badge"
																		/>
																	)}
																</div>
															</button>
														);
													})}
												</div>
											</div>
										)}

										{selectedUserIdForAction &&
											selectedUserDisplayStatus &&
											activeTab === "manual" && (
												<div className="bg-gray-50 p-4 rounded border space-y-3 mt-4">
													<p className="text-sm font-medium text-center text-gray-700">
														Actions for:{" "}
														<span className="font-semibold">
															{selectedUserNameForAction ||
																selectedUserIdForAction}
														</span>
														<span
															className={`ml-2 text-xs ${
																patchUserMutation?.isPending &&
																patchUserMutation?.variables?.targetUserId ===
																	selectedUserIdForAction
																	? "italic text-orange-600"
																	: "text-gray-600"
															}`}
														>
															(Status:{" "}
															{selectedUserDisplayStatus.achieved
																? "Achieved"
																: "Not Achieved"}
															{isAttendance
																? `, Count: ${
																		selectedUserDisplayStatus.count ?? 0
																	}`
																: ""}
															{isScoreEnabled
																? `, Score: ${
																		selectedUserDisplayStatus.score ?? "-"
																	}`
																: ""}
															{patchUserMutation?.isPending &&
															patchUserMutation?.variables?.targetUserId ===
																selectedUserIdForAction
																? " - Pending..."
																: ""}
															)
														</span>
													</p>
													<div className="flex flex-wrap justify-center gap-2">
														{!isAttendance && (
															<>
																<button
																	type="button"
																	onClick={() => handleManualAction("grant")}
																	disabled={
																		patchUserMutation?.isPending ||
																		selectedUserDisplayStatus.achieved
																	}
																	className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
																>
																	Grant Badge
																</button>
																<button
																	type="button"
																	onClick={() => handleManualAction("revoke")}
																	disabled={
																		patchUserMutation?.isPending ||
																		!selectedUserDisplayStatus.achieved
																	}
																	className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
																>
																	Revoke Badge
																</button>
															</>
														)}
														{isAttendance && (
															<>
																<button
																	type="button"
																	onClick={() =>
																		handleManualAction("increment")
																	}
																	disabled={patchUserMutation?.isPending}
																	className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
																>
																	<FontAwesomeIcon
																		icon={faPlus}
																		className="mr-1"
																	/>{" "}
																	Count
																</button>
																<button
																	type="button"
																	onClick={() =>
																		handleManualAction("decrement")
																	}
																	disabled={
																		patchUserMutation?.isPending ||
																		(selectedUserDisplayStatus.count ?? 0) <= 0
																	}
																	className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
																>
																	<FontAwesomeIcon
																		icon={faMinus}
																		className="mr-1"
																	/>{" "}
																	Count
																</button>
																<button
																	type="button"
																	onClick={() => handleManualAction("revoke")}
																	disabled={
																		patchUserMutation?.isPending ||
																		(!selectedUserDisplayStatus.achieved &&
																			(selectedUserDisplayStatus.count ?? 0) ===
																				0)
																	}
																	className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
																>
																	<FontAwesomeIcon
																		icon={faRotateLeft}
																		className="mr-1"
																	/>{" "}
																	Revoke/Reset
																</button>
															</>
														)}
													</div>
													{isScoreEnabled && (
														<div className="flex items-center justify-center gap-2 pt-3 border-t">
															<label
																htmlFor="manual-score"
																className="text-sm font-medium text-gray-700"
															>
																Set Score:
															</label>
															<input
																type="number"
																id="manual-score"
																value={scoreInput}
																onChange={(e) => setScoreInput(e.target.value)}
																className="w-24 px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
																placeholder="Score"
																disabled={patchUserMutation?.isPending}
															/>
															<button
																type="button"
																onClick={() => handleManualAction("setScore")}
																disabled={patchUserMutation?.isPending}
																className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
															>
																<FontAwesomeIcon
																	icon={faFloppyDisk}
																	className="mr-1"
																/>{" "}
																Set
															</button>
														</div>
													)}
													{manualActionStatus.message && (
														<p
															className={`text-xs text-center pt-2 ${
																manualActionStatus.error
																	? "text-red-600"
																	: "text-green-700"
															}`}
														>
															{manualActionStatus.message}
														</p>
													)}
												</div>
											)}
									</div>
								)}
							</div>

							{/* Zoomed QR View */}
							<AnimatePresence>
								{isQrCodeZoomed && qrCodeValue && (
									<motion.div
										className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80]"
										onClick={() => setIsQrCodeZoomed(false)}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
									>
										<motion.div
											layoutId={`qr-code-modal-${achievementIdForQr}`}
											className="bg-white p-4 rounded-lg shadow-2xl"
											onClick={(e) => e.stopPropagation()}
										>
											<QRCodeCanvas
												value={qrCodeValue}
												size={350}
												level="H"
												includeMargin
											/>
											<p className="text-center mt-2 text-sm text-gray-500">
												Tap outside to close
											</p>
										</motion.div>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
