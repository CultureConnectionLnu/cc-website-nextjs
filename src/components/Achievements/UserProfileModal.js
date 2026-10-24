"use client";

import { faSpinner, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";

const modalVariants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const placeholderImg =
	"https://api2.cultureconnection.se/assets/achievments-badges/5b765b8d-b7af-4c4b-9a85-c6ace210faca.png";

export default function UserProfileModal({
	isOpen,
	onClose,
	profileData,
	isLoading,
}) {
	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
				initial="hidden"
				animate="visible"
				exit="exit"
				variants={modalVariants}
				onClick={onClose}
			>
				<motion.div
					className="bg-white rounded-lg shadow-xl max-w-2xl w-full relative flex flex-col max-h-[80vh]"
					onClick={(e) => e.stopPropagation()}
					variants={modalVariants}
				>
					<div className="p-4 border-b flex justify-between text-center items-center">
						<h2 className="text-lg md:text-xl font-semibold text-gray-800">
							{isLoading
								? "Loading Profile..."
								: `This is ${profileData?.userName || "a user"}'s badges`}
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

					<div className="p-6 overflow-y-auto">
						{isLoading ? (
							<div className="flex justify-center items-center h-64">
								<FontAwesomeIcon
									icon={faSpinner}
									className="fa-spin text-4xl text-indigo-500"
								/>
							</div>
						) : !profileData || profileData.achievements.length === 0 ? (
							<p className="text-center text-gray-500 py-10">
								This user hasn't achieved any badges yet.
							</p>
						) : (
							<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 justify-items-center">
								{profileData.achievements.map((ach) => (
									<div
										key={ach.id}
										className="w-24 h-24 md:w-32 md:h-32 flex flex-col items-center text-center"
										title={`${ach.title}\n${ach.description}`}
									>
										<img
											src={ach.imgurl || placeholderImg}
											alt={ach.title}
											className="w-full h-full object-cover "
											onError={(e) => {
												e.currentTarget.src = placeholderImg;
											}}
										/>
										<p className="text-xs mt-1 font-medium text-gray-700 truncate w-full">
											{ach.title}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
