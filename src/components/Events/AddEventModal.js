// src/components/Events/AddEventModal.js

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ColorPicker from "@/components/ColorPicker";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.1 } },
};

export default function AddEventModal({
  isOpen,
  onClose,
  createEventMutation,
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [attendees, setAttendees] = useState(true);
  const [cardColor, setCardColor] = useState("bg-white");
  const [isLimitEnabled, setIsLimitEnabled] = useState(false);
  const [limitValue, setLimitValue] = useState(10);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [inDescription, setInDescription] = useState([
    { title: "", description: "" },
  ]);
  const [freezeNotAllowed, setFreezeNotAllowed] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [error, setError] = useState("");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target)
      ) {
        setIsColorPickerOpen(false);
      }
    };
    if (isColorPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isColorPickerOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDate(new Date());
      setDescription("");
      setLocation("");
      setImageUrl("");
      setAttendees(true);
      setCardColor("bg-white");
      setIsLimitEnabled(false);
      setLimitValue(10);
      setCardEnabled(true);
      setInDescription([{ title: "", description: "" }]);
      setFreezeNotAllowed(true);
      setIsClosed(false);
      setActiveTab("main");
      setError("");
      setIsColorPickerOpen(false);
    }
  }, [isOpen]);

  const handleInDescriptionChange = (index, field, value) => {
    const updatedDetails = [...inDescription];
    updatedDetails[index][field] = value;
    setInDescription(updatedDetails);
  };

  const addInDescriptionItem = () => {
    setInDescription([...inDescription, { title: "", Description: "" }]);
  };

  const removeInDescriptionItem = (index) => {
    if (inDescription.length <= 1) return;
    const updatedDetails = inDescription.filter((_, i) => i !== index);
    setInDescription(updatedDetails);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedLocation = location.trim();

    // Stricter Validation
    if (!trimmedTitle) {
      setError("Title is required.");
      setActiveTab("main");
      return;
    }
    if (!date || isNaN(date?.getTime())) {
      setError("A valid Date and Time is required.");
      setActiveTab("main");
      return;
    }
    if (!trimmedDesc) {
      setError("Description is required.");
      setActiveTab("main");
      return;
    }
    if (!trimmedLocation) {
      setError("Location is required.");
      setActiveTab("main");
      return;
    }
    if (isLimitEnabled && (!Number.isInteger(limitValue) || limitValue <= 0)) {
      setError(
        "Attendance limit must be a positive whole number when enabled.",
      );
      setActiveTab("main");
      return;
    }
    // End Stricter Validation

    const finalInDescription = inDescription.filter(
      (item) => item.title?.trim() || item.description?.trim(),
    );

    const newEventData = {
      title: trimmedTitle,
      date: date.toISOString(),
      description: trimmedDesc,
      location: trimmedLocation,
      imageUrl,
      attendees,
      cardColor,
      isLimitEnabled,
      attendanceLimit: isLimitEnabled ? limitValue : null,
      cardEnabled,
      inDescription: finalInDescription,
      freezenotallow: freezeNotAllowed,
      closed: isClosed,
    };

    console.log(
      "Submitting Event Data:",
      JSON.stringify(newEventData, null, 2),
    );

    createEventMutation.mutate(newEventData, {
      onSuccess: () => {
        onClose();
      },
      onError: (apiError) => {
        setError(apiError.message || "Failed to create event.");
      },
    });
  };

  const handleColorSelect = (selectedColorClass) => {
    setCardColor(selectedColorClass);
    setIsColorPickerOpen(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-50 flex justify-center items-center p-4"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={modalVariants}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-20 bg-white rounded-full p-1"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab("main")}
            className={`flex-1 py-2 px-4 text-center text-sm font-medium focus:outline-none ${activeTab === "main" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"}`}
          >
            Main Card
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-2 px-4 text-center text-sm font-medium focus:outline-none ${activeTab === "details" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"}`}
          >
            More Details
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-160px)]"
        >
          {error && <p className="text-red-500 text-sm p-4 mb-0">{error}</p>}

          {activeTab === "main" && (
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date & Time *
                </label>
                <ReactDatePicker
                  id="date"
                  selected={date}
                  onChange={(d) => setDate(d)}
                  showTimeSelect
                  dateFormat="Pp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  wrapperClassName="w-full"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description *
                </label>
                <textarea
                  id="description"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                ></textarea>
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="imageUrl"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="relative" ref={colorPickerRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Color (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <span className="flex items-center">
                    <span
                      className={`inline-block w-5 h-5 rounded mr-2 border border-gray-400 ${cardColor}`}
                    ></span>
                    {cardColor}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${isColorPickerOpen ? "rotate-180" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <AnimatePresence>
                  {isColorPickerOpen && (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={dropdownVariants}
                      className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
                    >
                      <ColorPicker onSelectColor={handleColorSelect} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center pt-2 border-t">
                <input
                  id="cardEnabled"
                  type="checkbox"
                  checked={cardEnabled}
                  onChange={(e) => setCardEnabled(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="cardEnabled"
                  className="ml-2 block text-sm font-medium text-gray-900"
                >
                  Card Enabled (Visible to Users)
                </label>
              </div>
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center">
                  <input
                    id="attendees"
                    type="checkbox"
                    checked={attendees}
                    onChange={(e) => setAttendees(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="attendees"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Allow Attendance Tracking
                  </label>
                </div>
                {attendees && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center">
                      <input
                        id="limit-enabled"
                        type="checkbox"
                        checked={isLimitEnabled}
                        onChange={(e) => setIsLimitEnabled(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="limit-enabled"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Enable Attendance Limit
                      </label>
                    </div>
                    {isLimitEnabled && (
                      <div>
                        <label
                          htmlFor="limit-value"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Limit Value *
                        </label>
                        <input
                          type="number"
                          id="limit-value"
                          value={limitValue}
                          onChange={(e) =>
                            setLimitValue(parseInt(e.target.value, 10) || 0)
                          }
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center pt-2 border-t">
                <input
                  id="freezeNotAllowed"
                  type="checkbox"
                  checked={freezeNotAllowed}
                  onChange={(e) => setFreezeNotAllowed(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="freezeNotAllowed"
                  className="ml-2 block text-sm font-medium text-gray-900"
                >
                  Disallow Frozen Users (Enforce Freeze)
                </label>
              </div>
              <div className="flex items-center pt-2 border-t">
                <input
                  id="isClosed"
                  type="checkbox"
                  checked={isClosed}
                  onChange={(e) => setIsClosed(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isClosed"
                  className="ml-2 block text-sm font-medium text-gray-900"
                >
                  Close Event (Prevent Unattending)
                </label>
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="p-4 md:p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Detailed Information Sections
              </h3>
              {inDescription.map((item, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-md space-y-2 relative bg-gray-50"
                >
                  <label
                    htmlFor={`detail-title-${index}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Section Title (Optional)
                  </label>
                  <input
                    type="text"
                    id={`detail-title-${index}`}
                    placeholder="e.g., Schedule, What to Bring"
                    value={item.title}
                    onChange={(e) =>
                      handleInDescriptionChange(index, "title", e.target.value)
                    }
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <label
                    htmlFor={`detail-text-${index}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Section Text *
                  </label>
                  <textarea
                    id={`detail-text-${index}`}
                    rows="3"
                    placeholder="Enter details for this section..."
                    value={item.description}
                    onChange={(e) =>
                      handleInDescriptionChange(
                        index,
                        "description",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required={!item.title}
                  ></textarea>
                  {inDescription.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInDescriptionItem(index)}
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 bg-white rounded-full"
                      aria-label="Remove section"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addInDescriptionItem}
                className="mt-2 px-3 py-1.5 border border-dashed border-gray-400 text-sm text-gray-600 rounded hover:bg-gray-100"
              >
                + Add Section
              </button>
            </div>
          )}

          <div className="p-4 md:px-6 pb-4 flex justify-end space-x-3 border-t mt-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              disabled={createEventMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition ${createEventMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? "Saving..." : "Save Event"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
