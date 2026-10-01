"use client";

import Link from "next/link";
import CulturePictureSlider from "@/components/CulturePictureSlider";

export default function MainPage() {
  return (
    // Switched to grid-cols-2 for a clean 50/50 split on desktop
    <div className="flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-12 items-center">
      {/* Text Column: Removed md:ml-48 to fix the overlap/spacing issue */}
      <div className="text-center md:text-left order-2 md:order-1 w-full">
        <h1 className="font-Header text-mainColor text-[13vw] sm:text-7xl md:text-8xl lg:text-9xl font-bold leading-[0.85] tracking-tighter">
          {/* Mobile: One word flow. Desktop: Stacked for style if needed, or let it flow */}
          <span className="block">
            Culture <br className="hidden md:block" />
            Connection
          </span>
        </h1>

        <p className="font-Main italic font-semibold text-lg md:text-xl mt-6 mb-4 text-gray-800">
          "Where different stories create one shared journey."
        </p>

        <p className="font-Main text-base md:text-lg lg:text-xl text-gray-600 max-w-md mx-auto md:mx-0 leading-relaxed">
          We are a fun and active association that strives for inclusiveness,
          bridging and building communities with a variety of non-alcohol based
          events.
        </p>

        <Link
          href="/about-us"
          className="inline-block mt-8 px-8 py-3 text-center rounded border-2 border-black shadow-custom hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all bg-mainColor text-white font-bold text-lg uppercase tracking-wider"
        >
          About us
        </Link>
      </div>

      {/* Image Slider Column */}
      <div className="w-full order-1 md:order-2 flex justify-center items-center px-4">
        <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[400px] md:max-w-xl">
          <CulturePictureSlider sliderId="mainPage" />
        </div>
      </div>
    </div>
  );
}
