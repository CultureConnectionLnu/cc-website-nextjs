"use client";

import Background from "@/components/Background";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ActivitiesPage from "@/components/MainPage/ActivitiesPage";
import BoardMembers from "@/components/MainPage/BoardMembers";
import Main from "@/components/MainPage/Main";
import SponsorsCarousel from "@/components/MainPage/SponsorsCarousel";

export default function Home() {
	return (
		<div className="relative min-h-screen overflow-x-hidden">
			<Background />
			<div className="relative z-20">
				<Header />
				<main className="relative p-4 md:p-8 mt-24 md:mt-32 max-w-7xl mx-auto space-y-10 md:space-y-20">
					<section id="home-section">
						<Main />
					</section>
					<section id="events-section">
						<ActivitiesPage />
					</section>
					<section id="team-section">
						<BoardMembers />
					</section>
					<section id="sponsors-section">
						<SponsorsCarousel />
					</section>
				</main>
				<Footer />
			</div>
		</div>
	);
}
