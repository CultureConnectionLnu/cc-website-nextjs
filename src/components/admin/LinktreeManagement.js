"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LinkTreeEditor from "./LinkTreeEditor";

const fetchLinks = async () => {
  const response = await fetch("/api/admin/linktree");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch links: ${response.statusText}`,
    );
  }
  return response.json();
};

const updateLinks = async (updatedLinksList) => {
  const response = await fetch("/api/admin/linktree", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedLinksList),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update links: ${response.statusText}`,
    );
  }
  return response.json();
};

export default function LinktreeManagement() {
  const queryClient = useQueryClient();

  const [newLink, setNewLink] = useState({
    color: "bg-gray-200",
    text: "",
    link: "",
    textColor: "text-black",
    isEnabled: true,
  });
  const [editIndex, setEditIndex] = useState(null);
  const [editedLink, setEditedLink] = useState(null);
  const [showHexColorPicker, setShowHexColorPicker] = useState(false);
  const [showRecommendedColorPicker, setShowRecommendedColorPicker] =
    useState(false);
  const [generalError, setGeneralError] = useState(null);

  const {
    data: links = [],
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["linktreeLinks"],
    queryFn: fetchLinks,
  });

  const mutation = useMutation({
    mutationFn: updateLinks,
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["linktreeLinks"], updatedData);
      setNewLink({
        color: "bg-gray-200",
        text: "",
        link: "",
        textColor: "text-black",
        isEnabled: true,
      });
      setEditIndex(null);
      setEditedLink(null);
      setShowHexColorPicker(false);
      setShowRecommendedColorPicker(false);
      setGeneralError(null);
      console.log("Links updated successfully");
    },
    onError: (error) => {
      console.error("Error updating links:", error);
      setGeneralError(error.message || "Failed to update links.");
    },
  });

  const handleAddLink = () => {
    if (!newLink.text || !newLink.link) {
      alert("Please provide text and a link for the new button.");
      return;
    }
    const updatedList = [...links, newLink];
    setGeneralError(null);
    mutation.mutate(updatedList);
  };

  const handleEditLink = (index) => {
    if (editIndex === index) {
      setEditIndex(null);
      setEditedLink(null);
    } else {
      setEditIndex(index);
      setEditedLink({ ...links[index] });
    }
  };

  const handleSaveEdit = () => {
    if (!editedLink || editIndex === null) return;
    if (!editedLink.text || !editedLink.link) {
      alert("Please provide text and a link.");
      return;
    }
    const updatedList = links.map((link, idx) =>
      idx === editIndex ? editedLink : link,
    );
    setGeneralError(null);
    mutation.mutate(updatedList);
  };

  const handleDeleteLink = (indexToDelete) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${links[indexToDelete].text}"?`,
      )
    ) {
      const updatedList = links.filter((_, index) => index !== indexToDelete);
      setGeneralError(null);
      mutation.mutate(updatedList);
    }
  };

  const handleToggleEnable = (indexToToggle) => {
    const updatedList = links.map((link, index) => {
      if (index === indexToToggle) {
        return { ...link, isEnabled: !link.isEnabled };
      }
      return link;
    });
    setGeneralError(null);
    if (editIndex === indexToToggle && editedLink) {
      setEditedLink((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
    }
    mutation.mutate(updatedList);
  };

  const handleMove = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= links.length) return;

    const updatedList = [...links];
    [updatedList[index], updatedList[newIndex]] = [
      updatedList[newIndex],
      updatedList[index],
    ];
    setGeneralError(null);

    if (editIndex === index) setEditIndex(newIndex);
    else if (editIndex === newIndex) setEditIndex(index);
    else setEditIndex(null);

    mutation.mutate(updatedList);
  };

  const handleMoveUp = (index) => handleMove(index, "up");
  const handleMoveDown = (index) => handleMove(index, "down");

  return (
    <div className="bg-gray-50 p-4 rounded border mt-6">
      <h2 className="text-xl text-center font-semibold mb-3 text-gray-800">
        Manage Linktree Links
      </h2>

      {generalError && (
        <p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
          Error: {generalError}
        </p>
      )}
      {mutation.isPending && (
        <p className="text-blue-600 bg-blue-100 p-2 my-2 text-sm rounded">
          Saving changes...
        </p>
      )}

      {isLoading && <p>Loading links...</p>}
      {isError && !isLoading && (
        <p className="text-red-500">
          Error loading links: {fetchError?.message}
        </p>
      )}

      {!isLoading && !isError && Array.isArray(links) && (
        <LinkTreeEditor
          links={links}
          newLink={newLink}
          setNewLink={setNewLink}
          editIndex={editIndex}
          editedLink={editedLink}
          setEditedLink={setEditedLink}
          showHexColorPicker={showHexColorPicker}
          setShowHexColorPicker={setShowHexColorPicker}
          showRecommendedColorPicker={showRecommendedColorPicker}
          setShowRecommendedColorPicker={setShowRecommendedColorPicker}
          handleAddLink={handleAddLink}
          handleEditLink={handleEditLink}
          handleSaveEdit={handleSaveEdit}
          handleDeleteLink={handleDeleteLink}
          handleToggleEnable={handleToggleEnable}
          handleMoveUp={handleMoveUp}
          handleMoveDown={handleMoveDown}
          isSaving={mutation.isPending}
        />
      )}
    </div>
  );
}
