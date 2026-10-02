"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const modalVariants = {
	hidden: { opacity: 0, scale: 0.9 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

export default function EditMembershipModal({
	isOpen,
	onClose,
	editMembershipMutation,
	membershipData,
}) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [address, setAddress] = useState("");
	const [discount, setDiscount] = useState("");
	const [imgurl, setImgurl] = useState("");
	const [websiteUrl, setWebsiteUrl] = useState("");
	const [googleMapUrl, setGoogleMapUrl] = useState("");

	useEffect(() => {
		if (membershipData) {
			setName(membershipData.name || "");
			setDescription(membershipData.description || "");
			setAddress(membershipData.address || "");
			setDiscount(membershipData.discount || "");
			setImgurl(membershipData.imgurl || "");
			setWebsiteUrl(membershipData.websiteUrl || "");
			setGoogleMapUrl(membershipData.googleMapUrl || "");
		}
	}, [membershipData]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!name || !description || !address || !discount || !imgurl) {
			toast.error(
				"Please fill in all required fields: Name, Description, Address, Discount, Image URL.",
			);
			return;
		}
		try {
			await editMembershipMutation.mutateAsync({
				id: membershipData.id,
				name,
				description,
				address,
				discount,
				imgurl,
				websiteUrl: websiteUrl || null,
				googleMapUrl: googleMapUrl || null,
			});
		} catch (error) {}
	};

	if (!isOpen) return null;

	return (
		<motion.div
			className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-50 flex justify-center items-center p-4"
			initial="hidden"
			animate="visible"
			exit="exit"
			variants={modalVariants}
			onClick={onClose}
		>
			<motion.div
				className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full relative p-6"
				onClick={(e) => e.stopPropagation()}
				variants={modalVariants}
			>
				<button
					onClick={onClose}
					className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-20 bg-white rounded-full p-1"
					aria-label="Close modal"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
				<h2 className="text-2xl font-bold mb-4 text-gray-900">
					Edit Membership Discount
				</h2>
				<form
					onSubmit={handleSubmit}
					className="space-y-3 max-h-[70vh] overflow-y-auto pr-2"
				>
					<div>
						<label
							htmlFor="edit-membership-name"
							className="block text-sm font-medium text-gray-700"
						>
							Name of Business/Place *
						</label>
						<input
							type="text"
							id="edit-membership-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="edit-membership-description"
							className="block text-sm font-medium text-gray-700"
						>
							Description *
						</label>
						<textarea
							id="edit-membership-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						></textarea>
					</div>
					<div>
						<label
							htmlFor="edit-membership-address"
							className="block text-sm font-medium text-gray-700"
						>
							Address *
						</label>
						<input
							type="text"
							id="edit-membership-address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="edit-membership-discount"
							className="block text-sm font-medium text-gray-700"
						>
							Discount Details *
						</label>
						<input
							type="text"
							id="edit-membership-discount"
							value={discount}
							onChange={(e) => setDiscount(e.target.value)}
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="edit-membership-imgurl"
							className="block text-sm font-medium text-gray-700"
						>
							Image URL *
						</label>
						<input
							type="url"
							id="edit-membership-imgurl"
							value={imgurl}
							onChange={(e) => setImgurl(e.target.value)}
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="edit-membership-websiteurl"
							className="block text-sm font-medium text-gray-700"
						>
							Website URL (Optional)
						</label>
						<input
							type="url"
							id="edit-membership-websiteurl"
							value={websiteUrl}
							onChange={(e) => setWebsiteUrl(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="edit-membership-googlemapurl"
							className="block text-sm font-medium text-gray-700"
						>
							Google Maps Embed URL (Optional)
						</label>
						<input
							type="url"
							id="edit-membership-googlemapurl"
							value={googleMapUrl}
							onChange={(e) => setGoogleMapUrl(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
					</div>
					<div className="pt-2">
						<button
							type="submit"
							disabled={editMembershipMutation.isPending}
							className="w-full flex justify-center py-2 px-4 border-2 border-black rounded-md shadow-custom text-sm text-black bg-yellow-200 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 font-semibold"
						>
							{editMembershipMutation.isPending ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</form>
			</motion.div>
		</motion.div>
	);
}
