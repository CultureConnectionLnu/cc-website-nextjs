// src/components/Achievements/AchievementBadge.js
"use client";

export default function AchievementBadge({
	achievement,
	onOpenModal,
	isAdminView = false,
}) {
	const hasAchieved = achievement.currentUserAchieved;
	const isEnabled = achievement.isEnabled;

	const handleClick = () => {
		if (onOpenModal) {
			onOpenModal(achievement);
		}
	};

	const placeholderImg =
		"https://api2.cultureconnection.se/assets/achievments-badges/5b765b8d-b7af-4c4b-9a85-c6ace210faca.png";
	const badgeOpacity =
		!isEnabled && isAdminView
			? "opacity-40"
			: hasAchieved
				? ""
				: "opacity-70 hover:opacity-100";

	return (
		<button
			type="button"
			onClick={handleClick}
			className={`relative w-32 h-32 md:w-44 md:h-44 overflow-hidden transition-all duration-200 ease-in-out group hover:scale-105
                 ${badgeOpacity}`}
			aria-label={`View details for ${achievement.title || "achievement"}`}
			title={achievement.title || "Achievement Badge"}
			disabled={!isEnabled && !isAdminView}
		>
			<div className={`w-full h-full ${hasAchieved}`}>
				{hasAchieved ? (
					<img
						src={achievement.imgurl || placeholderImg}
						alt={achievement.title || "Achievement Badge"}
						className={"w-full h-full object-cover"}
						onError={(e) => {
							e.currentTarget.src = placeholderImg;
						}}
					/>
				) : (
					<img
						src={achievement.imgurl || placeholderImg}
						alt={achievement.title || "Achievement Badge"}
						className={`w-full h-full grayscale ${!isEnabled && isAdminView ? "opacity-60" : ""}`}
						onError={(e) => {
							e.currentTarget.src = placeholderImg;
						}}
					/>
				)}
			</div>

			{!isEnabled && isAdminView && (
				<div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
					<span className="text-white text-sm font-semibold uppercase tracking-wider">
						Disabled
					</span>
				</div>
			)}
		</button>
	);
}
