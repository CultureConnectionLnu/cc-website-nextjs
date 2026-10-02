"use client";

import Blop from "@/components/Blop";

const patterns = [
	"/patterns/patern.svg",
	"/patterns/pattern2.svg",
	"/patterns/pattern3.svg",
];

const selectedPattern = patterns[0];
const selectedPattern1 = patterns[1];
const selectedPattern2 = patterns[2];

export default function Background() {
	return (
		<>
			<div className="absolute w-full h-full">
				<Blop
					x={1400}
					y={1000}
					size={650}
					color1="#f5dab0"
					color2="#FFBE5A"
					noiseAmplitude={40}
				/>
				<div className="absolute md:w-[10%] w-[8%] top-25 rotate-0 md:top-0 md:left-0 lg:left-0 top-10 left-0 md:rotate-60 -z-1">
					<img src={selectedPattern} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-150 md:left-150 md:w-[20%] w-[70%] top-125 left-70 -z-1">
					<img src={selectedPattern1} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-370 md:left-280 md:w-[10%] w-[30%] top-360 left-82 -z-1 rotate-220">
					<img src={selectedPattern} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-220 md:left-45 md:w-[20%] w-[70%] top-165 -left-15 -z-1 md:rotate-240 rotate-260">
					<img src={selectedPattern2} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-430 md:left-40 md:w-[20%] w-[55%] top-390 -left-15 -z-1 md:scale-x-[-1] md:rotate-0 -rotate-35">
					<img src={selectedPattern1} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-610 md:left-290 md:w-[20%] w-[50%] top-590 left-50 -z-1 scale-x-[-1] md:rotate-180 rotate-180">
					<img src={selectedPattern2} alt="Background Pattern" />
				</div>
			</div>
		</>
	);
}
export function BackgroundEvent() {
	return (
		<>
			<Blop
				x={1400}
				y={200}
				size={650}
				color1="#f5dab0"
				color2="#FFBE5A"
				noiseAmplitude={40}
			/>
			<div className="absolute w-full h-full">
				<div className="absolute md:w-[8%] w-[15%] md:top-35 md:left-10 top-40 -left-5 md:rotate-55 rotate-45 -z-1">
					<img src={selectedPattern} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-170 md:left-150 md:w-[20%] w-[70%] top-150 left-70 -z-1">
					<img src={selectedPattern1} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-220 md:left-250 md:w-[20%] w-[70%] top-150 left-70 -z-1 rotate-90">
					<img src={selectedPattern2} alt="Background Pattern" />
				</div>
			</div>
		</>
	);
}
export function BackgroundAboutus() {
	return (
		<>
			<div className="absolute w-full h-full">
				<div className="absolute md:w-[15%] w-[35%] md:top-25 md:left-30 top-20 -left-0 md:rotate-250 rotate-300 -z-1">
					<img src={selectedPattern2} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-215 md:left-20 md:w-[20%] w-[40%] top-140 left-70 -z-1 -rotate-15">
					<img src={selectedPattern1} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-140 md:left-180 md:w-[10%] w-[20%] top-220 rotate-320 left-10 -z-1">
					<img src={selectedPattern} alt="Background Pattern" />
				</div>
				<Blop
					x={1400}
					y={1800}
					size={650}
					color1="#dbbbf4ff"
					color2="#944794ff"
					noiseAmplitude={40}
				/>
				<div className="absolute md:w-[15%] w-[35%] md:top-645 md:left-40 top-640 -left-0 md:rotate-170 rotate-150 -z-1">
					<img src={selectedPattern2} alt="Background Pattern" />
				</div>
			</div>
		</>
	);
}
export function BackgroundAchievements() {
	return (
		<>
			<div className="absolute w-full h-full">
				<div className="absolute md:w-[8%] w-[15%] md:top-35 md:left-10 top-40 -left-5 md:rotate-55 rotate-45 -z-1">
					<img src={selectedPattern} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-170 md:left-150 md:w-[20%] w-[70%] top-150 left-70 -z-1">
					<img src={selectedPattern1} alt="Background Pattern" />
				</div>
				<div className="absolute md:top-170 md:left-150 md:w-[20%] w-[70%] top-150 left-70 -z-1">
					<img src={selectedPattern1} alt="Background Pattern" />
				</div>
			</div>
		</>
	);
}
export function BackgroundFlagame() {
	return (
		<>
			<div className="absolute w-full h-full">
				<Blop
					x={1300}
					y={200}
					size={700}
					color1="#b3baffff"
					color2="#4caffaff"
					noiseAmplitude={60}
				/>
				<div className="absolute hidden md:flex md:w-[8%] w-[15%] md:top-155 md:left-70 top-20 left-0 md:rotate-330 rotate-120 -z-1">
					<img src={selectedPattern} alt="Background Pattern" />
				</div>
			</div>
		</>
	);
}
