"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PropTypes from "prop-types";

const staticPositions = [
  "President",
  "Vice-President",
  "Secretary",
  "Treasurer",
  "Social Media",
  "Head of Committee",
  "Event Director",
  "Committee Member",
  "Volunteer",
  "Founding board member",
];

const DEFAULT_IMAGE_URL =
  "https://api2.cultureconnection.se/assets/random/website/f6c5bd30-6ec2-4aba-8539-88a682b881dc.jpg";

const reorderMembers = async (orderedIds) => {
  const response = await fetch("/api/admin/member", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to reorder members: ${response.statusText}`,
    );
  }

  return response.json();
};

const applyLocalMemberOrder = (members, orderedIds) => {
  const idSet = new Set(orderedIds);
  const orderedMembers = orderedIds
    .map((id) => members.find((member) => member.id === id))
    .filter(Boolean);

  let orderedIndex = 0;

  return members.map((member) => {
    if (!idSet.has(member.id)) {
      return member;
    }

    const nextMember = orderedMembers[orderedIndex];
    orderedIndex += 1;
    return nextMember || member;
  });
};

const orderCodentions = (codentions, preferredOrder = []) => {
  const uniqueCodentions = [...new Set(codentions.filter(Boolean))].sort();
  const availableSet = new Set(uniqueCodentions);
  const orderedPreferred = preferredOrder.filter((codention) =>
    availableSet.has(codention),
  );
  const remainingCodentions = uniqueCodentions.filter(
    (codention) => !orderedPreferred.includes(codention),
  );

  return [...orderedPreferred, ...remainingCodentions];
};

const fetchMembers = async () => {
  const response = await fetch("/api/admin/member");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch members: ${response.statusText}`,
    );
  }
  return response.json();
};

const createMember = async (newMemberData) => {
  const response = await fetch("/api/admin/member", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newMemberData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to create member: ${response.statusText}`,
    );
  }
  return response.json();
};

const updateMember = async (updatedMemberData) => {
  const response = await fetch("/api/admin/member", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedMemberData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update member: ${response.statusText}`,
    );
  }
  return response.json();
};

const deleteMember = async (memberId) => {
  const response = await fetch(`/api/admin/member?id=${memberId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to delete member: ${response.statusText}`,
    );
  }
  return response.json();
};

const fetchSettings = async () => {
  const response = await fetch("/api/admin/member/settings");
  if (!response.ok) return { defaultCodention: "All" };
  return response.json();
};

const updateBoardSettings = async (settingsUpdate) => {
  const response = await fetch("/api/admin/member/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settingsUpdate),
  });
  if (!response.ok) throw new Error("Failed to update board settings");
  return response.json();
};

// --- INLINE ICONS (No external dependencies required) ---
const StarIconSolid = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
      clipRule="evenodd"
    />
  </svg>
);

const StarIconOutline = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.557.557 0 01-.794.577l-4.687-2.941a.563.563 0 00-.586 0l-4.687 2.941a.557.557 0 01-.794-.577l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
);

const DragHandleIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <circle cx="9" cy="6.5" r="1.5" />
    <circle cx="15" cy="6.5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="17.5" r="1.5" />
    <circle cx="15" cy="17.5" r="1.5" />
  </svg>
);

