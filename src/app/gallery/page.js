"use client";

import {
	faExpand,
	faImage,
	faSpinner,
	faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackgroundEvent } from "@/components/Background";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

// --- Configuration ---
const BATCH_SIZE = 10; // Load 10 images at a time

const shuffleFiles = (files) => {
	const shuffled = [...files];

	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[randomIndex]] = [
			shuffled[randomIndex],
			shuffled[index],
		];
	}

	return shuffled;
};

export default function GalleryPage() {
	// Data State
	const [categories, setCategories] = useState(["All"]);
	const [activeCategory, setActiveCategory] = useState("All");
	const [allFiles, setAllFiles] = useState([]);
	const [displayedFiles, setDisplayedFiles] = useState([]);
	const [imageBaseUrl, setImageBaseUrl] = useState("");

	// UI State
	const [isLoading, setIsLoading] = useState(true);
	const [hasMore, setHasMore] = useState(true);
	const [selectedImage, setSelectedImage] = useState(null); // State for the Full Screen Modal

	// Observer for Infinite Scroll
	const observer = useRef();
	const lastImageElementRef = useCallback(
		(node) => {
			if (isLoading) return;
			if (observer.current) observer.current.disconnect();

			observer.current = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting && hasMore) {
					loadMoreImages();
				}
			});
			if (node) observer.current.observe(node);
		},
		[isLoading, hasMore, allFiles, displayedFiles],
	);

	// --- 1. Initial Fetch ---
	useEffect(() => {
		fetchData("Root");
	}, []);

	// --- 2. Category Switch ---
	useEffect(() => {
		if (activeCategory === "All") {
			fetchData("Root");
		} else {
			fetchData(activeCategory);
		}
	}, [activeCategory]);

	const fetchData = async (folder) => {
		setIsLoading(true);
		setDisplayedFiles([]);
		setHasMore(true);

		try {
			const param = folder === "Root" || folder === "All" ? "" : folder;
			const res = await fetch(
				`/api/admin/one-com-public-files?folder=${param}`,
			);
			if (!res.ok) throw new Error("Failed to fetch");

			const data = await res.json();

			if (data.folders && folder === "Root") {
				setCategories(["All", ...data.folders]);
			}

			setImageBaseUrl(data.imageBaseUrl);

			const shuffledFiles = shuffleFiles(data.files);

			setAllFiles(shuffledFiles);
			setDisplayedFiles(shuffledFiles.slice(0, BATCH_SIZE));

			if (shuffledFiles.length <= BATCH_SIZE) setHasMore(false);
		} catch (err) {
			console.error("Failed to load gallery:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const loadMoreImages = () => {
		const currentLength = displayedFiles.length;
		const nextBatch = allFiles.slice(currentLength, currentLength + BATCH_SIZE);

		if (nextBatch.length === 0) {
			setHasMore(false);
		} else {
			setDisplayedFiles((prev) => [...prev, ...nextBatch]);
		}
	};

	return (
		<>
			<BackgroundEvent />
			<div className="flex flex-col min-h-screen">
				<div className="relative z-10 p-4 md:p-8 mt-24 md:mt-32 flex-grow md:mb-50">
					<Header />
					<main className="container mx-auto px-4 py-8">
						{/* --- Header Section --- */}
						<div className="text-center mb-12">
							<h1 className="text-3xl md:text-5xl font-Header text-mainColor font-bold text-center">
								Picture Gallery
							</h1>
							<p className="mt-4 text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto text-center">
								Explore moments from our events, activities, and community
								gatherings.
							</p>

							{/* --- Category Tabs --- */}
							<div className="mt-8 flex justify-center">
								<div className="flex flex-wrap gap-3 justify-center max-w-4xl">
									{categories.map((cat) => (
										<button
											key={cat}
											onClick={() => setActiveCategory(cat)}
											className={`
                        px-6 py-2 rounded font-semibold border-2 border-black transition-all 
                        hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5
                        ${
													activeCategory === cat
														? "bg-purple-200 text-purple-900 shadow-none translate-x-0.5 translate-y-0.5"
														: "bg-white text-gray-800 shadow-custom"
												}
                      `}
										>
											{cat}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* --- Gallery Grid --- */}
						{isLoading && displayedFiles.length === 0 ? (
							<p className="text-center text-gray-500 text-lg">
								<FontAwesomeIcon icon={faSpinner} spin className="mr-2" />{" "}
								Loading gallery...
							</p>
						) : displayedFiles.length === 0 ? (
							<div className="text-center py-20 text-gray-500 bg-white border-2 border-black shadow-custom rounded-xl p-8 max-w-lg mx-auto">
								<FontAwesomeIcon
									icon={faImage}
									size="3x"
									className="mb-4 opacity-50"
								/>
								<p className="text-xl font-Header">
									No images found in this category.
								</p>
							</div>
						) : (
							/* Masonry Layout */
							<div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
								{displayedFiles.map((file, index) => {
									const cleanBase = imageBaseUrl.replace(/\/$/, "");
									const folderPart =
										activeCategory === "All" ? "" : `/${activeCategory}`;
									const fullUrl = `${cleanBase}${folderPart}/${file.name}`;

									const isLast = index === displayedFiles.length - 1;

									return (
										<motion.div
											ref={isLast ? lastImageElementRef : null}
											key={file.name + index}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.4, delay: (index % 5) * 0.05 }}
											// --- YOUR REQUESTED STYLE HERE ---
											className="break-inside-avoid mb-4 group relative overflow-hidden rounded-xl bg-white cursor-pointer"
											onClick={() => setSelectedImage(fullUrl)} // Open Modal
										>
											<img
												src={fullUrl}
												alt={file.name}
												className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
												loading="lazy"
											/>
											{/* Hover Overlay with Expand Icon */}
											<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
												<FontAwesomeIcon
													icon={faExpand}
													className="text-white text-3xl drop-shadow-md"
												/>
											</div>
										</motion.div>
									);
								})}
							</div>
						)}

						{/* --- Loading Sentinel --- */}
						{hasMore && !isLoading && displayedFiles.length > 0 && (
							<div className="text-center py-10 opacity-50">
								<FontAwesomeIcon
									icon={faSpinner}
									spin
									size="2x"
									className="text-mainColor"
								/>
							</div>
						)}
					</main>
				</div>
				<Footer />
			</div>

			{/* --- Full Screen Lightbox Modal --- */}
			<AnimatePresence>
				{selectedImage && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
						onClick={() => setSelectedImage(null)} // Close on background click
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="relative max-w-screen-xl max-h-screen flex items-center justify-center"
							onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
						>
							<img
								src={selectedImage}
								alt="Full screen"
								className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
							/>

							{/* Close Button */}
							<button
								onClick={() => setSelectedImage(null)}
								className="absolute top-4 right-4 md:-right-12 md:top-0 bg-white/10 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
							>
								<FontAwesomeIcon icon={faTimes} size="lg" />
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
