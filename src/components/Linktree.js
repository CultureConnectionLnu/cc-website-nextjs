import { useQuery } from "@tanstack/react-query";
import React from "react";

const fetchLinktreeLinks = async () => {
	const response = await fetch("/api/main/linktree");
	if (!response.ok) {
		let errorMsg = `Error: ${response.status} ${response.statusText}`;
		try {
			const errorText = await response.text();
			console.debug("Error response text:", errorText);
			const errorData = JSON.parse(errorText);
			if (errorData?.error) {
				errorMsg = errorData.error;
			}
		} catch (parseError) {
			console.warn("Could not parse error response as JSON:", parseError);
		}
		throw new Error(errorMsg);
	}
	const data = await response.json();
	if (!Array.isArray(data)) {
		console.error("API did not return an array:", data);
		throw new Error("Invalid data format received from server.");
	}
	return data.filter((link) => link.isEnabled === true);
};

const Linktree = () => {
	const {
		data: enabledLinks = [],
		isLoading,
		isError,
		error,
	} = useQuery({
		queryKey: ["linktreePublicLinks"],
		queryFn: fetchLinktreeLinks,
	});

	if (isLoading) {
		return <div className="text-center text-gray-500">Loading...</div>;
	}

	if (isError) {
		return (
			<p className="text-center text-sm text-red-600 bg-red-100 p-2 rounded border border-red-300">
				Error:{" "}
				{error instanceof Error ? error.message : "An unknown error occurred"}
			</p>
		);
	}

	if (enabledLinks.length === 0) {
		return (
			<p className="text-center text-sm text-gray-500">
				No active links available.
			</p>
		);
	}

	return (
		<div className="flex flex-col space-y-4 w-full">
			{enabledLinks.map((item, index) => (
				<a
					key={item.link || index}
					href={item.link}
					target="_blank"
					rel="noopener noreferrer"
					className="block w-full"
					aria-label={item.text}
				>
					<div
						className={`w-full text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 ${
							item.color?.startsWith("#") ? "" : item.color || "bg-gray-200"
						}`}
						style={
							item.color?.startsWith("#") ? { backgroundColor: item.color } : {}
						}
					>
						<p
							className={`text-xl font-bold ${item.textColor ?? "text-black"}`}
						>
							{item.text}
						</p>
					</div>
				</a>
			))}
		</div>
	);
};

export default Linktree;