function CustomCreatableDropdown({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  required,
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [showOptions, setShowOptions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange({ target: { name, value: newValue } });
    if (!showOptions) {
      setShowOptions(true);
    }
  };

  const handleOptionClick = (optionValue) => {
    setInputValue(optionValue);
    onChange({ target: { name, value: optionValue } });
    setShowOptions(false);
  };

  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(inputValue.toLowerCase()),
    );
  }, [inputValue, options]);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        id={id}
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowOptions(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
      />
      {showOptions && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option}
                onClick={() => handleOptionClick(option)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                {option}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-gray-500">
              {inputValue
                ? "No matching options, type to create new"
                : "No options available"}
            </li>
          )}
          {inputValue && !options.includes(inputValue) && (
            <li
              onClick={() => handleOptionClick(inputValue)}
              className="px-3 py-2 hover:bg-blue-50 bg-blue-100 border-t border-blue-200 cursor-pointer text-sm text-blue-700"
            >
              Create new: "{inputValue}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

CustomCreatableDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
};

function MemberForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  availablePositions,
  existingCodentions,
}) {
  const [formData, setFormData] = useState({
    name: "",
    codention: "",
    position: "",
    contact: "",
    imageUrl: "",
    bio: "",
    ...initialData,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.codention || !formData.position) {
      alert("Name, Team/Codention, and Position are required.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded shadow-md border"
    >
      <h3 className="text-lg font-medium mb-4">
        {initialData ? "Edit Member" : "Add New Member"}
      </h3>
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label
          htmlFor="codention"
          className="block text-sm font-medium text-gray-700"
        >
          Team / Codention <span className="text-red-500">*</span>
        </label>
        <CustomCreatableDropdown
          id="codention"
          name="codention"
          value={formData.codention}
          onChange={handleChange}
          options={existingCodentions}
          placeholder="Select or type new team"
          required
        />
      </div>
      <div>
        <label
          htmlFor="position"
          className="block text-sm font-medium text-gray-700"
        >
          Position <span className="text-red-500">*</span>
        </label>
        <select
          name="position"
          id="position"
          value={formData.position}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
        >
          <option value="" disabled>
            -- Select a position --
          </option>
          {availablePositions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="contact"
          className="block text-sm font-medium text-gray-700"
        >
          Contact (Optional)
        </label>
        <input
          type="text"
          name="contact"
          id="contact"
          value={formData.contact}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label
          htmlFor="imageUrl"
          className="block text-sm font-medium text-gray-700"
        >
          Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          id="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          placeholder="https://example.com/image.jpg"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-gray-700"
        >
          Bio (Optional)
        </label>
        <textarea
          name="bio"
          id="bio"
          value={formData.bio}
          onChange={handleChange}
          rows="3"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        ></textarea>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 rounded text-white text-sm ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Update Member"
              : "Add Member"}
        </button>
      </div>
    </form>
  );
}

MemberForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  availablePositions: PropTypes.arrayOf(PropTypes.string).isRequired,
  existingCodentions: PropTypes.arrayOf(PropTypes.string).isRequired,
};

function SortableDesktopMemberRow({
  member,
  index,
  displayedMembersLength,
  openBios,
  toggleBio,
  handleEditClick,
  handleDeleteClick,
  isMutating,
  isFormOpen,
  editingMember,
  dataCellClasses,
  columnStyles,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: member.id,
    disabled: isMutating || isFormOpen,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="row"
      className={`flex items-center bg-white ${
        index < displayedMembersLength - 1 ? "border-b border-gray-200" : ""
      } ${isDragging ? "z-10 shadow-lg ring-2 ring-blue-300" : "hover:bg-gray-50"} transition-colors`}
    >
      <div
        role="cell"
        className={`${dataCellClasses} w-12 text-center text-gray-500`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={isMutating || isFormOpen}
          className="inline-flex cursor-grab items-center justify-center rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Drag ${member.name}`}
          title="Drag to reorder"
        >
          <DragHandleIcon className="h-5 w-5" />
        </button>
      </div>
      <div
        role="cell"
        className={`${dataCellClasses} ${columnStyles.image} text-gray-500`}
      >
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.name || "Member image"}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_IMAGE_URL;
            }}
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No Img</span>
          </div>
        )}
      </div>
      <div
        role="cell"
        className={`${dataCellClasses} ${columnStyles.name} font-medium text-gray-900 whitespace-nowrap`}
      >
        {member.name}
      </div>
      <div
        role="cell"
        className={`${dataCellClasses} ${columnStyles.codention} text-gray-500 whitespace-nowrap`}
      >
        {member.codention || "-"}
      </div>
      <div
        role="cell"
        className={`${dataCellClasses} ${columnStyles.position} text-gray-500 whitespace-nowrap`}
      >
        {member.position}
      </div>
      <div
        role="cell"
        className={`${dataCellClasses} ${columnStyles.contact} text-gray-500 whitespace-nowrap`}
      >
        {member.contact || "-"}
      </div>
      <div
        role="cell"
        className={`${dataCellClasses} ${columnStyles.bio} text-gray-500`}
      >
        {member.bio ? (
          <div className="relative inline-block">
            <button
              onClick={() => toggleBio(member.id)}
              className="px-2 py-1 bg-black text-white text-xs rounded"
            >
              Bio
            </button>
            {openBios[member.id] && (
              <div className="absolute left-0 mt-2 z-10 bg-white p-3 border border-gray-300 rounded-md shadow-lg min-w-[200px] max-w-[300px] text-sm text-gray-700 whitespace-pre-wrap">
                {member.bio}
              </div>
            )}
          </div>
        ) : (
          "-"
        )}
      </div>
      <div
        role="cell"
        className={`${dataCellClasses} ${columnStyles.actions} font-medium space-x-2 whitespace-nowrap`}
      >
        <button
          onClick={() => handleEditClick(member)}
          disabled={isMutating || isFormOpen}
          className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </button>
        <button
          onClick={() => handleDeleteClick(member.id, member.name)}
          disabled={
            isMutating || (isFormOpen && editingMember?.id === member.id)
          }
          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

