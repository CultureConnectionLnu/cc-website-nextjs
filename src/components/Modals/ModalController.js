"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// Make sure these paths match where you actually put the files
import BecomeMemberModal from "./BecomeMemberModal";
import LoginRequiredModal from "./LoginRequiredModal";

function ModalControllerContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { user } = useUser();

	const modalType = searchParams.get("modal"); // "become_member" | "login_required"

	// Helper to close modal by cleaning the URL
	const closeModal = () => {
		const params = new URLSearchParams(searchParams);
		params.delete("modal");
		params.delete("returnUrl"); // Clean up returnUrl if it exists

		// Replace URL without refreshing the page
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	// Prevent background scrolling when modal is open
	useEffect(() => {
		if (modalType) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [modalType]);

	return (
		<>
			<BecomeMemberModal
				isOpen={modalType === "become_member"}
				onClose={closeModal}
				user={user}
			/>

			<LoginRequiredModal
				isOpen={modalType === "login_required"}
				onClose={closeModal}
			/>
		</>
	);
}

// WRAP IN SUSPENSE: Required for useSearchParams in Next.js App Router
export default function ModalController() {
	return (
		<Suspense fallback={null}>
			<ModalControllerContent />
		</Suspense>
	);
}
