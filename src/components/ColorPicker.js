"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PropTypes from "prop-types";
import { useMemo } from "react";

const fetchAdminColors = async () => {
	const response = await fetch("/api/admin/colors");
	if (!response.ok) throw new Error("Failed to load colors");
	return response.json();
};

const updateFavoriteStatus = async ({ colorName, isFavorite }) => {
	const response = await fetch("/api/admin/colors", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ colorName, isFavorite }),
	});
	if (!response.ok) throw new Error("Failed to update favorite status");
	return response.json();
};

const StarIcon = ({ filled }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		className={`w-4 h-4 ${filled ? "text-yellow-400" : "text-gray-300 hover:text-gray-400"}`}
	>
		<path
			fillRule="evenodd"
			d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z"
			clipRule="evenodd"
		/>
	</svg>
);
StarIcon.propTypes = { filled: PropTypes.bool };

function ColorPicker({ onSelectColor }) {
	const queryClient = useQueryClient();

	const {
		data: allColorsData = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["adminColors"],
		queryFn: fetchAdminColors,
	});

	const updateMutation = useMutation({
		mutationFn: updateFavoriteStatus,
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["adminColors"] });
			console.log(`Updated favorite status for ${variables.colorName}`);
		},
		onError: (err, variables) => {
			console.error(
				`Error updating favorite status for ${variables.colorName}:`,
				err,
			);
		},
		// onSettled: () => {
		//   console.log("Favorite update attempt finished.");
		// }
	});

	const favoriteColors = useMemo(() => {
		return allColorsData.filter((color) => color.isFavorite && color.colorName);
	}, [allColorsData]);

	const handleFavoriteToggle = (e, color) => {
		e.stopPropagation();
		updateMutation.mutate({
			colorName: color.colorName,
			isFavorite: !color.isFavorite,
		});
	};

	if (isLoading)
		return (
			<div className="p-3 text-center text-xs text-gray-500">
				Loading colors...
			</div>
		);
	if (error)
		return (
			<div className="p-3 text-center text-xs text-red-500">
				Error loading colors: {error.message}
			</div>
		);

	return (
		<div className="p-3 space-y-4">
			<div>
				<h5 className="text-xs font-medium text-gray-600 mb-2 px-1">
					Favorites
				</h5>
				{favoriteColors.length === 0 && (
					<p className="text-xs text-gray-400 px-1">
						Click the star on a color below to add it here.
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					{favoriteColors
						.filter((color) => color.colorName)
						.map((color) => (
							<div
								key={color.colorName + "-fav"}
								className={`${color.colorName} w-8 h-8 rounded cursor-pointer border border-gray-300 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 relative group`}
								onClick={() => onSelectColor(color.colorName)}
								title={color.colorName}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ")
										onSelectColor(color.colorName);
								}}
							>
								<button
									type="button"
									onClick={(e) => handleFavoriteToggle(e, color)}
									className="absolute -top-1 -right-1 p-0.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
									aria-label="Remove from favorites"
									disabled={
										updateMutation.isPending &&
										updateMutation.variables?.colorName === color.colorName
									}
								>
									<StarIcon filled={true} />
								</button>
							</div>
						))}
				</div>
			</div>

			<div>
				<h5 className="text-xs font-medium text-gray-600 mb-2 px-1">
					All Colors
				</h5>
				<div className="flex flex-wrap gap-2">
					{allColorsData
						.filter((color) => color.colorName)
						.map((color) => {
							const isMutatingFav =
								updateMutation.isPending &&
								updateMutation.variables?.colorName === color.colorName;
							return (
								<div
									key={color.colorName}
									className={`${color.colorName} w-8 h-8 rounded cursor-pointer border border-gray-300 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 relative group`}
									onClick={() => onSelectColor(color.colorName)}
									title={color.colorName}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ")
											onSelectColor(color.colorName);
									}}
								>
									<button
										type="button"
										onClick={(e) => handleFavoriteToggle(e, color)}
										className="absolute -top-1 -right-1 p-0.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
										aria-label={
											color.isFavorite
												? "Remove from favorites"
												: "Add to favorites"
										}
										disabled={isMutatingFav}
									>
										<StarIcon filled={color.isFavorite} />
									</button>
								</div>
							);
						})}
				</div>
			</div>
		</div>
	);
}

ColorPicker.propTypes = {
	onSelectColor: PropTypes.func.isRequired,
};

export default ColorPicker;