SortableDesktopMemberRow.propTypes = {
  member: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  displayedMembersLength: PropTypes.number.isRequired,
  openBios: PropTypes.object.isRequired,
  toggleBio: PropTypes.func.isRequired,
  handleEditClick: PropTypes.func.isRequired,
  handleDeleteClick: PropTypes.func.isRequired,
  isMutating: PropTypes.bool.isRequired,
  isFormOpen: PropTypes.bool.isRequired,
  editingMember: PropTypes.object,
  dataCellClasses: PropTypes.string.isRequired,
  columnStyles: PropTypes.object.isRequired,
};

function SortableCodentionTab({
  codention,
  isActive,
  isDefault,
  isDisabled,
  onSelect,
  onSetDefault,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: codention,
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group flex items-center rounded-md ${
        isDragging ? "z-10 shadow-lg ring-2 ring-blue-300" : ""
      }`}
    >
      <button
        onClick={() => onSelect(codention)}
        className={`px-3 py-1.5 pr-14 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {codention}
      </button>

      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={isDisabled}
        className="absolute right-7 p-1 text-gray-400 transition hover:scale-110 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Drag ${codention}`}
        title="Drag to reorder tab"
      >
        <DragHandleIcon className="h-4 w-4" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSetDefault(codention);
        }}
        title={
          isDefault
            ? "Current Default Public View"
            : "Set as Default Public View"
        }
        className="absolute right-1 p-1 hover:scale-110 transition-transform"
      >
        {isDefault ? (
          <StarIconSolid
            className={`h-4 w-4 ${
              isActive ? "text-yellow-300" : "text-yellow-500"
            }`}
          />
        ) : (
          <StarIconOutline
            className={`h-4 w-4 ${
              isActive
                ? "text-blue-200 hover:text-white"
                : "text-gray-400 hover:text-yellow-500"
            }`}
          />
        )}
      </button>
    </div>
  );
}

SortableCodentionTab.propTypes = {
  codention: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  isDefault: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onSetDefault: PropTypes.func.isRequired,
};

const ALL_MEMBERS_TAB_KEY = "_ALL_MEMBERS_";

