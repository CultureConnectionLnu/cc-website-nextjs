"use client";

import { motion } from "framer-motion";

const modalVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 50,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export default function MembershipDetailModal({
  isOpen,
  onClose,
  membershipData,
}) {
  if (!isOpen || !membershipData) return null;

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={modalVariants}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-lg w-full relative"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 z-20 bg-white rounded-full p-1.5 shadow-sm"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="max-h-[85vh] overflow-y-auto">
          {membershipData.imgurl && (
            <div className="w-full h-56 bg-gray-200">
              <img
                src={membershipData.imgurl}
                alt={membershipData.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            <h2 className="text-3xl font-bold text-gray-800">
              {membershipData.name}
            </h2>

            {membershipData.websiteUrl &&
              isValidUrl(membershipData.websiteUrl) && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">Website:</span>{" "}
                  <a
                    href={membershipData.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {membershipData.websiteUrl}
                  </a>
                </p>
              )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Location
              </h3>
              <p className="text-gray-700">{membershipData.address}</p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Discount Offered
              </h3>
              <p className="text-indigo-700 font-medium text-lg">
                {membershipData.discount}
              </p>
            </div>

            {membershipData.description && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  About
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {membershipData.description}
                </p>
              </div>
            )}

            {membershipData.googleMapUrl &&
              isValidUrl(membershipData.googleMapUrl) && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Find Us
                  </h3>
                  <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden border border-gray-200">
                    <iframe
                      src={membershipData.googleMapUrl}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map for ${membershipData.name}`}
                    ></iframe>
                  </div>
                </div>
              )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
