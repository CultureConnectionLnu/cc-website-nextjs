"use client";

import EventImageManager from "./EventImageManager";

<<<<<<< HEAD

=======
>>>>>>> ba819cd (remove one.com file manager)
export function CombinedFileManager({ onImageSelect }) {
	const customApiUrl = process.env.NEXT_PUBLIC_FETCHPICTURE_URL;

	if (!customApiUrl) {
<<<<<<< HEAD
  		return (
 			<p className="text-red-600 text-center mt-4">
				Error: Private API URL (NEXT_PUBLIC_FETCHPICTURE_URL) is not
				configured.
 			</p>
  		);
    }
    
	return (
        <div><EventImageManager onImageSelect={onImageSelect} /></div>
=======
		return (
			<p className="text-red-600 text-center mt-4">
				Error: Private API URL (NEXT_PUBLIC_FETCHPICTURE_URL) is not configured.
			</p>
		);
	}

	return (
		<div>
			<EventImageManager onImageSelect={onImageSelect} />
		</div>
>>>>>>> ba819cd (remove one.com file manager)
	);
}

export default CombinedFileManager;
