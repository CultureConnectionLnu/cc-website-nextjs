"use client";

import { useUser } from "@clerk/nextjs";
import {
	faChevronLeft,
	faChevronRight,
	faEdit,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import SliderEditModal from "./SliderEditModal";

const cultureConnectionLogoUrl = "/cc.svg";

const slideVariants = {
	enter: (direction) => ({
		x: direction > 0 ? "100%" : "-100%",
		opacity: 0,
	}),
	center: { zIndex: 1, x: "0%", opacity: 1 },
	exit: (direction) => ({
		zIndex: 0,
		x: direction < 0 ? "100%" : "-100%",
		opacity: 0,
	}),
};

const slideTransition = {
	x: { type: "spring", stiffness: 300, damping: 30 },
	opacity: { duration: 0.2 },
};

function ArrowButton({ onClick, icon, ariaLabel, positionClasses }) {
	return (
		<button
			className={`!flex items-center justify-center absolute top-1/2 transform -translate-y-1/2 ${positionClasses} p-2 hover:text-white/50 z-20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-150`}
			onClick={onClick}
			aria-label={ariaLabel}
			type="button"
		>
			<FontAwesomeIcon
				icon={icon}
				className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
			/>
		</button>
	);
}

const CulturePictureSlider = ({ sliderId }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(0);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activePresetKey, setActivePresetKey] = useState(null);

	const queryClient = useQueryClient();
	const { user, isSignedIn } = useUser();
	const isAdmin = isSignedIn && user?.publicMetadata?.admin === true;

	const {
		data: sliderInfo,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["sliderData"],
		queryFn: async () => {
			const response = await fetch("/api/slideImages");
			if (!response.ok) throw new Error("Network response was not ok");
			return response.json();
		},
		staleTime: 1000 * 60 * 5,
	});

	useEffect(() => {
		if (sliderInfo && sliderId) {
			const mappedPreset = sliderInfo.settings.presetMappings[sliderId];
			setActivePresetKey(mappedPreset || sliderInfo.settings.defaultPreset);
		}
	}, [sliderId, sliderInfo]);

	const mutation = useMutation({
		mutationFn: async ({ newData, newSettings }) => {
			console.log("[Frontend] Sending save request:", { newData, newSettings }); // Debug log: Confirm data before send
			const response = await fetch("/api/slideImages", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ newData, newSettings }),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to save data");
			}
			return response.json();
		},
		onMutate: async ({ newData, newSettings }) => {
			await queryClient.cancelQueries({ queryKey: ["sliderData"] });
			const previousData = queryClient.getQueryData(["sliderData"]);
			queryClient.setQueryData(["sliderData"], {
				data: newData,
				settings: newSettings,
			});
			setIsModalOpen(false);
			toast.success("Changes applied instantly!");
			return { previousData };
		},
		onError: (err, variables, context) => {
			if (context?.previousData) {
				queryClient.setQueryData(["sliderData"], context.previousData);
			}
			console.error("[Frontend] Save error:", err); // Debug log
			if (err.message.includes("Forbidden")) {
				toast.error(
					"Save failed: You don't have admin permissions. Check your account settings.",
				);
			} else {
				toast.error("Failed to save changes. Reverting.");
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["sliderData"] });
		},
	});

	const allSlidesData = sliderInfo?.data;
	const currentImages =
		allSlidesData && activePresetKey
			? allSlidesData[activePresetKey] || []
			: [];

	const paginate = useCallback(
		(newDirection) => {
			if (currentImages.length <= 1) return;
			setDirection(newDirection);
			setCurrentIndex(
				(prev) =>
					(prev + newDirection + currentImages.length) % currentImages.length,
			);
		},
		[currentImages.length],
	);

	const goToSlide = useCallback(
		(slideIndex) => {
			const newDirection = slideIndex > currentIndex ? 1 : -1;
			setDirection(newDirection);
			setCurrentIndex(slideIndex);
		},
		[currentIndex],
	);

	useEffect(() => {
		if (currentImages.length > 1) {
			const timer = setTimeout(() => paginate(1), 4000);
			return () => clearTimeout(timer);
		}
	}, [currentIndex, paginate, currentImages.length]);

	useEffect(() => {
		setCurrentIndex(0);
	}, [activePresetKey]);

	if (isLoading || !activePresetKey) {
		return (
			<div className="relative flex flex-col w-full max-w-xl mx-auto px-4">
				<div className="mt-auto w-full">
					<div className="relative w-full aspect-square flex items-center justify-center bg-gray-200 rounded-full">
						<p className="text-gray-500">Loading Slider...</p>
					</div>
				</div>
			</div>
		);
	}

	if (isError || !allSlidesData || currentImages.length === 0) {
		return (
			<div className="relative flex flex-col w-full max-w-xl mx-auto px-4">
				<div className="mt-auto w-full">
					<div className="relative w-full aspect-square flex items-center justify-center bg-gray-200 rounded-full">
						<p className="text-red-500">Failed to load slider images.</p>
					</div>
				</div>
			</div>
		);
	}

	const currentImage = currentImages[currentIndex];
	const numIndicators = currentImages.length;
	const startAngleDeg = 110;
	const endAngleDeg = 160;
	const angleStepDeg =
		numIndicators > 1 ? (endAngleDeg - startAngleDeg) / (numIndicators - 1) : 0;
	const singleIndicatorAngleDeg = (startAngleDeg + endAngleDeg) / 2;
	const indicatorPathRadiusPercent = 48;

	return (
		<>
			<div className="relative flex flex-col w-full max-w-xl mx-auto px-4">
				{isAdmin && (
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="absolute top-0 right-0 z-30 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
						aria-label="Edit Slider"
					>
						<FontAwesomeIcon icon={faEdit} />
						Edit
					</button>
				)}
				<div className="mt-auto w-full">
					<div className="relative w-full aspect-square">
						<div className="absolute inset-0 rounded-full overflow-hidden z-[5] bg-gray-100">
							<AnimatePresence initial={false} custom={direction}>
								<motion.img
									key={currentIndex}
									src={currentImage.src}
									alt={currentImage.alt}
									custom={direction}
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={slideTransition}
									className="absolute inset-0 w-full h-full object-cover"
								/>
							</AnimatePresence>
						</div>

						{numIndicators > 1 && (
							<>
								<ArrowButton
									onClick={() => paginate(-1)}
									icon={faChevronLeft}
									ariaLabel="Previous slide"
									positionClasses="left-[1%]"
								/>
								<ArrowButton
									onClick={() => paginate(1)}
									icon={faChevronRight}
									ariaLabel="Next slide"
									positionClasses="right-[1%]"
								/>
							</>
						)}

						<div className="absolute inset-0 z-20 pointer-events-none">
							<ul className="relative w-full h-full m-0 p-0 list-none">
								{currentImages.map((_, index) => {
									const angle =
										numIndicators === 1
											? singleIndicatorAngleDeg
											: startAngleDeg + index * angleStepDeg;
									const rad = angle * (Math.PI / 180);
									const x = 50 + indicatorPathRadiusPercent * Math.cos(rad);
									const y = 50 + indicatorPathRadiusPercent * Math.sin(rad);
									const isActive = index === currentIndex;

									return (
										<motion.li
											key={`indicator-${index}`}
											className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto p-1"
											style={{ left: `${x}%`, top: `${y}%` }}
											onClick={() => goToSlide(index)}
										>
											<div
												className={`w-5 h-0.5 cursor-pointer transition-colors duration-200 rounded ${isActive ? "bg-blue-500" : "bg-white/70 hover:bg-white/90"}`}
												aria-label={`Go to slide ${index + 1}`}
												style={{ transform: `rotate(${angle + 90}deg)` }}
											></div>
										</motion.li>
									);
								})}
							</ul>
						</div>

						<div className="absolute left-[-10%] z-10">
							<img
								src={cultureConnectionLogoUrl}
								alt="Culture Connection Logo"
								className="w-[35%] aspect-square rounded-full object-cover"
							/>
						</div>
					</div>
				</div>
			</div>

			<SliderEditModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				initialData={allSlidesData}
				initialSettings={sliderInfo?.settings}
				onSave={(saveData) => mutation.mutate(saveData)}
				isSaving={mutation.isPending}
			/>
		</>
	);
};

export default CulturePictureSlider;
