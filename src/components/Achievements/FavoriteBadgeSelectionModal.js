"use client";

import { motion, AnimatePresence } from "framer-motion";
import AchievementBadge from "./AchievementBadge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faTrash } from "@fortawesome/free-solid-svg-icons";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export default function FavoriteBadgeSelectionModal({
  isOpen,
  onClose,
  achievedBadges,
  onSelectBadge,
  onRemoveFavorite,
  currentSlot,
  currentFavoriteInSlot,
}) {
  if (!isOpen) return null;

  // Sorting: Put the "Base" badges first, then exploded levels if necessary?
  // Actually, standard list is fine.

  const handleSelect = (achievement) => {
    // achievement.id might be "ach_123" or "ach_123_lvl_2"
    // We pass this directly to the parent handler.
    onSelectBadge(achievement, currentSlot);
    onClose();
  };

  const handleRemove = () => {
    if (onRemoveFavorite) {
      onRemoveFavorite(currentSlot);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full relative flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Select Badge
                </h2>
                <p className="text-sm text-gray-500">
                  Choose which achievement to display in Slot {currentSlot}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 bg-white rounded-full p-2 hover:bg-gray-100 transition shadow-sm border border-gray-200"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-grow bg-gray-50/50">
              {achievedBadges && achievedBadges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
                  {achievedBadges.map((ach) => {
                    // Check if this specific badge ID is currently selected in this slot
                    const isSelected =
                      currentFavoriteInSlot &&
                      (currentFavoriteInSlot.id === ach.id ||
                        // Handle exploded ID match against base ID if checking crudely,
                        // but exact ID match is better for level specificity
                        (ach.id.includes("_lvl_") &&
                          currentFavoriteInSlot.id === ach.id));

                    return (
                      <div
                        key={ach.id}
                        className="flex flex-col items-center group relative"
                      >
                        <div
                          className={`
                             rounded-xl transition-all duration-200
                             ${isSelected ? "ring-4 ring-indigo-400 ring-offset-2" : "hover:scale-105"}
                          `}
                        >
                          <AchievementBadge
                            achievement={ach}
                            onOpenModal={() => handleSelect(ach)} // Select on click
                          />
                        </div>
                        <p className="text-xs text-center mt-2 font-medium text-gray-600 truncate w-32 px-1">
                          {ach.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <p className="text-lg font-medium">No badges found.</p>
                  <p className="text-sm">Go play some games to earn badges!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {currentFavoriteInSlot && onRemoveFavorite && (
              <div className="p-4 bg-white border-t border-gray-200 flex justify-end shadow-inner z-10">
                <button
                  onClick={handleRemove}
                  className="px-5 py-2 text-sm font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faTrash} /> Clear Slot {currentSlot}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
