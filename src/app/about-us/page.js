"use client";

import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { BackgroundAboutus } from "@/components/Background";
import CulturePictureSlider from "@/components/CulturePictureSlider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function MainPage() {
	const animationRef = useRef(null);

	useEffect(() => {
		const el = animationRef.current;
		if (!el) return;
		gsap.fromTo(
			el,
			{ opacity: 0, y: 100 },
			{
				opacity: 1,
				y: 0,
				duration: 1,
				ease: "power2.out",
				scrollTrigger: {
					trigger: el,
					start: "top 100%",
					end: "bottom 20%",
					scrub: true,
				},
			},
		);
	}, []);

	return (
		<>
			<BackgroundAboutus />
			<Header />
			<div className="relative z-10 p-8 mt-30">
				<div ref={animationRef}>
					<div className="p-2 md:ml-56 ml-2 md:grid md:grid-cols-3 block">
						<div>
							<h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">
								About Us
							</h1>
							<p className="font-Main mb-10 text-xl">
								We are a fun and active association that strives for
								inclusiveness, bridging and building communities with our
								variety of non-alcohol based events.
							</p>
							<p className="font-Main mb-10 text-xl">
								Come explore new hobbies with us. Our activities are beginner
								friendly, all levels are welcome, so let&apos;s discover your
								new favorite game, craft or sport!
							</p>
							<p className="font-Main text-xl">
								Check out our social media pages or events tab for more
								information.
							</p>
						</div>
						<div className="md:col-span-2 justify-center hidden md:flex">
							<CulturePictureSlider sliderId="aboutUs" />
						</div>
					</div>
					<div className="p-2 md:mt-50 mt-2 md:mx-56 mx-2 md:grid md:grid-cols-3 block">
						<div className="justify-center hidden md:flex">
							<CulturePictureSlider sliderId="aboutUsExpedition" />
						</div>
						<div className="md:col-span-2">
							<h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">
								Exibition
							</h1>
							<h2 className="font-Header text-mainColor md:text-7xl text-6xl font-bold">
								Finding Art in Mistakes
							</h2>
							<p className="font-Main text-xl">
								It began with the isolation of being in a new country, no
								support of familiarity. With course loads and lectures, it was
								easy to feel stuck in the university bubble. Then, a simple
								suggestion of starting a new hobby quickly became a therapeutic
								routine. Once a week, we gathered to share patterns and helpful
								tips. We laughed over piles of tangled thread and the defeat of
								restarting. Without realizing it, we started sharing more than
								just crafting advice. We talked about the struggle to build a
								life in a new place.
							</p>
						</div>
					</div>
					<p className="md:mx-56 mx-2 font-Main text-xl mb-10">
						Every week, it got a little easier. Craft nights became a space
						where we could be ourselves: messy, imperfect, human. A place with a
						growing sense of belonging, where we could sit in the comfort of an
						empathetic friend we have made along the way. This new hobby
						flourished into a rich community that lead to what Culture
						Connection is known for today.
					</p>
					<p className="md:mx-56 mx-2 font-Main text-xl mb-10">
						Culture Connection was built on the foundation of inclusivity.
						Beginner friendly weekly events, like our Friday craft nights, were
						an important way for us to create consistency and to build
						community. It was in the hopes of coming together to explore what
						Växjö has to offer, connection of friendship, and making the best of
						our experience.
					</p>
					<p className="md:mx-56 mx-2 font-Main italic font-semibold text-xl mb-10">
						"In our mistakes we found the beauty of the journey that brought us
						together."
					</p>
					<p className="md:mx-56 mx-2 font-Main text-xl mb-10">
						This exhibition is a tribute to that journey. You will see not only
						the beautiful handmade pieces we created, but also the scraps, and
						parts that did not quite work. Because they matter, too. They’re
						proof of the patience, growth, and community we built together.
					</p>
					<p className="md:mx-56 mx-2 font-Main font-semibold text-xl mb-10">
						Exibition by Winnie Chan, Annette Wiedenmann, Elizabet Kizoub{" "}
					</p>

					<p className="md:mx-56 mx-2 font-Main text-xl mb-10 flex items-center">
						Special Thanks to Annette Wiedenmann for the beautiful Pictures!
						<a
							href="https://www.instagram.com/atelier.nettan?igsh=MWVwNGphNmF3Y3B2NA"
							target="_blank"
							rel="noopener noreferrer"
							className="ml-2 text-mainColor hover:text-opacity-80"
						>
							<FontAwesomeIcon icon={faInstagram} size="lg" />
						</a>
					</p>
					<div className="p-2 mb-50 mt-10 flex flex-col items-center">
						<h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold mb-6 text-center">
							Documentary!
						</h1>
						<div className="w-full max-w-3xl aspect-video">
							<iframe
								width="100%"
								height="100%"
								src="https://www.youtube.com/embed/H185Dw1tTsI?si=uM6N5OEVbrvZRY7v"
								title="YouTube video player"
								frameBorder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								referrerPolicy="strict-origin-when-cross-origin"
								allowFullScreen
								className="rounded-lg shadow-lg"
							></iframe>
						</div>
						<p className="font-Main mt-4 text-xl font-semibold text-center">
							Directed by George Bizhev
						</p>
					</div>
				</div>
			</div>

			{/* Footer */}
			<Footer />
		</>
	);
}
