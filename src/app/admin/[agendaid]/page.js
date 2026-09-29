"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";

import Header from "@/components/Header";

const agendaShortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatAgendaShortDate = (dateValue) => {
  if (!dateValue) {
    return "dd/mm/yyyy";
  }

  const parsedDate = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "dd/mm/yyyy";
  }

  return agendaShortDateFormatter.format(parsedDate);
};

const fetchAgendas = async () => {
  const response = await fetch("/api/admin/agendas");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch agendas: ${response.statusText}`,
    );
  }

  return response.json();
};

const updateAgendas = async (updatedData) => {
  const response = await fetch("/api/admin/agendas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update agendas: ${response.statusText}`,
    );
  }

  return response.json();
};

const submitAgendaTopics = async ({ agendaId, topics }) => {
  const response = await fetch(`/api/admin/agendas/${agendaId}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topics }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to submit topics: ${response.statusText}`,
    );
  }

  return response.json();
};

const createTopicId = () =>
  `agenda-topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function AgendaTopicApplicationPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();

  const agendaId = Array.isArray(params?.agendaid)
    ? params.agendaid[0]
    : params?.agendaid;

  const isAdmin = user?.publicMetadata?.admin === true;
  const isCommitteeMember = user?.publicMetadata?.committee === true;
  const canAccessPage = isAdmin || isCommitteeMember;

  const [newTopics, setNewTopics] = useState([""]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !canAccessPage)) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, canAccessPage, router]);

  const {
    data: agendas = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agendas", "topic-application-page"],
    queryFn: fetchAgendas,
    enabled: isLoaded && isSignedIn && canAccessPage,
  });

  const selectedAgenda = useMemo(
    () => agendas.find((agenda) => agenda.id === agendaId) || null,
    [agendas, agendaId],
  );

  const mutation = useMutation({
    mutationFn: submitAgendaTopics,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agendas"] }),
        queryClient.invalidateQueries({
          queryKey: ["agendas", "topic-application-page"],
        }),
      ]);
      setNewTopics([""]);
      setSuccessMessage("Topics successfully submitted!");
    },
    onError: () => {
      setSuccessMessage("");
    },
  });
  const removeMutation = useMutation({
    mutationFn: updateAgendas,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agendas"] }),
        queryClient.invalidateQueries({
          queryKey: ["agendas", "topic-application-page"],
        }),
      ]);
      setSuccessMessage("Topic removed.");
    },
    onError: () => {
      setSuccessMessage("");
    },
  });

  if (!isLoaded || (isSignedIn && canAccessPage && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading topic application...
      </div>
    );
  }

  if (!isSignedIn || !canAccessPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Access Denied.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Header />
      <div className="mx-auto mt-10 max-w-4xl rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-700">
              Submit Topics for Agenda
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Add topics for the{" "}
              <span className="font-semibold text-gray-900">
                {selectedAgenda
                  ? formatAgendaShortDate(selectedAgenda.date)
                  : "selected"}
              </span>{" "}
              meeting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Admin
          </button>
        </div>

        {isError ? (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error?.message || "Could not load the selected agenda."}
          </p>
        ) : null}

        {!isError && !selectedAgenda ? (
          <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-center">
            <p className="text-sm text-gray-600">
              This agenda could not be found.
            </p>
          </div>
        ) : null}

        {selectedAgenda ? (
          <>
            {successMessage ? (
              <p className="mt-6 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </p>
            ) : null}

            {mutation.error || removeMutation.error ? (
              <p className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {mutation.error?.message ||
                  removeMutation.error?.message ||
                  "Could not update topics."}
              </p>
            ) : null}

            <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Already Submitted Topics
                  </h2>
                  <p className="text-sm text-gray-600">
                    Review existing submissions first to avoid duplicates.
                  </p>
                </div>
                <span className="text-sm font-medium text-purple-700">
                  {(selectedAgenda.Topics || []).length} submitted
                </span>
              </div>

              {!selectedAgenda.Topics || selectedAgenda.Topics.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                  No topics have been submitted yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {selectedAgenda.Topics.map((topicItem, index) => (
                    <li
                      key={topicItem.id || index}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">
                            Suggested by: {topicItem.userid || "Unknown Member"}
                          </div>
                          {isAdmin ? (
                            <button
                              type="button"
                              disabled={
                                removeMutation.isPending || mutation.isPending
                              }
                              onClick={() => {
                                if (!selectedAgenda) {
                                  return;
                                }

                                const shouldRemove =
                                  window.confirm("Remove this topic?");

                                if (!shouldRemove) {
                                  return;
                                }

                                const updatedAgenda = {
                                  ...selectedAgenda,
                                  Topics: (selectedAgenda.Topics || []).filter(
                                    (topic) => topic.id !== topicItem.id,
                                  ),
                                };
                                const updatedAgendas = agendas.map((agenda) =>
                                  agenda.id === updatedAgenda.id
                                    ? updatedAgenda
                                    : agenda,
                                );
                                removeMutation.mutate(updatedAgendas);
                              }}
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                            topicItem.completed
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {topicItem.completed ? "Completed" : "Open"}
                        </span>
                      </div>
                      <div
                        className={`mt-3 whitespace-pre-wrap break-all text-sm ${
                          topicItem.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-800"
                        }`}
                      >
                        {topicItem.topic}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-6 space-y-4">
              {newTopics.map((topicContent, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Topic {index + 1}
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={topicContent}
                      onChange={(event) => {
                        const updatedTopics = [...newTopics];
                        updatedTopics[index] = event.target.value;
                        setNewTopics(updatedTopics);
                      }}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                      placeholder="Describe your topic..."
                    />
                    {newTopics.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setNewTopics(
                            newTopics.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        className="px-2 text-red-500 hover:text-red-700"
                      >
                        &times;
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setNewTopics([...newTopics, ""])}
                className="text-sm font-semibold text-purple-600 hover:text-purple-800"
              >
                + Add another topic
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  mutation.isPending ||
                  removeMutation.isPending ||
                  !newTopics.some((topic) => topic.trim())
                }
                onClick={() => {
                  const validTopics = newTopics.filter((topic) => topic.trim());
                  if (!validTopics.length || !selectedAgenda) {
                    return;
                  }

                  const userName = user?.firstName
                    ? `${user.firstName} ${user.lastName || ""}`.trim()
                    : "Board Member";

                  const topics = validTopics.map((content) => ({
                    id: createTopicId(),
                    userid: userName,
                    topic: content.trim(),
                    completed: null,
                  }));

                  mutation.mutate({
                    agendaId: selectedAgenda.id,
                    topics,
                  });
                }}
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {mutation.isPending ? "Submitting..." : "Submit Topics"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
