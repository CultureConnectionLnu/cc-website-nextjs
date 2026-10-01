"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PropTypes from "prop-types";

const fetchSponsors = async () => {
  const response = await fetch("/api/admin/sponsors");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch sponsors: ${response.statusText}`,
    );
  }
  return response.json();
};

const createSponsor = async (newSponsorData) => {
  const response = await fetch("/api/admin/sponsors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newSponsorData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to create sponsor: ${response.statusText}`,
    );
  }
  return response.json();
};

const updateSponsor = async (updatedSponsorData) => {
  const response = await fetch("/api/admin/sponsors", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedSponsorData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update sponsor: ${response.statusText}`,
    );
  }
  return response.json();
};

const deleteSponsor = async (sponsorId) => {
  const response = await fetch(`/api/admin/sponsors?id=${sponsorId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to delete sponsor: ${response.statusText}`,
    );
  }
  return response.json();
};

function SponsorForm({ initialData, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    websiteUrl: "",
    ...initialData,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded shadow-md border"
    >
      <h3 className="text-lg font-medium mb-4">
        {initialData ? "Edit Sponsor" : "Add New Sponsor"}
      </h3>
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Sponsor Name
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
          htmlFor="imageUrl"
          className="block text-sm font-medium text-gray-700"
        >
          Logo Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          id="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          placeholder="https://example.com/logo.png"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label
          htmlFor="websiteUrl"
          className="block text-sm font-medium text-gray-700"
        >
          Website URL (Optional)
        </label>
        <input
          type="url"
          name="websiteUrl"
          id="websiteUrl"
          value={formData.websiteUrl}
          onChange={handleChange}
          placeholder="https://example.com"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
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
              ? "Update Sponsor"
              : "Add Sponsor"}
        </button>
      </div>
    </form>
  );
}

SponsorForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
};

export default function SponsorManagement() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  const {
    data: sponsors = [],
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["sponsors"],
    queryFn: fetchSponsors,
  });

  const handleMutationSuccess = (action) => {
    console.log(`Sponsor ${action} successful`);
    queryClient.invalidateQueries({ queryKey: ["sponsors"] });
    setIsFormOpen(false);
    setEditingSponsor(null);
    setGeneralError(null);
  };

  const handleMutationError = (error, action) => {
    console.error(`Error ${action} sponsor:`, error);
    setGeneralError(
      error.message || `An error occurred while ${action} sponsor.`,
    );
  };

  const createMutation = useMutation({
    mutationFn: createSponsor,
    onSuccess: () => handleMutationSuccess("creation"),
    onError: (error) => handleMutationError(error, "creating"),
  });

  const updateMutation = useMutation({
    mutationFn: updateSponsor,
    onSuccess: () => handleMutationSuccess("update"),
    onError: (error) => handleMutationError(error, "updating"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSponsor,
    onSuccess: () => handleMutationSuccess("deletion"),
    onError: (error) => handleMutationError(error, "deleting"),
  });

  const handleAddClick = () => {
    setEditingSponsor(null);
    setIsFormOpen(true);
    setGeneralError(null);
  };

  const handleEditClick = (sponsor) => {
    setEditingSponsor(sponsor);
    setIsFormOpen(true);
    setGeneralError(null);
  };

  const handleDeleteClick = (sponsorId, sponsorName) => {
    if (
      window.confirm(
        `Are you sure you want to delete sponsor "${sponsorName}"?`,
      )
    ) {
      setGeneralError(null);
      deleteMutation.mutate(sponsorId);
    }
  };

  const handleFormSubmit = (formData) => {
    setGeneralError(null);
    if (editingSponsor) {
      updateMutation.mutate({ ...formData, id: editingSponsor.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSponsor(null);
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="bg-gray-50 p-4 rounded border mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Manage Sponsors</h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
          disabled={isMutating || isFormOpen}
        >
          Add New Sponsor
        </button>
      </div>

      {generalError && (
        <p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
          Error: {generalError}
        </p>
      )}

      {isFormOpen && (
        <div className="my-6">
          <SponsorForm
            initialData={editingSponsor}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}

      {isLoading && <p>Loading sponsors...</p>}

      {isError && !isLoading && (
        <p className="text-red-500">
          Error loading sponsors: {fetchError?.message}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Logo
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Website
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sponsors.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No sponsors found.
                  </td>
                </tr>
              )}
              {sponsors.map((sponsor) => (
                <tr key={sponsor.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {sponsor.id}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {sponsor.imageUrl ? (
                      <img
                        src={sponsor.imageUrl}
                        alt={`${sponsor.name} logo`}
                        className="h-10 w-auto max-w-[100px] object-contain"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No Logo</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sponsor.name}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {sponsor.websiteUrl ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-[200px] inline-block"
                        title={sponsor.websiteUrl}
                      >
                        {sponsor.websiteUrl}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditClick(sponsor)}
                      disabled={isMutating || isFormOpen}
                      className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteClick(sponsor.id, sponsor.name)
                      }
                      disabled={isMutating}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
