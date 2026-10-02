"use client";

import { useUser } from "@clerk/nextjs";
import { faLock, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import BecomeMemberModal from "@/components/Modals/BecomeMemberModal";
import LoginRequiredModal from "@/components/Modals/LoginRequiredModal";
import ClaimSuccessUI from "./ClaimSuccessUI";

export default function ClaimGatekeeper({ status, result, returnUrl }) {
	const { user, isLoaded } = useUser();
	const [showMemberModal, setShowMemberModal] = useState(false);
	const [showLoginModal, setShowLoginModal] = useState(false);

	useEffect(() => {
		// Open relevant modal immediately on mount
		if (status === "login_required") {
			setShowLoginModal(true);
		} else if (status === "member_required") {
			setShowMemberModal(true);
		}
	}, [status]);

	// If loading Clerk user data, show a spinner
	if (status === "member_required" && !isLoaded) {
		return <LoadingScreen />;
	}

	// --- RENDER STATES ---

	if (status === "success") {
		return <ClaimSuccessUI result={result} />;
	}

	return (
		<div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
			{/* BACKGROUND (Blurred "Locked" Look) */}
			<div className="absolute inset-0 bg-[url('/noise.png')] opacity-10"></div>
			<div className="z-0 opacity-50 blur-sm scale-95 pointer-events-none">
				<div className="bg-white/10 border border-white/20 rounded-3xl p-8 max-w-sm w-full h-96 flex flex-col items-center justify-center">
					<FontAwesomeIcon
						icon={faLock}
						className="text-white/20 text-8xl mb-4"
					/>
					<div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
					<div className="h-4 bg-white/10 rounded w-1/2"></div>
				</div>
			</div>

			{/* MODALS RENDERED DIRECTLY */}
			<BecomeMemberModal
				isOpen={showMemberModal}
				onClose={() => {}} // Prevent closing (Mandatory)
				user={user}
			/>

			{/* We pass the returnUrl to the Login Modal so redirect works */}
			<LoginRequiredModal
				isOpen={showLoginModal}
				onClose={() => {}} // Prevent closing
				returnUrl={returnUrl}
			/>
		</div>
	);
}

function LoadingScreen() {
	return (
		<div className="min-h-screen bg-slate-900 flex items-center justify-center">
			<FontAwesomeIcon
				icon={faSpinner}
				spin
				className="text-indigo-500 text-4xl"
			/>
		</div>
	);
}
