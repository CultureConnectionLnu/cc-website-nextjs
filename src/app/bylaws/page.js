"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Header from "@/components/Header";

export default function BylawsPage() {
	const { isSignedIn, isLoaded } = useUser();
	const [bylaws, setBylaws] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const [propSectionId, setPropSectionId] = useState("new");
	const [propContent, setPropContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	useEffect(() => {
		fetch("/data/bylaws.json")
			.then((res) => {
				if (!res.ok) {
					throw new Error(`Failed to fetch bylaws.json: ${res.status}`);
				}
				return res.json();
			})
			.then((data) => {
				setBylaws(Array.isArray(data) ? data : []);
				setIsLoading(false);
			})
			.catch((err) => {
				console.error("Failed to load bylaws:", err);
				setIsLoading(false);
			});
	}, []);

	const handlePrint = () => {
		window.print();
	};

	const handleSubmitProposition = async (e) => {
		e.preventDefault();
		if (!propContent.trim()) return;

		setIsSubmitting(true);
		setSubmitMessage("");

		const sectionTitle =
			propSectionId === "new"
				? "Proposed New Section"
				: bylaws.find((b) => b.id === propSectionId)?.title ||
					"Unknown Section";

		try {
			const response = await fetch("/api/propositions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sectionId: propSectionId,
					sectionTitle,
					type: propSectionId === "new" ? "new" : "edit",
					content: propContent,
				}),
			});

			if (response.ok) {
				setSubmitMessage("Proposition submitted successfully!");
				setPropContent("");
				setTimeout(() => {
					setIsModalOpen(false);
					setSubmitMessage("");
				}, 2000);
			} else {
				setSubmitMessage("Failed to submit proposition.");
			}
		} catch (error) {
			setSubmitMessage("An error occurred.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return <div className="text-center mt-20">Loading Bylaws...</div>;
	}

	return (
		<div className="min-h-screen bg-gray-50 pb-12">
			<div className="print:hidden">
				<Header />
			</div>

			<div className="container mx-auto px-4 mt-24 max-w-4xl bg-white shadow-lg rounded-lg p-8 print:shadow-none print:p-0">
				<div className="flex justify-between items-center mb-8 border-b pb-4 print:border-b-2 print:border-black">
					<h1 className="text-3xl font-bold text-gray-800 print:text-black">
						Bylaws of the Culture Connection
					</h1>

					<div className="space-x-4 print:hidden">
						{isLoaded && isSignedIn && (
							<button
								onClick={() => setIsModalOpen(true)}
								className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium transition-colors"
							>
								Submit Proposition
							</button>
						)}
						<button
							onClick={handlePrint}
							className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium transition-colors"
						>
							Print Document
						</button>
					</div>
				</div>

				<div className="space-y-10 print:space-y-6">
					{bylaws.length === 0 ? (
						<p className="text-gray-500 italic">
							No bylaws are currently published.
						</p>
					) : (
						bylaws.map((section) => (
							<section key={section.id} className="break-inside-avoid">
								<h2 className="text-2xl font-semibold text-purple-700 mb-4 print:text-black">
									{section.title}
								</h2>
								<div
									className="prose max-w-none text-gray-700 print:text-black"
									dangerouslySetInnerHTML={{ __html: section.content }}
								/>
							</section>
						))
					)}
				</div>
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:hidden">
					<div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl">
						<h2 className="text-2xl font-bold mb-4 text-gray-800">
							Submit a Proposition
						</h2>
						<p className="text-sm text-gray-600 mb-4">
							Propose an edit to an existing bylaw or suggest a completely new
							section.
						</p>

						<form onSubmit={handleSubmitProposition}>
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Target Section
								</label>
								<select
									value={propSectionId}
									onChange={(e) => setPropSectionId(e.target.value)}
									className="w-full p-2 border rounded border-gray-300 focus:ring-purple-500 focus:border-purple-500"
								>
									<option value="new">-- Propose New Section --</option>
									{bylaws.map((b) => (
										<option key={b.id} value={b.id}>
											Edit: {b.title}
										</option>
									))}
								</select>
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Your Proposed Text / Reasoning
								</label>
								<textarea
									rows="5"
									value={propContent}
									onChange={(e) => setPropContent(e.target.value)}
									required
									placeholder="Clearly state what rule should be changed or added..."
									className="w-full p-2 border rounded border-gray-300 focus:ring-purple-500 focus:border-purple-500 resize-none"
								/>
							</div>

							{submitMessage && (
								<p
									className={`mb-4 text-sm ${submitMessage.includes("success") ? "text-green-600" : "text-red-600"}`}
								>
									{submitMessage}
								</p>
							)}

							<div className="flex justify-end space-x-3 mt-6">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
									disabled={isSubmitting}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting || !propContent.trim()}
									className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
								>
									{isSubmitting ? "Submitting..." : "Submit Proposition"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
