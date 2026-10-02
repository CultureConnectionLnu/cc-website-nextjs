"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faBan, faLock } from "@fortawesome/free-solid-svg-icons"; // Added faLock

const modalVariants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export default function CardSkinSelectionModal({
	isOpen,
	onClose,
	achievementsData,
	onSelectSkin,
	currentSelectedSkinUrl,
	isLoading,
}) {
	if (!isOpen) return null;

	const potentialSkins =
		achievementsData
			?.filter((ach) => ach.card_skin_image_url) // Get all achievements that *can* be skins
			.map((ach) => ({
				id: ach.id,
				title: ach.title, // Keep the achievement title for the tooltip
				skinUrl: ach.card_skin_image_url,
				isUnlocked: ach.currentUserAchieved, // Check if the user has achieved it
			})) || [];

	const handleSelect = (achievementId, skinUrl) => {
		if (isLoading) return;
		onSelectSkin(achievementId, skinUrl);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4"
					initial="hidden"
					animate="visible"
					exit="exit"
					variants={modalVariants}
					onClick={onClose}
				>
					<motion.div
						className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full relative flex flex-col max-h-[80vh]"
						onClick={(e) => e.stopPropagation()}
						variants={modalVariants}
					>
						<div className="p-5 border-b border-gray-200 flex justify-between items-center">
							<h2 className="text-lg font-semibold text-gray-800">
								Select Card Skin
							</h2>
							<button
								onClick={onClose}
								className="text-gray-400 hover:text-gray-700 z-20 bg-white rounded-full p-1 h-7 w-7 flex items-center justify-center"
								aria-label="Close modal"
							>
								<FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
							</button>
						</div>

						<div className="p-6 overflow-y-auto flex-grow">
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
								<button
									onClick={() => handleSelect(null, null)}
									className={`p-2 border-2 rounded-lg flex flex-col items-center justify-center h-36 transition-all
                    ${
											!currentSelectedSkinUrl
												? "border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50"
												: "border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-gray-100"
										}
                    ${isLoading ? "cursor-not-allowed opacity-70" : ""}`}
									disabled={isLoading}
									title="Remove current card skin"
								>
									<FontAwesomeIcon
										icon={faBan}
										className="text-4xl text-gray-400 mb-2"
									/>
									<span className="text-sm font-medium text-gray-600">
										No Skin
									</span>
								</button>

								{potentialSkins.map((skin) => (
									<button
										key={skin.id}
										onClick={() =>
											skin.isUnlocked
												? handleSelect(skin.id, skin.skinUrl)
												: null
										}
										className={`p-2 border-2 rounded-lg flex flex-col items-center justify-center h-36 transition-all group relative
                      ${
												currentSelectedSkinUrl === skin.skinUrl &&
												skin.isUnlocked
													? "border-indigo-500 ring-2 ring-indigo-300"
													: "border-gray-300"
											}
                      ${
												skin.isUnlocked
													? "hover:border-indigo-400"
													: "cursor-default"
											}
                      ${isLoading && skin.isUnlocked ? "cursor-not-allowed opacity-70" : ""}
                      ${isLoading && !skin.isUnlocked ? "opacity-70" : ""}
                    `}
										disabled={isLoading || !skin.isUnlocked}
										title={
											skin.isUnlocked
												? `Select skin: ${skin.title}`
												: `To get this card you need achieve this '${skin.title}' badge!`
										}
									>
										<img
											src={skin.skinUrl}
											alt={skin.title}
											className={`w-full h-24 object-contain mb-1 transition-all
                        ${
													skin.isUnlocked
														? "group-hover:scale-105"
														: "grayscale opacity-60"
												}
                      `}
										/>
										<span
											className={`text-xs text-center text-gray-600 truncate w-full px-1 ${
												!skin.isUnlocked ? "opacity-60" : ""
											}`}
										>
											{skin.title}
										</span>
										{!skin.isUnlocked && (
											<div className="absolute inset-0 bg-black/30 rounded-md flex items-center justify-center">
												<FontAwesomeIcon
													icon={faLock}
													className="text-white text-3xl opacity-80"
												/>
											</div>
										)}
									</button>
								))}
							</div>
							{potentialSkins.length === 0 && (
								<p className="text-center text-gray-500 mt-4">
									No card skins are available from any achievements yet.
								</p>
							)}
						</div>
						{isLoading && (
							<div className="p-4 text-center text-sm text-indigo-600">
								Saving selection...
							</div>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
