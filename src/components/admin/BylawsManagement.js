"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TipTapToolbar from "../TipTapToolbar";

const fetchBylaws = async () => {
  const response = await fetch("/api/admin/bylaws");
  if (!response.ok) throw new Error("Failed to fetch bylaws");
  return response.json();
};

const updateBylaws = async (updatedData) => {
  const response = await fetch("/api/admin/bylaws", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedData),
  });
  if (!response.ok) throw new Error("Failed to update bylaws");
  return response.json();
};

const fetchPropositions = async () => {
  const response = await fetch("/api/propositions");
  if (!response.ok) throw new Error("Failed to fetch propositions");
  return response.json();
};

const markPropositionAsViewed = async (id) => {
  const response = await fetch("/api/propositions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status: "viewed" }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to update proposition");
  }

  return response.json();
};

const deleteProposition = async (id) => {
  const response = await fetch("/api/propositions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to delete proposition");
  }

  return response.json();
};

const TipTapEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: true, heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      TextStyle,
      Color,
    ],
    content: content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none p-3 border border-t-0 border-gray-300 rounded-b-md min-h-[150px] bg-white",
      },
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable && editor.getHTML() !== content) {
      setTimeout(() => editor.commands.setContent(content, false), 0);
    }
  }, [content, editor]);

  return (
    <div>
      <TipTapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default function BylawsManagement() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.admin === true;

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("bylaws");
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState([]);
  const [generalError, setGeneralError] = useState(null);
  const [propositionActionError, setPropositionActionError] = useState(null);

  const sectionRefs = useRef({});
  const localIdPrefix = useId();

  const { data: bylaws = [], isLoading: loadingBylaws } = useQuery({
    queryKey: ["bylaws"],
    queryFn: fetchBylaws,
    onSuccess: (data) => {
      const safeData = Array.isArray(data) ? data : [];
      if (safeData.length > 0 && !activeSectionId)
        setActiveSectionId(safeData[0].id);
      setEditData(JSON.parse(JSON.stringify(safeData)));
    },
    enabled: !isEditing && activeTab === "bylaws",
  });

  const { data: propositions = [], isLoading: loadingProps } = useQuery({
    queryKey: ["propositions"],
    queryFn: fetchPropositions,
    enabled: activeTab === "propositions" && isAdmin,
  });

  const mutation = useMutation({
    mutationFn: updateBylaws,
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["bylaws"], updatedData);
      setIsEditing(false);
      setGeneralError(null);
    },
    onError: (error) => setGeneralError(error.message),
  });

  const markViewedMutation = useMutation({
    mutationFn: markPropositionAsViewed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propositions"] });
      setPropositionActionError(null);
    },
    onError: (error) => setPropositionActionError(error.message),
  });

  const deletePropositionMutation = useMutation({
    mutationFn: deleteProposition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propositions"] });
      setPropositionActionError(null);
    },
    onError: (error) => setPropositionActionError(error.message),
  });

  const handleEditToggle = () => {
    if (!isEditing) setEditData(JSON.parse(JSON.stringify(bylaws || [])));
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = () => {
    if (editData.some((s) => !s.title.trim()))
      return setGeneralError("All sections need a title.");
    mutation.mutate(editData);
  };

  const sortedPropositions = [...propositions].sort((a, b) => {
    return (
      new Date(b.submittedAt || b.createdAt || 0) -
      new Date(a.submittedAt || a.createdAt || 0)
    );
  });

  if (activeTab === "propositions") {
    return (
      <div className="bg-gray-50 p-4 rounded border mt-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">
            Member Propositions
          </h2>
          <button
            onClick={() => setActiveTab("bylaws")}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
          >
            Back to Bylaws
          </button>
        </div>

        {loadingProps ? (
          <p>Loading propositions...</p>
        ) : propositions.length === 0 ? (
          <p className="text-gray-500">
            No propositions have been submitted yet.
          </p>
        ) : (
          <div className="space-y-4">
            {propositionActionError && (
              <p className="text-sm text-red-600 bg-red-100 border border-red-300 rounded p-2">
                {propositionActionError}
              </p>
            )}
            {sortedPropositions.map((prop) => (
              <div
                key={prop.id}
                className="p-4 bg-white border rounded shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-blue-100 text-blue-800 mr-2">
                      {prop.type === "new" ? "New Section" : "Edit Request"}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase px-2 py-1 rounded mr-2 ${
                        prop.status === "viewed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {prop.status === "viewed" ? "Viewed" : "Pending"}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {prop.sectionTitle}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(
                      prop.submittedAt || prop.createdAt,
                    ).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Submitted by:{" "}
                  <strong>
                    {prop.userFullName || prop.userName || "Unknown Member"}
                  </strong>
                </p>
                <div className="p-3 bg-gray-50 border rounded text-sm text-gray-800 whitespace-pre-wrap">
                  {prop.content}
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  {prop.status !== "viewed" && (
                    <button
                      onClick={() => markViewedMutation.mutate(prop.id)}
                      disabled={
                        markViewedMutation.isPending ||
                        deletePropositionMutation.isPending
                      }
                      className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {markViewedMutation.isPending &&
                      markViewedMutation.variables === prop.id
                        ? "Saving..."
                        : "Mark Viewed"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (
                        window.confirm("Delete this proposition permanently?")
                      ) {
                        deletePropositionMutation.mutate(prop.id);
                      }
                    }}
                    disabled={
                      markViewedMutation.isPending ||
                      deletePropositionMutation.isPending
                    }
                    className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletePropositionMutation.isPending &&
                    deletePropositionMutation.variables === prop.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isEditing && isAdmin) {
    return (
      <div className="bg-gray-50 p-4 rounded border mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Edit Bylaws</h2>
          <div className="space-x-2">
            <button
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
            >
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
        {generalError && (
          <p className="text-red-600 bg-red-100 border-red-400 rounded p-2 my-2 text-sm">
            {generalError}
          </p>
        )}
        {editData.map((section, index) => (
          <div
            key={section.id || index}
            className="mb-8 p-4 border rounded-md bg-white shadow-sm"
          >
            <input
              type="text"
              value={section.title}
              onChange={(e) => {
                const updated = [...editData];
                updated[index].title = e.target.value;
                setEditData(updated);
              }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm mb-3 font-bold"
            />
            <TipTapEditor
              content={section.content}
              onChange={(newContent) => {
                const updated = [...editData];
                updated[index].content = newContent;
                setEditData(updated);
              }}
            />
            <button
              onClick={() =>
                setEditData(editData.filter((_, i) => i !== index))
              }
              className="mt-3 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium"
            >
              Delete Section
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setEditData([
              ...editData,
              { id: `new-${Date.now()}`, title: "New Section", content: "" },
            ])
          }
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
        >
          + Add New Section
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded border mt-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-2xl font-semibold text-gray-800">
          Association Bylaws
        </h2>
        {isAdmin && (
          <div className="space-x-2">
            <button
              onClick={() => setActiveTab("propositions")}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
            >
              View Propositions
            </button>
            <button
              onClick={handleEditToggle}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Edit Bylaws
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-1/4 lg:w-1/5 p-4 border rounded-md bg-white shadow max-h-[80vh] overflow-y-auto">
          <ul className="space-y-2">
            {bylaws.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSectionId === section.id
                      ? "bg-purple-100 text-purple-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="md:w-3/4 lg:w-4/5 p-4 border rounded-md bg-white shadow min-h-[60vh] max-h-[80vh] overflow-y-auto">
          {bylaws.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => (sectionRefs.current[section.id] = el)}
              className="mb-8 scroll-mt-20"
            >
              <h3 className="text-xl font-bold text-purple-700 mb-3 pb-2 border-b border-purple-200">
                {section.title}
              </h3>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
