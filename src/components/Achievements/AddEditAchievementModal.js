import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faArrowUp,
  faArrowDown,
} from "@fortawesome/free-solid-svg-icons";

const modalVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.15 } },
};

const ADD_NEW_CATEGORY_VALUE = "__ADD_NEW__";

export default function AddEditAchievementModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
  error = null,
  availableCategories = [],
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [achiveDescription, setAchiveDescription] = useState("");
  const [imgurl, setImgurl] = useState("");
  const [category, setCategory] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [attendanceCounter, setAttendanceCounter] = useState(false);
  const [attendanceNeed, setAttendanceNeed] = useState(null);
  const [onScore, setOnScore] = useState(false);
  const [hasQrCodeExpiry, setHasQrCodeExpiry] = useState(true);
  const [cardSkinImageUrl, setCardSkinImageUrl] = useState("");
  const [levels, setLevels] = useState([]);
  const [formError, setFormError] = useState("");

  const isEditing = !!initialData;
  const showNewCategoryInput = category === ADD_NEW_CATEGORY_VALUE;

  const baseFieldsDisabled = useMemo(() => {
    return attendanceCounter && levels.length > 0;
  }, [attendanceCounter, levels]);

  useEffect(() => {
    setFormError(error);
  }, [error]);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setTitle(initialData.title || "");
        const initialLevelsExist =
          initialData.level_config && initialData.level_config.length > 0;
        const initialAttendanceCounter =
          typeof initialData.attendanceCounter === "boolean"
            ? initialData.attendanceCounter
            : false;
        const initiallyBaseFieldsDisabled =
          initialAttendanceCounter && initialLevelsExist;

        setDescription(
          initiallyBaseFieldsDisabled && !initialData.description
            ? ""
            : initialData.description || "",
        );
        setAchiveDescription(
          initiallyBaseFieldsDisabled && !initialData.achiveDescription
            ? ""
            : initialData.achiveDescription || initialData.description || "",
        );
        setImgurl(
          initiallyBaseFieldsDisabled && !initialData.imgurl
            ? ""
            : initialData.imgurl || "",
        );
        setCardSkinImageUrl(
          initiallyBaseFieldsDisabled && !initialData.card_skin_image_url
            ? ""
            : initialData.card_skin_image_url || "",
        );

        setCategory(initialData.category || "");
        setIsEnabled(
          typeof initialData.isEnabled === "boolean"
            ? initialData.isEnabled
            : true,
        );
        setAttendanceCounter(initialAttendanceCounter);
        setAttendanceNeed(initialData.attendanceNeed || null);
        setOnScore(
          typeof initialData.onScore === "boolean"
            ? initialData.onScore
            : false,
        );
        setHasQrCodeExpiry(
          typeof initialData.hasQrCodeExpiry === "boolean"
            ? initialData.hasQrCodeExpiry
            : true,
        );
        setLevels(
          initialData.level_config && Array.isArray(initialData.level_config)
            ? initialData.level_config.map((l, index) => ({
                ...l,
                id: l.id || `temp_${Date.now()}_${index}`,
              }))
            : [],
        );
      } else {
        setTitle("");
        setDescription("");
        setAchiveDescription("");
        setImgurl("");
        setCategory("");
        setIsEnabled(true);
        setAttendanceCounter(false);
        setAttendanceNeed(null);
        setOnScore(false);
        setHasQrCodeExpiry(true);
        setCardSkinImageUrl("");
        setLevels([]);
      }
      setNewCategoryInput("");
      setFormError("");
    }
  }, [isOpen, initialData, isEditing]);

  useEffect(() => {
    if (baseFieldsDisabled) {
    }
  }, [baseFieldsDisabled]);

  const handleCategoryChange = (e) => {
    const selectedValue = e.target.value;
    setCategory(selectedValue);
    if (selectedValue !== ADD_NEW_CATEGORY_VALUE) {
      setNewCategoryInput("");
    }
  };

  const handleAddLevel = () => {
    setLevels([
      ...levels,
      {
        id: `new_${Date.now()}`,
        levelOrder: levels.length + 1,
        progressNeeded:
          levels.length > 0
            ? (parseInt(levels[levels.length - 1].progressNeeded, 10) || 0) + 5
            : 5,
        levelTitle: "",
        levelImgUrl: "",
        levelDescription: "",
        levelAchiveDescription: "",
        levelSkinUrl: "",
      },
    ]);
  };

  const handleRemoveLevel = (idToRemove) => {
    setLevels(
      levels
        .filter((level) => level.id !== idToRemove)
        .map((level, index) => ({ ...level, levelOrder: index + 1 })),
    );
  };

  const handleLevelChange = (id, field, value) => {
    setLevels(
      levels.map((level) =>
        level.id === id ? { ...level, [field]: value } : level,
      ),
    );
  };

  const moveLevel = (index, direction) => {
    const newLevels = [...levels];
    const item = newLevels[index];
    newLevels.splice(index, 1);
    newLevels.splice(index + direction, 0, item);
    setLevels(
      newLevels.map((level, idx) => ({ ...level, levelOrder: idx + 1 })),
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!title) {
      setFormError("Base Title is required (even if levels override it).");
      return;
    }

    if (!baseFieldsDisabled) {
      if (!description) {
        setFormError("Base Description is required when not using levels.");
        return;
      }
      if (!imgurl) {
        setFormError("Base Image URL is required when not using levels.");
        return;
      }
    }

    if (attendanceCounter && !levels.length && !attendanceNeed) {
      setFormError(
        "If tracking attendance with no levels, 'Attendance Needed' is required.",
      );
      return;
    }

    if (attendanceCounter && levels.length > 0) {
      for (const level of levels) {
        if (
          !level.progressNeeded ||
          parseInt(level.progressNeeded, 10) <= 0 ||
          !level.levelTitle ||
          !level.levelImgUrl ||
          !level.levelDescription
        ) {
          setFormError(
            `Level ${level.levelOrder} is missing required fields (Progress, Title, Image, Description) or has invalid progress.`,
          );
          return;
        }
      }
      const progressValues = levels.map((l) => parseInt(l.progressNeeded, 10));
      if (new Set(progressValues).size !== progressValues.length) {
        setFormError("Progress Needed values for levels must be unique.");
        return;
      }
      for (let i = 0; i < progressValues.length - 1; i++) {
        if (progressValues[i] >= progressValues[i + 1]) {
          setFormError(
            "Progress Needed for levels must be in strictly increasing order.",
          );
          return;
        }
      }
    }

    let finalCategory = "";
    if (category === ADD_NEW_CATEGORY_VALUE) {
      finalCategory = newCategoryInput.trim();
      if (!finalCategory) {
        setFormError("Please enter a name for the new category.");
        return;
      }
    } else {
      finalCategory = category;
    }

    const achievementData = {
      title,
      description: baseFieldsDisabled ? null : description,
      achiveDescription: baseFieldsDisabled
        ? null
        : achiveDescription || description,
      imgurl: baseFieldsDisabled ? null : imgurl,
      category: finalCategory || "Uncategorized",
      isEnabled,
      attendanceCounter,
      attendanceNeed:
        attendanceCounter && levels.length === 0
          ? parseInt(attendanceNeed, 10)
          : null,
      onScore: onScore,
      hasQrCodeExpiry: hasQrCodeExpiry,
      card_skin_image_url: baseFieldsDisabled
        ? null
        : cardSkinImageUrl.trim() || null,
      level_config:
        attendanceCounter && levels.length > 0
          ? levels.map((l) => {
              const { id, ...rest } = l;
              return {
                ...rest,
                progressNeeded: parseInt(l.progressNeeded, 10),
              };
            })
          : [],
    };

    if (baseFieldsDisabled && achievementData.level_config.length === 0) {
      setFormError(
        "If attendance/levels are enabled, at least one level must be defined, or uncheck 'Track Attendance Count'.",
      );
      return;
    }
    if (
      baseFieldsDisabled &&
      achievementData.level_config.length > 0 &&
      achievementData.imgurl === null
    ) {
      achievementData.imgurl =
        achievementData.level_config[0].levelImgUrl || "";
    }

    if (isEditing) {
      achievementData.id = initialData.id;
    }

    onSubmit(achievementData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full relative max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
                <h2 className="text-xl font-semibold mb-4">
                  {isEditing ? "Edit Achievement" : "Add New Achievement"}
                </h2>

                {formError && (
                  <p className="text-red-500 text-sm mb-3">{formError}</p>
                )}

                <div>
                  <label
                    htmlFor="ach-title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Base Title * (Fallback if no levels active)
                  </label>
                  <input
                    type="text"
                    id="ach-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="ach-desc"
                    className={`block text-sm font-medium mb-1 ${
                      baseFieldsDisabled ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    Description (How to get / Base){" "}
                    {baseFieldsDisabled ? "(Handled by Levels)" : "*"}
                  </label>
                  <textarea
                    id="ach-desc"
                    rows="2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      baseFieldsDisabled
                        ? "bg-gray-100 border-gray-200 cursor-not-allowed"
                        : "border-gray-300"
                    }`}
                    required={!baseFieldsDisabled}
                    disabled={baseFieldsDisabled}
                  ></textarea>
                </div>
                <div>
                  <label
                    htmlFor="ach-achive-desc"
                    className={`block text-sm font-medium mb-1 ${
                      baseFieldsDisabled ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    Achieved Description (Base / Optional){" "}
                    {baseFieldsDisabled ? "(Handled by Levels)" : ""}
                  </label>
                  <textarea
                    id="ach-achive-desc"
                    rows="2"
                    value={achiveDescription}
                    onChange={(e) => setAchiveDescription(e.target.value)}
                    placeholder={
                      baseFieldsDisabled
                        ? "Handled by Levels"
                        : "Defaults to main description if empty"
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      baseFieldsDisabled
                        ? "bg-gray-100 border-gray-200 cursor-not-allowed"
                        : "border-gray-300"
                    }`}
                    disabled={baseFieldsDisabled}
                  ></textarea>
                </div>
                <div>
                  <label
                    htmlFor="ach-imgurl"
                    className={`block text-sm font-medium mb-1 ${
                      baseFieldsDisabled ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    Image URL (Base){" "}
                    {baseFieldsDisabled ? "(Handled by Levels)" : "*"}
                  </label>
                  <input
                    type="url"
                    id="ach-imgurl"
                    value={imgurl}
                    onChange={(e) => setImgurl(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      baseFieldsDisabled
                        ? "bg-gray-100 border-gray-200 cursor-not-allowed"
                        : "border-gray-300"
                    }`}
                    required={!baseFieldsDisabled}
                    disabled={baseFieldsDisabled}
                  />
                </div>
                <div>
                  <label
                    htmlFor="ach-skin-imgurl"
                    className={`block text-sm font-medium mb-1 ${
                      baseFieldsDisabled ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    Card Skin Image URL (Base / Optional){" "}
                    {baseFieldsDisabled ? "(Handled by Levels)" : ""}
                  </label>
                  <input
                    type="url"
                    id="ach-skin-imgurl"
                    value={cardSkinImageUrl}
                    onChange={(e) => setCardSkinImageUrl(e.target.value)}
                    placeholder={
                      baseFieldsDisabled
                        ? "Handled by Levels"
                        : "URL for the card frame/overlay"
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      baseFieldsDisabled
                        ? "bg-gray-100 border-gray-200 cursor-not-allowed"
                        : "border-gray-300"
                    }`}
                    disabled={baseFieldsDisabled}
                  />
                </div>

                <div>
                  <label
                    htmlFor="ach-category-select"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="ach-category-select"
                    value={category}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">-- Select Category (Optional) --</option>
                    {availableCategories.map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                    <option value={ADD_NEW_CATEGORY_VALUE}>
                      -- Add New Category --
                    </option>
                  </select>
                </div>

                {showNewCategoryInput && (
                  <div className="pl-4 mt-2">
                    <label
                      htmlFor="ach-new-category"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      New Category Name *
                    </label>
                    <input
                      type="text"
                      id="ach-new-category"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter new category name"
                      required={showNewCategoryInput}
                    />
                  </div>
                )}

                <div className="flex items-center pt-2 border-t">
                  <input
                    id="ach-enabled"
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="ach-enabled"
                    className="ml-2 block text-sm font-medium text-gray-900"
                  >
                    Enabled (Visible to Users)
                  </label>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center">
                    <input
                      id="ach-att-counter"
                      type="checkbox"
                      checked={attendanceCounter}
                      onChange={(e) => {
                        setAttendanceCounter(e.target.checked);
                        if (!e.target.checked) {
                          setLevels([]);
                        }
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="ach-att-counter"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Track Attendance Count / Use Levels
                    </label>
                  </div>
                  {attendanceCounter && levels.length === 0 && (
                    <div className="pl-6">
                      <label
                        htmlFor="ach-att-need"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Attendance Needed (if no levels)*
                      </label>
                      <input
                        type="number"
                        id="ach-att-need"
                        value={attendanceNeed ?? ""}
                        onChange={(e) =>
                          setAttendanceNeed(
                            parseInt(e.target.value, 10) || null,
                          )
                        }
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required={attendanceCounter && levels.length === 0}
                      />
                    </div>
                  )}
                </div>

                {attendanceCounter && (
                  <div className="pt-3 border-t space-y-4">
                    <h3 className="text-md font-semibold text-gray-800">
                      Achievement Levels (Overrides base image/description if
                      used)
                    </h3>
                    {levels.map((level, index) => (
                      <div
                        key={level.id}
                        className="p-3 border rounded-md space-y-2 bg-white relative"
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-gray-700">
                            Level {index + 1}
                          </p>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveLevel(index, -1)}
                              disabled={index === 0}
                              className="p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-50"
                            >
                              <FontAwesomeIcon icon={faArrowUp} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLevel(index, 1)}
                              disabled={index === levels.length - 1}
                              className="p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-50"
                            >
                              <FontAwesomeIcon icon={faArrowDown} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveLevel(level.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Progress Needed *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={level.progressNeeded || ""}
                            onChange={(e) =>
                              handleLevelChange(
                                level.id,
                                "progressNeeded",
                                e.target.value,
                              )
                            }
                            placeholder="Progression Status user need to achieve this level"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Level Title *
                          </label>
                          <input
                            type="text"
                            value={level.levelTitle}
                            onChange={(e) =>
                              handleLevelChange(
                                level.id,
                                "levelTitle",
                                e.target.value,
                              )
                            }
                            placeholder="Title for this level"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Level Image URL *
                          </label>
                          <input
                            type="url"
                            value={level.levelImgUrl}
                            onChange={(e) =>
                              handleLevelChange(
                                level.id,
                                "levelImgUrl",
                                e.target.value,
                              )
                            }
                            placeholder="Image URL for this level"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Level Description (How to get) *
                          </label>
                          <textarea
                            rows="2"
                            value={level.levelDescription}
                            onChange={(e) =>
                              handleLevelChange(
                                level.id,
                                "levelDescription",
                                e.target.value,
                              )
                            }
                            placeholder="Description for how to achieve this level"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Level Achieved Description (Optional)
                          </label>
                          <textarea
                            rows="2"
                            value={level.levelAchiveDescription}
                            onChange={(e) =>
                              handleLevelChange(
                                level.id,
                                "levelAchiveDescription",
                                e.target.value,
                              )
                            }
                            placeholder="Description shown when this level is achieved (defaults to Level Description)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Level Card Skin URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={level.levelSkinUrl}
                            onChange={(e) =>
                              handleLevelChange(
                                level.id,
                                "levelSkinUrl",
                                e.target.value,
                              )
                            }
                            placeholder="Card Skin URL for this level"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddLevel}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition"
                    >
                      <FontAwesomeIcon icon={faPlus} /> Add Level
                    </button>
                  </div>
                )}

                <div className="flex items-center pt-2 border-t">
                  <input
                    id="ach-onscore"
                    type="checkbox"
                    checked={onScore}
                    onChange={(e) => setOnScore(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="ach-onscore"
                    className="ml-2 block text-sm font-medium text-gray-900"
                  >
                    Enable Scoring
                  </label>
                </div>

                <div className="flex items-center pt-2 border-t">
                  <input
                    id="ach-qr-expiry"
                    type="checkbox"
                    checked={hasQrCodeExpiry}
                    onChange={(e) => setHasQrCodeExpiry(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="ach-qr-expiry"
                    className="ml-2 block text-sm font-medium text-gray-900"
                  >
                    QR Code Expires (Recommended)
                  </label>
                </div>
              </div>
              <div className="p-4 bg-gray-50 flex justify-end space-x-3 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Saving..."
                    : isEditing
                      ? "Save Changes"
                      : "Create Achievement"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
