import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import Link from "next/link";

const MOBILE_CARD_HEIGHT = "60vh";
const MAX_MOBILE_CARD_WIDTH = "90vw";

const mobileCardAnimationVariants = {
	enter: (direction) => ({
		x: direction === "next" ? "100%" : "-100%",
		opacity: 0,
		scale: 0.9,
		rotate: direction === "next" ? -10 : 10,
	}),
	center: {
		x: 0,
		opacity: 1,
		scale: 1,
		rotate: 0,
		zIndex: 1,
		transition: { type: "spring", stiffness: 100, damping: 20, duration: 0.4 },
	},
	exit: (direction) => ({
		x: direction === "next" ? "-100%" : "100%",
		opacity: 0,
		scale: 0.9,
		rotate: direction === "next" ? 10 : -10,
		zIndex: 0,
		transition: { duration: 0.3, ease: "easeIn" },
	}),
};

export default function ActivitiesMobile({
	activeCardData,
	onRotate,
	openModal,
	isAnimating,
	cardCount,
	animationDirection,
	setAnimationDirection,
}) {
	if (!activeCardData) {
		return (
			<div className="flex items-center justify-center h-full text-gray-500 py-10">
				No activities to display.
			</div>
		);
	}

	const handleRotate = (newDirection) => {
		if (!isAnimating) {
			setAnimationDirection(newDirection);
			onRotate(newDirection);
		}
	};

	const imageSrc = activeCardData.imageUrl;

	return (
		<div className="flex flex-col items-center justify-center w-full h-full p-2 sm:p-4">
			<div
				className="relative w-full flex items-center justify-center"
				style={{ height: MOBILE_CARD_HEIGHT, maxWidth: MAX_MOBILE_CARD_WIDTH }}
			>
				<AnimatePresence initial={false} custom={animationDirection}>
					<motion.div
						key={activeCardData.id}
						className="absolute w-full h-full cursor-grab"
						custom={animationDirection}
						variants={mobileCardAnimationVariants}
						initial="enter"
						animate="center"
						exit="exit"
						drag="x"
						dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
						dragElastic={0.5}
						onDragEnd={(event, { offset, velocity }) => {
							if (isAnimating) return;
							const swipeThreshold = 60;
							const swipePower = Math.abs(offset.x) * velocity.x;

							if (offset.x < -swipeThreshold || swipePower < -7000) {
								handleRotate("next");
							} else if (offset.x > swipeThreshold || swipePower > 7000) {
								handleRotate("prev");
							}
						}}
					>
						<div
							className={`card ${
								activeCardData.bgColor ||
								"bg-gradient-to-br from-gray-100 to-gray-200"
							} w-full h-full flex flex-col rounded-xl border-2 border-black shadow-black shadow-lg overflow-hidden`}
						>
							<div className="w-full h-2/5 sm:h-1/2 bg-gray-300 relative flex-shrink-0">
								{imageSrc ? (
									<motion.img
										key={imageSrc}
										src={imageSrc}
										alt={activeCardData.title}
										className="object-cover w-full h-full"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ duration: 0.3 }}
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
										<span className="text-gray-600 text-2xl font-bold opacity-50">
											{activeCardData.title.substring(0, 3)}
										</span>
									</div>
								)}
							</div>
							<div className="w-full flex-grow flex flex-col justify-between p-3 text-left overflow-y-auto">
								<div>
									<h2 className="card-title text-3xl text-black text-center my-4 font-bold mb-1">
										{activeCardData.title}
									</h2>
									<div className="text-lg font-semibold mb-2 space-y-0.5">
										<p className="text-gray-800">
											<span className="font-bold">Date:</span>{" "}
											{activeCardData.date}
										</p>
										<p className="text-gray-800">
											<span className="font-bold">Time:</span>{" "}
											{activeCardData.time}
										</p>
										<p className="text-gray-800">
											<span className="font-bold">Location:</span>{" "}
											{activeCardData.location}
										</p>
									</div>
								</div>
								<div className="mt-auto pt-2 flex justify-center">
									<motion.button
										onClick={(e) => {
											e.stopPropagation();
											openModal(activeCardData);
										}}
										className="btn bg-blue-500 text-white text-center px-5 py-2 mb-5 rounded-lg border-2 border-black shadow-md shadow-black hover:shadow-none hover:bg-blue-600 transition-all text-lg font-semibold"
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
									>
										More Info
									</motion.button>
								</div>
							</div>
						</div>
					</motion.div>
				</AnimatePresence>
			</div>

			<div className="flex items-center space-x-3 justify-center w-full mt-10">
				<Link
					href="/events"
					className="w-full md:w-auto mt-1 md:mt-2 text-center px-4 md:px-6 py-2 md:py-2.5 rounded-lg border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor2 text-white font-semibold text-sm md:text-base"
				>
					<p>Events</p>
				</Link>
				<motion.button
					onClick={() => handleRotate("prev")}
					className="w-full md:w-auto mt-1 md:mt-2 text-center px-4 md:px-6 py-2 md:py-2.5 rounded-lg border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor text-white font-semibold text-sm md:text-base"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					disabled={isAnimating || cardCount < 2}
				>
					Prev
				</motion.button>
				<motion.button
					onClick={() => handleRotate("next")}
					className="w-full md:w-auto mt-1 md:mt-2 text-center px-4 md:px-6 py-2 md:py-2.5 rounded-lg border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor text-white font-semibold text-sm md:text-base"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					disabled={isAnimating || cardCount < 2}
				>
					Next
				</motion.button>
			</div>
		</div>
	);
}

ActivitiesMobile.propTypes = {
	activeCardData: PropTypes.object,
	onRotate: PropTypes.func.isRequired,
	openModal: PropTypes.func.isRequired,
	isAnimating: PropTypes.bool.isRequired,
	cardCount: PropTypes.number.isRequired,
	animationDirection: PropTypes.string.isRequired,
	setAnimationDirection: PropTypes.func.isRequired,
};
