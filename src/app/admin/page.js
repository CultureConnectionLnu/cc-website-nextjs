"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

import UserManagement from "@/components/admin/UserManagement";
import CardManagement from "@/components/admin/CardManagement";
import BoardMemberManagement from "@/components/admin/BoardMemberManagement";
import LinktreeManagement from "@/components/admin/LinktreeManagement";
import SponsorManagement from "@/components/admin/SponsorManagement";
import DiscordSchedulerManagement from "@/components/admin/discordbot/DiscordSchedulerManagement";
import CombinedFileManager from "@/components/admin/DriveManagment/CombinedFileManager";
import GuidelinesManagement from "@/components/admin/GuidelinesManagement";
import BylawsManagement from "@/components/admin/BylawsManagement";
import AgendaManagement from "@/components/admin/AgendaManagement";
import Header from "@/components/Header";

const adminSections = [
	{ key: "users", label: "User Management", component: UserManagement },
	{ key: "cards", label: "Activities/Cards", component: CardManagement },
	{
		key: "boardMembers",
		label: "Board Members",
		component: BoardMemberManagement,
	},
	{ key: "linktree", label: "Linktree Links", component: LinktreeManagement },
	{ key: "sponsors", label: "Sponsors", component: SponsorManagement },
	{
		key: "guidelines",
		label: "Association Guidelines",
		component: GuidelinesManagement,
	},
	{
		key: "bylaws",
		label: "Association Bylaws",
		component: BylawsManagement,
	},
	{
		key: "agenda",
		label: "Agenda",
		component: AgendaManagement,
	},
	{
		key: "discord",
		label: "Discord Scheduler",
		component: DiscordSchedulerManagement,
	},
	{ key: "driveFiles", label: "Drive Files", component: CombinedFileManager },
];

const committeeAllowedSectionKeys = [
	"linktree",
	"driveFiles",
	"guidelines",
	"bylaws",
	"agenda",
];

export default function AdminPage() {
	const { isLoaded, isSignedIn, user } = useUser();
	const isAdmin = user?.publicMetadata?.admin === true;
	const isCommitteeMember = user?.publicMetadata?.committee === true;

	const canAccessAdminPanel = isAdmin || isCommitteeMember;
	const isCommitteeOnly = isCommitteeMember && !isAdmin;

	const [activeSectionKey, setActiveSectionKey] = useState("");

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			let initialKey = "";
			if (isAdmin) {
				initialKey = adminSections.length > 0 ? adminSections[0].key : "";
			} else if (isCommitteeOnly) {
				const firstAllowedCommitteeSection = adminSections.find((section) =>
					committeeAllowedSectionKeys.includes(section.key),
				);
				initialKey = firstAllowedCommitteeSection
					? firstAllowedCommitteeSection.key
					: "";
			}
			setActiveSectionKey(initialKey);
		}
	}, [isLoaded, isSignedIn, isAdmin, isCommitteeOnly]);

	useEffect(() => {
		if (isLoaded) {
			if (!isSignedIn) {
				redirect("/");
			} else if (!canAccessAdminPanel) {
				redirect("/");
			}
		}
	}, [isLoaded, isSignedIn, canAccessAdminPanel]);

	const ActiveComponent = adminSections.find(
		(section) => section.key === activeSectionKey,
	)?.component;

	if (!isLoaded) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				Loading admin access...
			</div>
		);
	}

	if (!isSignedIn || !canAccessAdminPanel) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				Access Denied. You must be an administrator or committee member.
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8 md:py-12">
			<Header />
			<div className="bg-white p-6 mt-10 rounded-lg shadow-lg border border-gray-200 min-h-screen">
				<div className="flex flex-col sm:flex-row justify-center sm:items-center mb-6 border-b pb-4 gap-4">
					<h1 className="text-3xl text-center font-bold text-purple-700">
						Admin Panel
					</h1>
				</div>
				<p className="mb-6 text-3xl text-center text-black">
					Welcome, {user?.firstName || user?.fullName || "User"}!
				</p>

				<div className="mb-8">
					<div className="block text-2xl font-Main font-bold text-center mb-4">
						Admin Configuration Options:
					</div>
					<div className="flex flex-wrap justify-center gap-2 border-b border-gray-200 pb-4">
						{adminSections.map((section) => {
							const isAllowedForCurrentUser =
								isAdmin ||
								(isCommitteeOnly &&
									committeeAllowedSectionKeys.includes(section.key));
							return (
								<button
									key={section.key}
									onClick={() => {
										if (isAllowedForCurrentUser) {
											setActiveSectionKey(section.key);
										}
									}}
									disabled={!isAllowedForCurrentUser}
									className={`
                    px-4 py-2 text-sm font-medium rounded-md
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                    transition-colors duration-150 ease-in-out
                    ${
											activeSectionKey === section.key
												? "bg-purple-600 text-white"
												: "text-gray-700 bg-gray-100 hover:bg-gray-200"
										}
                    ${
											!isAllowedForCurrentUser
												? "opacity-50 cursor-not-allowed bg-gray-300 hover:bg-gray-300 text-gray-500"
												: ""
										}
                  `}
								>
									{section.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className="mt-8">
					{ActiveComponent ? (
						<ActiveComponent />
					) : (
						<p className="text-center">
							{isLoaded && (isAdmin || isCommitteeOnly)
								? "Select an available section to manage."
								: "No sections available or selected."}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
