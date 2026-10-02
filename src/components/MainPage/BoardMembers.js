"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

const orderCodentions = (codentions, preferredOrder = []) => {
	const availableCodentions = [...new Set(codentions.filter(Boolean))].sort();
	const preferredSet = new Set(availableCodentions);
	const orderedPreferred = preferredOrder.filter((codention) =>
		preferredSet.has(codention),
	);
	const remaining = availableCodentions.filter(
		(codention) => !orderedPreferred.includes(codention),
	);
	return [...orderedPreferred, ...remaining];
};

export default function BoardMembers() {
	const [membersData, setMembersData] = useState([]);
	const [allCodentions, setAllCodentions] = useState(["All"]);
	const [selectedCodention, setSelectedCodention] = useState("All");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [membersRes, settingsRes] = await Promise.all([
					fetch("/api/admin/member"),
					fetch("/api/admin/member/settings"),
				]);

				const data = await membersRes.json();
				const settings = settingsRes.ok
					? await settingsRes.json()
					: { defaultCodention: "All" };

				setMembersData(data);
				const orderedCodentions = orderCodentions(
					data.map((member) => member.codention),
					settings?.codentionOrder || [],
				);
				setAllCodentions(["All", ...orderedCodentions]);

				if (orderedCodentions.length > 0) {
					const defaultCodention = settings?.defaultCodention;
					setSelectedCodention(
						defaultCodention && orderedCodentions.includes(defaultCodention)
							? defaultCodention
							: orderedCodentions[0],
					);
				} else {
					setSelectedCodention("All");
				}
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	const filteredMembers = useMemo(() => {
		return selectedCodention === "All"
			? membersData
			: membersData.filter((m) => m.codention === selectedCodention);
	}, [membersData, selectedCodention]);

	return (
		<section className="w-full">
			<h2 className="font-Header text-center mb-10 text-mainColor text-6xl sm:text-7xl md:text-9xl font-bold">
				Our Team
			</h2>

			<div className="flex flex-col md:flex-row gap-8">
				<div className="md:hidden flex overflow-x-auto pb-4 gap-2 no-scrollbar -mx-4 px-4 sticky top-20 z-20 bg-white/80 backdrop-blur-sm">
					{allCodentions.map((c) => (
						<button
							key={c}
							onClick={() => setSelectedCodention(c)}
							className={`whitespace-nowrap px-6 py-2 rounded-full border-2 border-black font-bold text-sm transition-all ${
								selectedCodention === c
									? "bg-mainColor text-white"
									: "bg-white text-black"
							}`}
						>
							{c}
						</button>
					))}
				</div>

				<aside className="hidden md:block w-1/4 sticky top-32 h-fit">
					<nav className="p-6 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						<h3 className="text-2xl font-Header text-mainColor mb-4 border-b-2 border-black pb-2">
							Teams
						</h3>
						<ul className="space-y-2">
							{allCodentions.map((c) => (
								<li key={c}>
									<button
										onClick={() => setSelectedCodention(c)}
										className={`w-full text-left px-4 py-2 rounded-lg font-bold transition-all ${
											selectedCodention === c
												? "bg-mainColor text-white"
												: "hover:bg-gray-100"
										}`}
									>
										{c}
									</button>
								</li>
							))}
						</ul>
					</nav>
				</aside>

				<main className="w-full md:w-3/4">
					<AnimatePresence mode="wait">
						<motion.div
							key={selectedCodention}
							variants={containerVariants}
							initial="hidden"
							animate="visible"
							className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
						>
							{filteredMembers.map((member) => (
								<motion.div
									key={member.id}
									variants={cardVariants}
									className="bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
								>
									<img
										src={member.imageUrl}
										alt=""
										className="w-full h-72 object-cover object-top"
									/>
									<div className="p-4">
										<h3 className="text-xl font-bold text-black">
											{member.name}
										</h3>
										<p className="text-mainColor font-bold text-sm mb-2">
											{member.position}
										</p>
										<p className="text-gray-600 text-sm line-clamp-3">
											{member.bio}
										</p>
									</div>
								</motion.div>
							))}
						</motion.div>
					</AnimatePresence>
				</main>
			</div>
		</section>
	);
}
