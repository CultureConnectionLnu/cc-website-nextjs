"use client";

import {
	faChevronLeft,
	faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import React, { useCallback, useEffect, useState } from "react";

const DEFAULT_SPONSOR_LOGO = "/cc.svg";

const fetchSponsors = async () => {
	const response = await fetch("/api/main/sponsors");
	if (!response.ok) {
		let errorMsg = `Error: ${response.status} ${response.statusText}`;
		try {
			const errorData = await response.json();
			if (errorData?.error) {
				errorMsg = errorData.error;
			}
		} catch (jsonError) {}
		throw new Error(errorMsg);
	}
	return await response.json();
};

const ArrowButton = ({
	onClick,
	disabled,
	icon,
	"aria-label": ariaLabel,
	className,
}) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		className={`absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 transform items-center justify-center rounded-full bg-white/50 text-mainColor transition-all hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed ${
			className || ""
		}`}
		aria-label={ariaLabel}
	>
		<FontAwesomeIcon icon={icon} className="h-6 w-6" />
	</button>
);

function SponsorsCarousel() {
	const {
		data: sponsorsData = [],
		isLoading,
		isError,
		error,
	} = useQuery({
		queryKey: ["sponsors"],
		queryFn: fetchSponsors,
	});

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{
			loop: true,
			align: "start",
			containScroll: "trimSnaps",
		},
		[Autoplay({ delay: 2000, stopOnInteraction: true })],
	);

	const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
	const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		const onSelect = () => {
			setPrevBtnDisabled(!emblaApi.canScrollPrev());
			setNextBtnDisabled(!emblaApi.canScrollNext());
		};
		emblaApi.on("select", onSelect);
		onSelect();
		return () => emblaApi.off("select", onSelect);
	}, [emblaApi]);

	const handleImageError = (event) => {
		const target = event.target;
		if (target.src !== DEFAULT_SPONSOR_LOGO) {
			target.src = DEFAULT_SPONSOR_LOGO;
		}
	};

	const canRenderSlider = !isLoading && !isError && sponsorsData.length > 0;

	return (
		<section className="py-12 md:py-16">
			<div className="container mx-auto px-4">
				<h2 className="text-7xl font-bold text-center mb-5 text-mainColor font-Header">
					Collaborators
				</h2>

				{isLoading && (
					<p className="text-center text-gray-500">Loading sponsors...</p>
				)}

				{isError && (
					<div className="text-center text-red-600 bg-red-100 border border-red-400 rounded p-4 my-4 max-w-md mx-auto">
						<p className="font-semibold">Error Loading Sponsors</p>
						<p>{error?.message || "An unknown error occurred."}</p>
					</div>
				)}

				{canRenderSlider && (
					<div className="relative mx-auto max-w-6xl">
						<div className="overflow-hidden" ref={emblaRef}>
							<div className="flex">
								{sponsorsData.map((sponsor) => (
									<div
										key={sponsor.id}
										className="relative flex-[0_0_50%] sm:flex-[0_0_33.33%] md:flex-[0_0_25%] lg:flex-[0_0_20%] pl-4"
									>
										<a
											href={sponsor.websiteUrl || "#"}
											target="_blank"
											rel="noopener noreferrer"
											className="block outline-none focus:ring-2 focus:ring-indigo-300 rounded-full"
											aria-label={`Visit ${sponsor.name}`}
											onClick={(e) => !sponsor.websiteUrl && e.preventDefault()}
											style={{
												cursor: sponsor.websiteUrl ? "pointer" : "default",
											}}
										>
											<img
												src={sponsor.imageUrl || DEFAULT_SPONSOR_LOGO}
												alt={sponsor.name}
												className="h-48 w-48 mx-auto object-contain rounded-full transition duration-300"
												loading="lazy"
												onError={handleImageError}
											/>
										</a>
									</div>
								))}
							</div>
						</div>
						<div className="hidden md:block">
							<ArrowButton
								onClick={scrollPrev}
								disabled={prevBtnDisabled}
								icon={faChevronLeft}
								aria-label="Previous sponsor"
								className="left-0 -translate-x-1/2"
							/>
							<ArrowButton
								onClick={scrollNext}
								disabled={nextBtnDisabled}
								icon={faChevronRight}
								aria-label="Next sponsor"
								className="right-0 translate-x-1/2"
							/>
						</div>
					</div>
				)}

				{!isLoading && !isError && sponsorsData.length === 0 && (
					<p className="text-center text-gray-500 py-10">
						We are currently seeking sponsors.
					</p>
				)}
			</div>
		</section>
	);
}

export default SponsorsCarousel;