export default function BoardMemberManagement() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [activeCodentionTab, setActiveCodentionTab] =
    useState(ALL_MEMBERS_TAB_KEY);
  const [openBios, setOpenBios] = useState({});
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    data: members = [],
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["boardMembers"],
    queryFn: fetchMembers,
  });

  const { data: settings } = useQuery({
    queryKey: ["boardSettings"],
    queryFn: fetchSettings,
  });

  const existingCodentionsForForm = useMemo(() => {
    if (!members || members.length === 0) return [];
    const codentions = members
      .map((member) => member.codention)
      .filter(Boolean);
    return [...new Set(codentions)].sort();
  }, [members]);

  const uniqueCodentionsForTabs = useMemo(() => {
    return orderCodentions(
      members.map((member) => member.codention),
      settings?.codentionOrder || [],
    );
  }, [members, settings?.codentionOrder]);

  const displayedMembers = useMemo(() => {
    if (activeCodentionTab === ALL_MEMBERS_TAB_KEY) {
      return members;
    }
    return members.filter((member) => member.codention === activeCodentionTab);
  }, [members, activeCodentionTab]);

  const handleMutationSuccess = (action) => {
    queryClient.invalidateQueries({ queryKey: ["boardMembers"] });
    setIsFormOpen(false);
    setEditingMember(null);
    setGeneralError(null);
  };

  const handleMutationError = (error, action) => {
    setGeneralError(
      error.message || `An error occurred while ${action} member.`,
    );
  };

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => handleMutationSuccess("creation"),
    onError: (error) => handleMutationError(error, "creating"),
  });

  const updateMutation = useMutation({
    mutationFn: updateMember,
    onSuccess: () => handleMutationSuccess("update"),
    onError: (error) => handleMutationError(error, "updating"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      handleMutationSuccess("deletion");
      const currentTabStillExists =
        uniqueCodentionsForTabs.includes(activeCodentionTab);
      if (
        activeCodentionTab !== ALL_MEMBERS_TAB_KEY &&
        !currentTabStillExists
      ) {
        const membersInCurrentTabAfterDelete = members.filter(
          (m) =>
            m.codention === activeCodentionTab &&
            m.id !== deleteMutation.variables,
        ).length;
        if (membersInCurrentTabAfterDelete === 0) {
          setActiveCodentionTab(ALL_MEMBERS_TAB_KEY);
        }
      }
    },
    onError: (error) => handleMutationError(error, "deleting"),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderMembers,
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["boardMembers"] });

      const previousMembers = queryClient.getQueryData(["boardMembers"]) || [];
      const nextMembers = applyLocalMemberOrder(previousMembers, orderedIds);

      queryClient.setQueryData(["boardMembers"], nextMembers);

      return { previousMembers };
    },
    onError: (error, _orderedIds, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(["boardMembers"], context.previousMembers);
      }
      handleMutationError(error, "reordering");
    },
    onSuccess: (updatedMembers) => {
      queryClient.setQueryData(["boardMembers"], updatedMembers);
      setGeneralError(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers"] });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: updateBoardSettings,
    onMutate: async (settingsUpdate) => {
      await queryClient.cancelQueries({ queryKey: ["boardSettings"] });

      const previousSettings = queryClient.getQueryData(["boardSettings"]) || {
        defaultCodention: "All",
        codentionOrder: [],
      };

      queryClient.setQueryData(["boardSettings"], {
        ...previousSettings,
        ...settingsUpdate,
      });

      return { previousSettings };
    },
    onError: (err, _settingsUpdate, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["boardSettings"], context.previousSettings);
      }
      alert("Failed to update board settings: " + err.message);
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["boardSettings"], updatedSettings);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boardSettings"] });
    },
  });

  const handleAddClick = () => {
    setEditingMember(null);
    setIsFormOpen(true);
    setGeneralError(null);
  };

  const handleEditClick = (member) => {
    setEditingMember(member);
    setIsFormOpen(true);
    setGeneralError(null);
  };

  const handleDeleteClick = (memberId, memberName) => {
    if (
      window.confirm(`Are you sure you want to delete member "${memberName}"?`)
    ) {
      setGeneralError(null);
      deleteMutation.mutate(memberId);
    }
  };

  const handleFormSubmit = (formData) => {
    setGeneralError(null);
    if (editingMember) {
      updateMutation.mutate({ ...formData, id: editingMember.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = displayedMembers.findIndex(
      (member) => member.id === active.id,
    );
    const newIndex = displayedMembers.findIndex(
      (member) => member.id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedDisplayedMembers = arrayMove(
      displayedMembers,
      oldIndex,
      newIndex,
    );
    reorderMutation.mutate(
      reorderedDisplayedMembers.map((member) => member.id),
    );
  };

  const handleCodentionDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = uniqueCodentionsForTabs.findIndex(
      (codention) => codention === active.id,
    );
    const newIndex = uniqueCodentionsForTabs.findIndex(
      (codention) => codention === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedCodentions = arrayMove(
      uniqueCodentionsForTabs,
      oldIndex,
      newIndex,
    );

    settingsMutation.mutate({ codentionOrder: reorderedCodentions });
  };

  const toggleBio = (id) => {
    setOpenBios((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

  const cellBaseClasses = "py-3 px-4";
  const headerCellClasses = `${cellBaseClasses} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`;
  const dataCellClasses = `${cellBaseClasses} text-sm`;

  const columnStyles = {
    handle: "w-12",
    image: "w-16 md:w-20",
    name: "flex-1 min-w-[120px] md:min-w-[150px]",
    codention: "flex-1 min-w-[120px] md:min-w-[150px]",
    position: "flex-1 min-w-[120px] md:min-w-[150px]",
    contact: "flex-1 min-w-[100px] md:min-w-[120px]",
    bio: "w-20 md:w-24",
    actions: "w-28 md:w-32 text-right",
  };

  return (
    <div className="bg-gray-50 p-4 rounded border mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Manage Board Members
        </h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
          disabled={isMutating || isFormOpen}
        >
          Add New Member
        </button>
      </div>

      {generalError && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{generalError}</span>
        </div>
      )}

      {isFormOpen && (
        <div className="my-6">
          <MemberForm
            initialData={editingMember}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            availablePositions={staticPositions}
            existingCodentions={existingCodentionsForForm}
          />
        </div>
      )}

      {!isLoading && !isError && members.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3 items-center">
          <div className="text-sm text-gray-500 mr-2 font-semibold">
            Filter:
          </div>

          <button
            onClick={() => setActiveCodentionTab(ALL_MEMBERS_TAB_KEY)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeCodentionTab === ALL_MEMBERS_TAB_KEY
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All Members
          </button>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCodentionDragEnd}
          >
            <SortableContext
              items={uniqueCodentionsForTabs}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap gap-2">
                {uniqueCodentionsForTabs.map((codention) => (
                  <SortableCodentionTab
                    key={codention}
                    codention={codention}
                    isActive={activeCodentionTab === codention}
                    isDefault={settings?.defaultCodention === codention}
                    isDisabled={isMutating}
                    onSelect={setActiveCodentionTab}
                    onSetDefault={(nextCodention) =>
                      settingsMutation.mutate({
                        defaultCodention: nextCodention,
                      })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {!isLoading && !isError && displayedMembers.length > 1 && (
        <p className="mb-4 text-sm text-gray-500">
          Drag rows by the handle to save their display order for this view.
        </p>
      )}

      {isLoading && (
        <p className="text-center text-gray-500 py-4">Loading members...</p>
      )}

      {isError && !isLoading && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm"
          role="alert"
        >
          <strong className="font-bold">Loading Error: </strong>
          <span className="block sm:inline">
            {fetchError?.message || "Could not fetch members."}
          </span>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <div role="table" className="min-w-full">
              <div
                role="rowgroup"
                className="bg-gray-100 border-b border-gray-200"
              >
                <div role="row" className="flex items-center">
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.handle}`}
                  >
                    Move
                  </div>
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.image}`}
                  >
                    Image
                  </div>
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.name}`}
                  >
                    Name
                  </div>
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.codention}`}
                  >
                    Team / Codention
                  </div>
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.position}`}
                  >
                    Position
                  </div>
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.contact}`}
                  >
                    Contact
                  </div>
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.bio}`}
                  >
                    Bio
                  </div>
                  <div
                    role="columnheader"
                    className={`${headerCellClasses} ${columnStyles.actions}`}
                  >
                    Actions
                  </div>
                </div>
              </div>

              <div role="rowgroup" className="bg-white">
                {displayedMembers.length === 0 && (
                  <div role="row" className="flex">
                    <div
                      role="cell"
                      className="w-full text-center py-6 text-gray-500 border-b border-gray-200"
                    >
                      No board members found for this selection.
                    </div>
                  </div>
                )}
                {displayedMembers.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={displayedMembers.map((member) => member.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {displayedMembers.map((member, index) => (
                        <SortableDesktopMemberRow
                          key={member.id}
                          member={member}
                          index={index}
                          displayedMembersLength={displayedMembers.length}
                          openBios={openBios}
                          toggleBio={toggleBio}
                          handleEditClick={handleEditClick}
                          handleDeleteClick={handleDeleteClick}
                          isMutating={isMutating}
                          isFormOpen={isFormOpen}
                          editingMember={editingMember}
                          dataCellClasses={dataCellClasses}
                          columnStyles={columnStyles}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>

          <div className="md:hidden space-y-4">
            {displayedMembers.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No board members found for this selection.
              </p>
            )}
            {displayedMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white p-4 rounded-md shadow border"
              >
                <div className="flex items-center mb-3">
                  {member.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={member.name || "Member image"}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_IMAGE_URL;
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Img</span>
                    </div>
                  )}
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.position}</p>
                  </div>
                </div>
                <dl className="space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="font-medium">Team / Codention:</dt>
                    <dd>{member.codention || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Contact:</dt>
                    <dd>{member.contact || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Bio:</dt>
                    {member.bio ? (
                      <>
                        <button
                          onClick={() => toggleBio(member.id)}
                          className="ml-2 px-2 py-1 bg-black text-white text-xs rounded"
                        >
                          Bio
                        </button>
                        {openBios[member.id] && (
                          <dd className="mt-2 p-3 bg-gray-100 rounded-md text-gray-700 whitespace-pre-wrap">
                            {member.bio}
                          </dd>
                        )}
                      </>
                    ) : (
                      <dd>-</dd>
                    )}
                  </div>
                </dl>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => handleEditClick(member)}
                    disabled={isMutating || isFormOpen}
                    className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(member.id, member.name)}
                    disabled={
                      isMutating ||
                      (isFormOpen && editingMember?.id === member.id)
                    }
                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
