"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { BackgroundEvent } from "@/components/Background";
import BecomeMemberModal from "@/components/BecomeMemberModal";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import AddMembershipModal from "@/components/Membership/AddMembershipModal";
import EditMembershipModal from "@/components/Membership/EditMembershipModal";
import MembershipDetailModal from "@/components/Membership/MembershipDetailModal";
import UserCardModal from "@/components/UserCardModal";

const fetchMemberships = async () => {
	const response = await fetch("/api/memberships");
	if (!response.ok) {
		const errorData = await response.text();
		throw new Error(
			`Failed to fetch memberships. Status: ${response.status}. ${errorData}`,
		);
	}
	return response.json();
};

const createMembership = async (newMembershipData) => {
	const response = await fetch("/api/memberships", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(newMembershipData),
	});
	if (!response.ok) {
		let errorData = {
			message: `Request failed with status ${response.status}`,
		};
		try {
			errorData = await response.json();
		} catch (e) {}
		if (response.status === 403) {
			throw new Error(
				errorData.message ||
					"You do not have permission to create memberships.",
			);
		}
		throw new Error(errorData.message || "Failed to create membership");
	}
	return response.json();
};

const editMembershipApi = async (updatedMembershipData) => {
	const response = await fetch("/api/memberships", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(updatedMembershipData),
	});
	if (!response.ok) {
		let errorData = {
			message: `Request failed with status ${response.status}`,
		};
		try {
			errorData = await response.json();
		} catch (e) {}
		if (response.status === 403) {
			throw new Error(
				errorData.message || "You do not have permission to edit memberships.",
			);
		}
		throw new Error(errorData.message || "Failed to update membership");
	}
	return response.json();
};

