// src/components/admin/DriveManagment/CombinedFileManager.js
"use client";

import React, { useState } from "react";
// import DriveFileManager from "./DriveFileManager"; // REMOVE THIS
import EventImageManager from "./EventImageManager";
import { OneComPublicFileManager } from "./OneComPublicFileManager"; // IMPORT THE NEW COMPONENT

export function CombinedFileManager({ onImageSelect }) {
	const [selectedSource, setSelectedSource] = useState(null); // Default to null or 'public'
	// const googleDriveRootId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID; // REMOVE THIS
	const customApiUrl = process.env.NEXT_PUBLIC_FETCHPICTURE_URL;

	// For the "Public" section, we don't need a specific env variable to enable/disable it here,
	// as its functionality is tied to the manifest file and API route.
	// We can assume it's always an option if the component is rendered.

	const renderContent = () => {
		switch (selectedSource) {
			case "publicOneCom":
				return <OneComPublicFileManager onImageSelect={onImageSelect} />;

			case "privateApi":
				if (!customApiUrl) {
					return (
						<p className="text-red-600 text-center mt-4">
							Error: Private API URL (NEXT_PUBLIC_FETCHPICTURE_URL) is not
							configured.
						</p>
					);
				}
				return <EventImageManager onImageSelect={onImageSelect} />;

			default:
				return (
					<p className="text-gray-600 text-center mt-4">
						Please select an image source above.
					</p>
				);
		}
	};

	return (
		<div>
			<div className="mb-6 flex flex-wrap justify-center items-center gap-4 border-b pb-4">
				<h3 className="text-xl font-semibold mr-4">Select Image Source:</h3>
				<button
					onClick={() => setSelectedSource("publicOneCom")}
					className={`px-4 py-2 rounded text-sm font-medium
            ${
							selectedSource === "publicOneCom"
								? "bg-teal-600 text-white shadow-md"
								: "bg-gray-200 hover:bg-gray-300 text-gray-700"
						}`}
				>
					Public (one.com)
				</button>
				<button
					onClick={() => setSelectedSource("privateApi")}
					className={`px-4 py-2 rounded text-sm font-medium
            ${
							selectedSource === "privateApi"
								? "bg-indigo-600 text-white shadow-md"
								: "bg-gray-200 hover:bg-gray-300 text-gray-700"
						}`}
					disabled={!customApiUrl} // Disable if private API URL is not set
				>
					Private (Event API)
				</button>
			</div>
			<div>{renderContent()}</div>
		</div>
	);
}

export default CombinedFileManager;
