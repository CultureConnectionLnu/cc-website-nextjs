"use client";

import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { useState } from "react";

export default function GenericActivityModal({
	isOpen,
	onClose,
	cardData,
	motionVariants,
}) {
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	if (!isOpen || !cardData) return null;

	const galleryImages = (cardData.inDescription || [])
		.flatMap((item) => item.ImagesUrl || [])
		.filter((url) => typeof url === "string" && url.trim() !== "");

	const mainImage = cardData.imageUrl || galleryImages[0];

	const handleNextImage = (e) => {
		e.stopPropagation();
		setCurrentImageIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
	};

	const handlePrevImage = (e) => {
		e.stopPropagation();
		setCurrentImageIndex(
			(prevIndex) =>
				(prevIndex - 1 + galleryImages.length) % galleryImages.length,
		);
	};

	const hasValidUrl =
		typeof cardData.url === "string" && cardData.url.trim() !== "";

	return (
		<motion.div
			className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-50 flex justify-center items-center p-4"
			initial="hidden"
			animate="visible"
			exit="exit"
			variants={motionVariants}
			onClick={onClose}
		>
			<motion.div
				className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full relative"
				onClick={(e) => e.stopPropagation()}
				variants={motionVariants}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 z-20 bg-white rounded-full p-1"
					aria-label="Close modal"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<div className="max-h-[80vh] overflow-y-auto">
					{mainImage && (
						<div className="w-full h-48 bg-gray-200">
							<img
								src={mainImage}
								alt={cardData.title}
								className="w-full h-full object-cover"
								onError={(e) => {
									e.target.onerror = null;
									e.target.src =
										"https://api2.cultureconnection.se/assets/random/website/f6c5bd30-6ec2-4aba-8539-88a682b881dc.jpg";
								}}
							/>
						</div>
					)}

					<div className="p-6">
						<h2 className="text-2xl font-bold mb-3 text-gray-900">
							{cardData.title}
						</h2>
						<div className="text-sm text-gray-600 mb-4 space-y-1 border-b pb-3">
							<p>
								<span className="font-semibold">Date:</span> {cardData.date}
							</p>
							<p>
								<span className="font-semibold">Time:</span> {cardData.time}
							</p>
							<p>
								<span className="font-semibold">Location:</span>{" "}
								{cardData.location}
							</p>
						</div>

						<div className="prose prose-sm max-w-none text-gray-700 space-y-3 mb-4">
							{Array.isArray(cardData.inDescription) &&
								cardData.inDescription.length > 0 && (
									<div className="mt-4 pt-4 border-t border-gray-200">
										{cardData.inDescription.map(
											(item, index) =>
												(item.title || item.description) && (
													<div key={`desc-${index}`} className="mb-3 last:mb-0">
														{item.title && (
															<h4 className="font-semibold text-base mb-1">
																{item.title}
															</h4>
														)}
														{item.description && (
															<p className="text-sm">{item.description}</p>
														)}
													</div>
												),
										)}
									</div>
								)}
							{!cardData.description &&
								(!cardData.inDescription ||
									cardData.inDescription.length === 0) && (
									<p>More details coming soon!</p>
								)}
						</div>

						{galleryImages.length > 0 && (
							<div className="mt-4 pt-4 border-t border-gray-200">
								<h4 className="font-semibold mb-2 text-gray-700">Gallery</h4>
								<div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
									<img
										key={currentImageIndex}
										src={galleryImages[currentImageIndex]}
										alt={`${cardData.title} gallery image ${currentImageIndex + 1}`}
										className="w-full h-full object-contain"
									/>
									{galleryImages.length > 1 && (
										<>
											<button
												type="button"
												onClick={handlePrevImage}
												className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white p-1 rounded-full hover:bg-opacity-60"
												aria-label="Previous image"
											>
												&lt;
											</button>
											<button
												type="button"
												onClick={handleNextImage}
												className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white p-1 rounded-full hover:bg-opacity-60"
												aria-label="Next image"
											>
												&gt;
											</button>
											<div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-2 py-0.5 rounded">
												{currentImageIndex + 1} / {galleryImages.length}
											</div>
										</>
									)}
								</div>
							</div>
						)}

						{hasValidUrl && (
							<div className="mt-6 pt-4 border-t border-gray-200 text-center">
								<a
									href={cardData.url}
									target="_blank"
									rel="noopener noreferrer"
									className="w-[50%] text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor text-black font-semibold"
									onClick={(e) => e.stopPropagation()}
								>
									Learn More
								</a>
							</div>
						)}
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}

GenericActivityModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	cardData: PropTypes.object,
	motionVariants: PropTypes.object,
};