const deleteMembership = async (membershipId) => {
	const response = await fetch(`/api/memberships?id=${membershipId}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		let errorData = {
			message: `Request failed with status ${response.status}`,
		};
		try {
			errorData = await response.json();
		} catch (e) {}
		if (response.status === 403) {
			throw new Error(
				errorData.message ||
					"You do not have permission to delete memberships.",
			);
		}
		throw new Error(errorData.message || "Failed to delete membership");
	}
	return response.json();
};

const DiscountCard = ({
	membership,
	onOpenModal,
	onDelete,
	onEdit,
	canManage,
}) => {
	return (
		<div className="relative w-full h-full flex flex-col rounded-xl border-2 border-black shadow-black shadow-xl overflow-hidden bg-white">
			{membership.imgurl ? (
				<div className="w-full h-48 bg-gray-200">
					<img
						src={membership.imgurl}
						alt={membership.name}
						className="w-full h-full object-cover"
						onError={(e) => {
							e.target.style.display = "none";
							const parent = e.target.parentElement;
							if (parent) {
								const placeholder = document.createElement("div");
								placeholder.className =
									"w-full h-full flex items-center justify-center text-gray-500 bg-gray-100";
								placeholder.textContent = "Image not available";
								parent.appendChild(placeholder);
							}
						}}
					/>
				</div>
			) : (
				<div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-500">
					No Image Provided
				</div>
			)}
			<div className="p-4 flex flex-col flex-grow">
				<h3 className="text-xl font-semibold mb-2 text-gray-900">
					{membership.name}
				</h3>
				<p className="text-gray-700 mb-1 text-sm">
					<span className="font-medium text-gray-800">Discount:</span>{" "}
					{membership.discount}
				</p>
				<p className="text-gray-700 mb-3 text-sm">
					<span className="font-medium text-gray-800">Address:</span>{" "}
					{membership.address}
				</p>
				<p className="text-gray-800 text-base mb-4 flex-grow line-clamp-3">
					{membership.description}
				</p>
				<div className="mt-auto pt-2 flex flex-col gap-2">
					<button
						onClick={() => onOpenModal(membership)}
						className="w-full text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-gray-100/70 text-black font-semibold"
					>
						More Details
					</button>
					{canManage && (
						<div className="flex gap-2">
							<button
								onClick={() => onEdit(membership)}
								className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-yellow-200 text-yellow-800 font-semibold hover:bg-yellow-300"
							>
								Edit
							</button>
							<button
								onClick={() => {
									if (
										window.confirm(
											`Are you sure you want to delete the discount for "${membership.name}"?`,
										)
									) {
										onDelete(membership.id);
									}
								}}
								className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-red-200 text-red-800 font-semibold hover:bg-red-300"
							>
								Delete
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const AddMembershipCard = ({ onClick }) => {
	return (
		<button
			onClick={onClick}
			className="bg-white shadow-md rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors aspect-[3/4] md:aspect-auto min-h-[300px] md:min-h-[450px]"
			aria-label="Add new membership discount"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-12 w-12 mb-2"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={1.5}
			>
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			<span className="text-lg font-medium">Add New Discount</span>
		</button>
	);
};

export default function MembershipPage() {
	const { user, isLoaded, isSignedIn } = useUser();
	const queryClient = useQueryClient();

	const [selectedMembershipDetail, setSelectedMembershipDetail] =
		useState(null);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [membershipToEdit, setMembershipToEdit] = useState(null);
	const [isBecomeMemberModalOpen, setIsBecomeMemberModalOpen] = useState(false);
	const [isUserCardModalOpen, setIsUserCardModalOpen] = useState(false);
	const [isPerksOpen, setIsPerksOpen] = useState(false);

	const {
		data: membershipsData,
		isLoading: isMembershipsLoading,
		isError: isMembershipsError,
		error: membershipsError,
	} = useQuery({
		queryKey: ["memberships"],
		queryFn: fetchMemberships,
		enabled: isLoaded,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const canManageMemberships =
		isLoaded &&
		isSignedIn &&
		user &&
		(user.publicMetadata?.admin === true ||
			user.publicMetadata?.committee === true);

	const isUserMember =
		isLoaded && isSignedIn && user && user.publicMetadata?.member === true;

	const createMembershipMutation = useMutation({
		mutationFn: createMembership,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["memberships"] });
			closeAddModal();
			toast.success("Membership Discount Added!");
		},
		onError: (error) => {
			toast.error(`Create failed: ${error.message}`);
		},
	});

	const editMembershipMutation = useMutation({
		mutationFn: editMembershipApi,
		onSuccess: (updatedMembership) => {
			queryClient.setQueryData(["memberships"], (oldData) =>
				oldData?.map((mem) =>
					mem.id === updatedMembership.id ? updatedMembership : mem,
				),
			);
			closeEditModal();
			toast.success("Membership Discount Updated!");
		},
		onError: (error) => {
			toast.error(`Update failed: ${error.message}`);
		},
	});

	const deleteMembershipMutation = useMutation({
		mutationFn: deleteMembership,
		onMutate: async (membershipId) => {
			await queryClient.cancelQueries({ queryKey: ["memberships"] });
			const previousMemberships = queryClient.getQueryData(["memberships"]);
			queryClient.setQueryData(
				["memberships"],
				(oldData) => oldData?.filter((m) => m.id !== membershipId) || [],
			);
			return { previousMemberships, membershipId };
		},
		onSuccess: (data, membershipId) => {
			toast.success(data.message || "Membership discount deleted.");
			if (selectedMembershipDetail?.id === membershipId) {
				closeDetailModal();
			}
		},
		onError: (error, membershipId, context) => {
			if (context?.previousMemberships) {
				queryClient.setQueryData(["memberships"], context.previousMemberships);
			}
			toast.error(`Delete failed: ${error.message}`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["memberships"] });
		},
	});

	const openDetailModal = (membership) => {
		setSelectedMembershipDetail(membership);
		document.body.style.overflow = "hidden";
	};

	const closeDetailModal = () => {
		setSelectedMembershipDetail(null);
		document.body.style.overflow = "";
	};

	const openAddModal = () => {
		setIsAddModalOpen(true);
		document.body.style.overflow = "hidden";
	};
	const closeAddModal = () => {
		setIsAddModalOpen(false);
		document.body.style.overflow = "";
	};

	const openEditModal = (membership) => {
		setMembershipToEdit(membership);
		setIsEditModalOpen(true);
		document.body.style.overflow = "hidden";
	};
	const closeEditModal = () => {
		setIsEditModalOpen(false);
		setMembershipToEdit(null);
		document.body.style.overflow = "";
	};

	const openBecomeMemberModal = () => {
		setIsBecomeMemberModalOpen(true);
		document.body.style.overflow = "hidden";
	};
	const closeBecomeMemberModal = () => {
		setIsBecomeMemberModalOpen(false);
		document.body.style.overflow = "";
	};

	const openUserCardModal = () => {
		if (user) {
			setIsUserCardModalOpen(true);
			document.body.style.overflow = "hidden";
		}
	};
	const closeUserCardModal = () => {
		setIsUserCardModalOpen(false);
		document.body.style.overflow = "";
	};

	const allMemberships = membershipsData || [];

	return (
		<>
			<Toaster position="top-center" reverseOrder={false} />
			<BackgroundEvent />
			<div className="flex flex-col min-h-screen">
				<div className="relative z-10 p-4 md:p-8 mt-24 md:mt-32 flex-grow md:mb-50">
					<Header />
					<main className="container mx-auto px-4 py-8">
						<div className="text-center mb-8">
							<h1 className="text-3xl md:text-5xl font-Header text-mainColor font-bold text-center">
								Membership
							</h1>

							<p className="mt-4 text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto text-center">
								Become a Culture Connection member,
								<span className="text-mainColor font-semibold">
									{" "}
									it is FREE!
								</span>{" "}
							</p>

							<section className="mt-6 max-w-3xl mx-auto">
								<button
									onClick={() => setIsPerksOpen(!isPerksOpen)}
									className="w-full flex items-center justify-center gap-2 text-2xl md:text-3xl font-Header text-mainColor font-bold mb-4 hover:opacity-80 transition-opacity"
								>
									Perks You Get
									<FontAwesomeIcon
										icon={isPerksOpen ? faChevronUp : faChevronDown}
										className="h-6 w-6"
									/>
								</button>
								<AnimatePresence>
									{isPerksOpen && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.3, ease: "easeInOut" }}
											className="overflow-hidden"
										>
											<ul className="list-disc list-inside space-y-2 text-gray-700">
												<li>
													<span className="font-semibold">
														Exclusive discounts from our local collaborators
													</span>{" "}
												</li>
												<li>
													<span className="font-semibold">
														Customizable digital membership card
													</span>
												</li>
												<li>
													<span className="font-semibold">
														Fun badge/achievement game
													</span>
												</li>
												<li>
													<span className="font-semibold">
														Access to the Culture Connection picture gallery
													</span>
												</li>
											</ul>

											<div className="mt-12">
												<h2 className="text-2xl md:text-3xl font-Header text-mainColor font-bold mb-4">
													Verification
												</h2>
												<p className="text-gray-700 mb-4">
													Verification is free. Submit your{" "}
													<span className="text-mainColor font-semibold">
														full name
													</span>{" "}
													and our Secretary will approve within two working
													days. If you haven’t heard back, email{" "}
													<a
														href="mailto:secretary@cultureconnection.se"
														className="text-mainColor font-semibold hover:underline"
													>
														secretary@cultureconnection.se
													</a>
													.
												</p>
												<p className="text-gray-700">
													Memberships run{" "}
													<span className="text-mainColor font-semibold">
														August–January
													</span>{" "}
													and{" "}
													<span className="text-mainColor font-semibold">
														January–August
													</span>
													. Re-verify at the start of each period to keep
													enjoying your perks.
												</p>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</section>

							{isLoaded && isSignedIn && !isUserMember && (
								<div className="mt-6">
									<button
										onClick={openBecomeMemberModal}
										className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-yellow-200 text-yellow-800 font-semibold hover:bg-yellow-300"
									>
										Become a Member
									</button>
								</div>
							)}
							{isLoaded && isSignedIn && isUserMember && (
								<div className="mt-6">
									<button
										onClick={openUserCardModal}
										className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-blue-200 text-blue-800 font-semibold hover:bg-blue-300"
									>
										Show Member Card
									</button>
								</div>
							)}
							{isLoaded && !isSignedIn && (
								<div className="mt-6">
									<p className="text-gray-600 mb-2">
										Want to become a member and see more?
									</p>
									<SignInButton
										mode="modal"
										afterSignInUrl="/membership"
										afterSignUpUrl="/membership"
									>
										<button className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-blue-200 text-blue-800 font-semibold hover:bg-blue-300">
											Sign In to Join
										</button>
									</SignInButton>
								</div>
							)}
						</div>

						{!isLoaded && (
							<p className="text-center text-gray-500 text-lg">
								Loading user information...
							</p>
						)}

						{isLoaded && (
							<>
								{isMembershipsLoading && (
									<p className="text-center text-gray-500 text-lg">
										Loading discounts...
									</p>
								)}
								{isMembershipsError && (
									<div className="text-center text-red-600 bg-red-100 p-4 rounded border border-red-300 max-w-lg mx-auto">
										<p className="font-semibold">Error loading discounts:</p>
										<p className="text-sm">
											{membershipsError instanceof Error
												? membershipsError.message
												: "An unknown error occurred."}
										</p>
									</div>
								)}

								{!isMembershipsLoading && !isMembershipsError && (
									<>
										{allMemberships.length === 0 && (
											<p className="text-center text-gray-500 text-lg">
												No membership discounts found. Check back soon!
											</p>
										)}
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
											{canManageMemberships && (
												<AddMembershipCard onClick={openAddModal} />
											)}
											{allMemberships.map((membership) => (
												<DiscountCard
													key={membership.id}
													membership={membership}
													onOpenModal={openDetailModal}
													onDelete={deleteMembershipMutation.mutate}
													onEdit={openEditModal}
													canManage={canManageMemberships}
												/>
											))}
										</div>
										{allMemberships.length === 0 && canManageMemberships && (
											<p className="text-center text-gray-500 text-lg mt-8">
												No membership discounts found. Click the card above to
												add one!
											</p>
										)}
									</>
								)}
							</>
						)}
					</main>
				</div>
				<Footer />
			</div>

			<AnimatePresence>
				{selectedMembershipDetail && (
					<MembershipDetailModal
						isOpen={!!selectedMembershipDetail}
						onClose={closeDetailModal}
						membershipData={selectedMembershipDetail}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isAddModalOpen && (
					<AddMembershipModal
						isOpen={isAddModalOpen}
						onClose={closeAddModal}
						createMembershipMutation={createMembershipMutation}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isEditModalOpen && membershipToEdit && (
					<EditMembershipModal
						isOpen={isEditModalOpen}
						onClose={closeEditModal}
						editMembershipMutation={editMembershipMutation}
						membershipData={membershipToEdit}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isBecomeMemberModalOpen && (
					<BecomeMemberModal
						isOpen={isBecomeMemberModalOpen}
						onClose={closeBecomeMemberModal}
						user={user}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isUserCardModalOpen && user && (
					<UserCardModal
						isOpen={isUserCardModalOpen}
						onClose={closeUserCardModal}
						user={user}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
