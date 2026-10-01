"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import { useReactToPrint } from "react-to-print";

import "react-datepicker/dist/react-datepicker.css";

const agendaDocumentFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const agendaShortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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

const fetchAdminUsers = async () => {
  const response = await fetch("/api/admin/users");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch users: ${response.statusText}`,
    );
  }
  return response.json();
};

const fetchAttendanceTemplates = async () => {
  const response = await fetch("/api/admin/agenda-attendance-templates");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        `Failed to fetch attendance templates: ${response.statusText}`,
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

const updateAttendanceTemplates = async (updatedTemplates) => {
  const response = await fetch("/api/admin/agenda-attendance-templates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedTemplates),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        `Failed to update attendance templates: ${response.statusText}`,
    );
  }

  return response.json();
};

const createAgendaId = () =>
  `agenda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createTopicId = () =>
  `agenda-topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createAttendanceTemplateId = () =>
  `attendance-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatAgendaDate = (dateValue) => {
  if (!dateValue) {
    return "Day Month, Year";
  }

  const parsedDate = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Day Month, Year";
  }

  return agendaDocumentFormatter.format(parsedDate);
};

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

const formatAgendaTitle = (dateValue) =>
  `Agenda ${formatAgendaDate(dateValue)}`;

const DEFAULT_AGENDA_LABELS = {
  meetingInitiation: "Meeting initiation",
  boardMembersMeetUp: "Board members meet up",
  meetingConcludes: "Meeting concludes",
  nextMeetingDate: "Next date for meeting",
  topicsForNextMeeting: "Topics for next meeting",
};

const normalizeAgendaLabels = (labels) => {
  const safeLabels =
    labels && typeof labels === "object" && !Array.isArray(labels)
      ? labels
      : {};

  return Object.fromEntries(
    Object.entries(DEFAULT_AGENDA_LABELS).map(([key, fallbackValue]) => [
      key,
      typeof safeLabels[key] === "string" && safeLabels[key].trim()
        ? safeLabels[key]
        : fallbackValue,
    ]),
  );
};

const getAgendaLabel = (agenda, key) =>
  normalizeAgendaLabels(agenda?.customLabels)[key];

const PRINT_PAGE_ITEM_CAPACITY = 24;

const normalizePrintableText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
};

const formatMeetingDuration = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return "00:00";
  }

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  if (
    [startHours, startMinutes, endHours, endMinutes].some((value) =>
      Number.isNaN(value),
    )
  ) {
    return "00:00";
  }

  const startTotalMinutes = startHours * 60 + startMinutes;
  let endTotalMinutes = endHours * 60 + endMinutes;

  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  const durationInMinutes = endTotalMinutes - startTotalMinutes;
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const normalizeTimeInputValue = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const coerceTimeValue = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = normalizeTimeInputValue(value.trim());
  return /^\d{2}:\d{2}$/.test(normalizedValue) ? normalizedValue : "";
};

const normalizeComparableName = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isValid24HourTime = (value) => {
  const coercedValue = coerceTimeValue(value);

  if (!coercedValue) {
    return false;
  }

  const [hours, minutes] = coercedValue.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

const finalizeTimeInputValue = (value) => {
  const normalizedValue = coerceTimeValue(value);
  return isValid24HourTime(normalizedValue) ? normalizedValue : "";
};

const estimateTextUnits = (value, charsPerLine = 85) => {
  const normalizedValue = normalizePrintableText(value);

  if (!normalizedValue) {
    return 1;
  }

  return Math.max(
    1,
    normalizedValue
      .split("\n")
      .reduce(
        (total, line) =>
          total + Math.max(1, Math.ceil(line.trim().length / charsPerLine)),
        0,
      ),
  );
};

const getAgendaPrintItems = (agenda) => [
  ...(normalizePrintableText(agenda.meetingInitiation)
    ? [
        {
          type: "field",
          key: "meetingInitiation",
          label: getAgendaLabel(agenda, "meetingInitiation"),
          value: normalizePrintableText(agenda.meetingInitiation),
        },
      ]
    : []),
  ...(normalizePrintableText(agenda.boardMembersMeetUp)
    ? [
        {
          type: "field",
          key: "boardMembersMeetUp",
          label: getAgendaLabel(agenda, "boardMembersMeetUp"),
          value: normalizePrintableText(agenda.boardMembersMeetUp),
        },
      ]
    : []),
  {
    type: "timeSummary",
    key: "meetingTimeSummary",
  },
  ...agenda.topics
    .map((topic, index) => ({
      type: "topic",
      key: topic.id || `topic-${index}`,
      topic: {
        ...topic,
        content: normalizePrintableText(topic.content),
        voting: topic.voting
          ? {
              ...topic.voting,
              reason: normalizePrintableText(topic.voting.reason),
            }
          : topic.voting,
      },
      fallbackIndex: index,
    }))
    .filter(
      ({ topic }) =>
        topic.content ||
        topic.voting?.enabled ||
        (typeof topic.label === "string" && topic.label.trim()),
    ),
  ...(normalizePrintableText(agenda.meetingConcludes)
    ? [
        {
          type: "field",
          key: "meetingConcludes",
          label: getAgendaLabel(agenda, "meetingConcludes"),
          value: normalizePrintableText(agenda.meetingConcludes),
        },
      ]
    : []),
  ...(normalizePrintableText(agenda.nextMeetingDate)
    ? [
        {
          type: "field",
          key: "nextMeetingDate",
          label: getAgendaLabel(agenda, "nextMeetingDate"),
          value: normalizePrintableText(agenda.nextMeetingDate),
        },
      ]
    : []),
  ...(normalizePrintableText(agenda.topicsForNextMeeting)
    ? [
        {
          type: "field",
          key: "topicsForNextMeeting",
          label: getAgendaLabel(agenda, "topicsForNextMeeting"),
          value: normalizePrintableText(agenda.topicsForNextMeeting),
        },
      ]
    : []),
];

const getAgendaPrintItemUnits = (item) => {
  if (item.type === "timeSummary") {
    return 4;
  }

  if (item.type === "field") {
    return 3 + estimateTextUnits(item.value, 95);
  }

  if (item.type === "topic") {
    const { topic } = item;
    let totalUnits = 4 + estimateTextUnits(topic.content, 90);

    if (topic.voting?.enabled) {
      totalUnits += 4;
      totalUnits += estimateTextUnits(topic.voting.reason, 85);
      totalUnits += Math.max(
        1,
        Math.ceil((topic.voting.approve || []).join(", ").length / 55),
      );
      totalUnits += Math.max(
        1,
        Math.ceil((topic.voting.disapprove || []).join(", ").length / 55),
      );
      totalUnits += Math.max(
        1,
        Math.ceil((topic.voting.abstain || []).join(", ").length / 55),
      );
    }

    return totalUnits;
  }

  return 1;
};

const paginateAgendaPrintItems = (items) => {
  if (!items.length) {
    return [];
  }

  const pages = [];
  let currentPage = [];
  let currentUnits = 0;

  items.forEach((item) => {
    const itemUnits = getAgendaPrintItemUnits(item);

    if (
      currentPage.length > 0 &&
      currentUnits + itemUnits > PRINT_PAGE_ITEM_CAPACITY
    ) {
      pages.push(currentPage);
      currentPage = [];
      currentUnits = 0;
    }

    currentPage.push(item);
    currentUnits += itemUnits;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

const toInputDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeTopic = (topic, index = 0) => {
  if (typeof topic === "string") {
    return {
      id: createTopicId(),
      label: `Topic ${index + 1}`,
      content: topic,
    };
  }

  const safeTopic =
    topic && typeof topic === "object" && !Array.isArray(topic) ? topic : {};

  return {
    id:
      typeof safeTopic.id === "string" && safeTopic.id.trim()
        ? safeTopic.id
        : createTopicId(),
    label:
      typeof safeTopic.label === "string" && safeTopic.label.trim()
        ? safeTopic.label
        : `Topic ${index + 1}`,
    content: typeof safeTopic.content === "string" ? safeTopic.content : "",
    voting: {
      enabled:
        safeTopic.voting && typeof safeTopic.voting === "object"
          ? safeTopic.voting.enabled === true
          : false,
      reason:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        typeof safeTopic.voting.reason === "string"
          ? safeTopic.voting.reason
          : "",
      approve:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        Array.isArray(safeTopic.voting.approve)
          ? safeTopic.voting.approve.filter(
              (member) => typeof member === "string",
            )
          : [],
      disapprove:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        Array.isArray(safeTopic.voting.disapprove)
          ? safeTopic.voting.disapprove.filter(
              (member) => typeof member === "string",
            )
          : [],
      abstain:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        Array.isArray(safeTopic.voting.abstain)
          ? safeTopic.voting.abstain.filter(
              (member) => typeof member === "string",
            )
          : [],
    },
  };
};

const createEmptyTopic = (index) => ({
  id: createTopicId(),
  label: `Topic ${index + 1}`,
  content: "",
  voting: {
    enabled: false,
    reason: "",
    approve: [],
    disapprove: [],
    abstain: [],
  },
});

const ensureTopicList = (topics) => {
  return Array.isArray(topics)
    ? topics.slice(0, 20).map((topic, index) => normalizeTopic(topic, index))
    : [];
};

const normalizeAttendanceTemplate = (template, index = 0) => {
  const safeTemplate =
    template && typeof template === "object" && !Array.isArray(template)
      ? template
      : {};

  return {
    id:
      typeof safeTemplate.id === "string" && safeTemplate.id.trim()
        ? safeTemplate.id
        : `${createAttendanceTemplateId()}-${index}`,
    name: typeof safeTemplate.name === "string" ? safeTemplate.name : "",
    members: Array.isArray(safeTemplate.members)
      ? safeTemplate.members.filter((member) => typeof member === "string")
      : [],
  };
};

const normalizeAttendanceTemplates = (templates) => {
  if (!Array.isArray(templates)) {
    return [];
  }

  return templates
    .map((template, index) => normalizeAttendanceTemplate(template, index))
    .filter((template) => template.name.trim());
};

const normalizeAgendaSignatures = (signatures) => {
  const safeSignatures =
    signatures && typeof signatures === "object" && !Array.isArray(signatures)
      ? signatures
      : {};

  return {
    secretarySigned: safeSignatures.secretarySigned === true,
    secretarySignedBy:
      typeof safeSignatures.secretarySignedBy === "string"
        ? safeSignatures.secretarySignedBy
        : "",
    secretarySignedAt:
      typeof safeSignatures.secretarySignedAt === "string"
        ? safeSignatures.secretarySignedAt
        : "",
    minuteCheckerSigned: safeSignatures.minuteCheckerSigned === true,
    minuteCheckerSignedBy:
      typeof safeSignatures.minuteCheckerSignedBy === "string"
        ? safeSignatures.minuteCheckerSignedBy
        : "",
    minuteCheckerSignedAt:
      typeof safeSignatures.minuteCheckerSignedAt === "string"
        ? safeSignatures.minuteCheckerSignedAt
        : "",
  };
};

const normalizeAgenda = (agenda, index = 0) => {
  const safeAgenda =
    agenda && typeof agenda === "object" && !Array.isArray(agenda)
      ? agenda
      : {};
  const date = typeof safeAgenda.date === "string" ? safeAgenda.date : "";
  const legacyPresent =
    typeof safeAgenda.present === "string" ? safeAgenda.present : "";
  const presentMembers = Array.isArray(safeAgenda.presentMembers)
    ? safeAgenda.presentMembers.filter((member) => typeof member === "string")
    : legacyPresent
      ? legacyPresent
          .split(/\n|,/)
          .map((member) => member.trim())
          .filter(Boolean)
      : [];
  const minuteChecker =
    typeof safeAgenda.minuteChecker === "string"
      ? safeAgenda.minuteChecker
      : typeof safeAgenda.minuteValidator === "string"
        ? safeAgenda.minuteValidator
        : "";

  return {
    id:
      typeof safeAgenda.id === "string" && safeAgenda.id.trim()
        ? safeAgenda.id
        : `agenda-${index}`,
    date,
    title: formatAgendaTitle(date),
    customLabels: normalizeAgendaLabels(safeAgenda.customLabels),
    presentMembers,
    additionalNotes:
      typeof safeAgenda.additionalNotes === "string"
        ? safeAgenda.additionalNotes
        : "",
    chairman:
      typeof safeAgenda.chairman === "string" ? safeAgenda.chairman : "",
    secretary:
      typeof safeAgenda.secretary === "string" ? safeAgenda.secretary : "",
    minuteChecker,
    meetingInitiation:
      typeof safeAgenda.meetingInitiation === "string"
        ? safeAgenda.meetingInitiation
        : "",
    boardMembersMeetUp:
      typeof safeAgenda.boardMembersMeetUp === "string"
        ? safeAgenda.boardMembersMeetUp
        : "",
    meetingStartTime:
      typeof safeAgenda.meetingStartTime === "string"
        ? safeAgenda.meetingStartTime
        : "",
    meetingEndTime:
      typeof safeAgenda.meetingEndTime === "string"
        ? safeAgenda.meetingEndTime
        : "",
    topics: ensureTopicList(safeAgenda.topics),
    meetingConcludes:
      typeof safeAgenda.meetingConcludes === "string"
        ? safeAgenda.meetingConcludes
        : "",
    nextMeetingDate:
      typeof safeAgenda.nextMeetingDate === "string"
        ? safeAgenda.nextMeetingDate
        : "",
    topicsForNextMeeting:
      typeof safeAgenda.topicsForNextMeeting === "string"
        ? safeAgenda.topicsForNextMeeting
        : "",
    isCompleted: safeAgenda.isCompleted === true,
    completedAt:
      typeof safeAgenda.completedAt === "string" ? safeAgenda.completedAt : "",
    signatures: normalizeAgendaSignatures(safeAgenda.signatures),
    Topics: Array.isArray(safeAgenda.Topics)
      ? safeAgenda.Topics.map((topic) => ({
          id: topic.id || createTopicId(),
          userid: topic.userid || "Unknown",
          topic: topic.topic || "",
          completed: topic.completed || null,
        }))
      : [],
    appliedTopics: Array.isArray(safeAgenda.appliedTopics)
      ? safeAgenda.appliedTopics
      : [],
  };
};

const normalizeAgendas = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((agenda, index) => normalizeAgenda(agenda, index))
    .sort((left, right) => right.date.localeCompare(left.date));
};

const createAgendaFromDate = (dateValue) =>
  normalizeAgenda({
    id: createAgendaId(),
    date: dateValue,
  });

const createPreviewPlaceholderAgenda = () =>
  normalizeAgenda({
    id: "agenda-preview-placeholder",
    date: "",
  });

const cloneAgenda = (agenda) =>
  normalizeAgenda(JSON.parse(JSON.stringify(agenda)));

const AgendaPage = ({
  dateValue,
  children,
  pageLabel,
  footer,
  pinFooter = false,
}) => (
  <section
    className={`agenda-print-page rounded-[28px] border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-10 ${
      pinFooter ? "agenda-print-footer-page flex flex-col" : ""
    }`}
  >
    <div className="relative mb-8 min-h-[128px] pl-28 sm:pl-36">
      <img
        src="/cc.svg"
        alt="Culture Connection logo"
        className="absolute left-0 top-0 h-32 w-32 object-contain"
      />
      <div className="grid grid-cols-[1fr_72px] items-start gap-4">
        <div className="text-center">
          <h3 className="font-Header text-4xl font-bold leading-none text-gray-900 sm:text-5xl">
            Culture Connection Agenda
          </h3>
          <div className="mt-2 text-sm font-semibold tracking-[0.2em] text-gray-500">
            {formatAgendaShortDate(dateValue)}
          </div>
        </div>
        <span className="justify-self-end rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
          {pageLabel}
        </span>
      </div>
    </div>
    <div className={pinFooter ? "agenda-print-content" : ""}>{children}</div>
    {footer ? (
      <div className={pinFooter ? "agenda-print-footer mt-auto" : ""}>
        {footer}
      </div>
    ) : null}
  </section>
);

const VotePatternButton = ({ templates, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={templates.length === 0}
        className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Saved patterns
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 min-w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          {templates.length === 0 ? (
            <div className="px-2 py-1 text-xs text-gray-500">
              No saved patterns yet.
            </div>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onApply(template.id);
                  setIsOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {template.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

const EditableSectionTitle = ({ title, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(title);

  useEffect(() => {
    setDraftValue(title);
  }, [title]);

  if (isEditing) {
    return (
      <div className="mb-1 flex items-center gap-2">
        <input
          type="text"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <button
          type="button"
          onClick={() => {
            onSave(draftValue);
            setIsEditing(false);
          }}
          className="rounded-md bg-gray-900 px-2.5 py-2 text-xs font-semibold text-white hover:bg-gray-800"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="mb-1 flex items-center justify-between gap-3">
      <span className="block text-sm font-medium text-gray-700">{title}</span>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
      >
        Rename
      </button>
    </div>
  );
};

const PreviewListItem = ({ label, value, children }) => {
  const normalizedValue = normalizePrintableText(value);

  return (
    <li className="rounded-2xl border border-gray-200 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-lg font-bold text-purple-600">•</span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-gray-900 break-all">
            {label}
          </div>
          {children ? (
            <div className="mt-2">{children}</div>
          ) : (
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 break-all">
              {normalizedValue}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

const AgendaPrintFooter = ({ agenda }) => (
  <div
    className="mt-2 grid gap-4 border-t border-gray-200 pt-2 md:grid-cols-3"
    data-print-avoid-break="true"
  >
    {[
      {
        label: "Chairman",
        value: agenda.chairman,
        isSigned: false,
      },
      {
        label: "Secretary",
        value: agenda.secretary,
        isSigned: agenda.signatures?.secretarySigned === true,
      },
      {
        label: "Minute checker",
        value: agenda.minuteChecker,
        isSigned: agenda.signatures?.minuteCheckerSigned === true,
      },
    ].map(({ label, value, isSigned }) => (
      <div
        key={label}
        className="relative flex min-h-[72px] flex-col text-center"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          {label}
        </div>
        <div className="mt-2 flex min-h-[34px] items-end justify-center px-2 text-sm font-semibold leading-snug text-gray-900">
          {value ? (
            <span className="block max-w-full break-words whitespace-normal">
              {value}
            </span>
          ) : null}
        </div>
        {isSigned ? (
          <img
            src="/approvedsignned.png"
            alt={`${label} signed`}
            className="pointer-events-none absolute bottom-3 left-1/2 h-20 w-20 -translate-x-1/2 object-contain opacity-85"
          />
        ) : null}
        <div className="mt-1 border-b border-gray-400"></div>
      </div>
    ))}
  </div>
);

const AgendaTimeSummary = ({ agenda, meetingDuration }) => (
  <div
    className="rounded-2xl border border-gray-200 px-4 py-4"
    style={{ breakInside: "avoid" }}
  >
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">Meeting start</div>
        <div className="mt-2 text-sm leading-6 text-gray-700">
          {agenda.meetingStartTime}
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">
          End of meeting
        </div>
        <div className="mt-2 text-sm leading-6 text-gray-700">
          {agenda.meetingEndTime}
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">
          Meeting duration
        </div>
        <div className="mt-2 text-sm leading-6 text-gray-700">
          {meetingDuration}
        </div>
      </div>
    </div>
  </div>
);

const AgendaPreview = ({ agenda, showPrintFooter = false }) => {
  const resolvedAgenda = agenda || createPreviewPlaceholderAgenda();
  const presentMembers = resolvedAgenda.presentMembers.filter(
    (member) => typeof member === "string" && member.trim(),
  );
  const normalizedAdditionalNotes = normalizePrintableText(
    resolvedAgenda.additionalNotes,
  );
  const meetingDuration = formatMeetingDuration(
    resolvedAgenda.meetingStartTime,
    resolvedAgenda.meetingEndTime,
  );
  const agendaPrintItems = getAgendaPrintItems(resolvedAgenda);
  const structurePages = paginateAgendaPrintItems(
    showPrintFooter
      ? agendaPrintItems.filter((item) => item.type !== "timeSummary")
      : agendaPrintItems,
  );

  return (
    <div className="agenda-print-root space-y-6 print:space-y-0 print:block">
      <AgendaPage
        dateValue={resolvedAgenda.date}
        pageLabel="Page 1"
        pinFooter={showPrintFooter}
        footer={
          showPrintFooter ? <AgendaPrintFooter agenda={resolvedAgenda} /> : null
        }
      >
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Present
            </div>
            <div
              className={`mt-3 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm leading-6 text-gray-700 ${
                showPrintFooter ? "min-h-[96px]" : "min-h-[180px]"
              }`}
            >
              {presentMembers.length > 0 ? (
                <ul className="space-y-2">
                  {presentMembers.map((member) => (
                    <li key={member}>{member}</li>
                  ))}
                </ul>
              ) : showPrintFooter ? null : (
                <div className="text-sm text-gray-400">No members listed</div>
              )}
            </div>
            {normalizedAdditionalNotes ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Additional notes
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 break-all">
                  {normalizedAdditionalNotes}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Chairman
              </div>
              <div className="mt-3 text-sm text-gray-800">
                {resolvedAgenda.chairman}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Secretary
              </div>
              <div className="mt-3 text-sm text-gray-800">
                {resolvedAgenda.secretary}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Minute checker
              </div>
              <div className="mt-3 text-sm text-gray-800">
                {resolvedAgenda.minuteChecker}
              </div>
            </div>
          </div>
        </div>
        {showPrintFooter ? (
          <div className="mt-6">
            <AgendaTimeSummary
              agenda={resolvedAgenda}
              meetingDuration={meetingDuration}
            />
          </div>
        ) : null}
      </AgendaPage>

      {structurePages.map((items, pageIndex) => (
        <AgendaPage
          key={`structure-page-${pageIndex + 2}`}
          dateValue={resolvedAgenda.date}
          pageLabel={`Page ${pageIndex + 2}`}
          pinFooter={showPrintFooter}
          footer={
            showPrintFooter ? (
              <AgendaPrintFooter agenda={resolvedAgenda} />
            ) : null
          }
        >
          <ul className="space-y-4">
            {items.map((item) => {
              if (item.type === "field") {
                return (
                  <PreviewListItem
                    key={item.key}
                    label={item.label}
                    value={item.value}
                  />
                );
              }

              if (item.type === "timeSummary") {
                return (
                  <li key={item.key}>
                    <AgendaTimeSummary
                      agenda={resolvedAgenda}
                      meetingDuration={meetingDuration}
                    />
                  </li>
                );
              }

              const topic = item.topic;
              const normalizedTopicContent = normalizePrintableText(
                topic.content,
              );
              const normalizedVoteReason = normalizePrintableText(
                topic.voting?.reason,
              );
              return (
                <PreviewListItem
                  key={item.key}
                  label={topic.label || `Topic ${item.fallbackIndex + 1}`}
                >
                  <div className="space-y-3" style={{ breakInside: "avoid" }}>
                    {normalizedTopicContent ? (
                      <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700 break-all">
                        {normalizedTopicContent}
                      </div>
                    ) : null}
                    {topic.voting?.enabled ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                          Voting
                        </div>
                        {normalizedVoteReason ? (
                          <div className="mt-2 text-sm text-gray-700 break-all">
                            <span className="font-semibold text-gray-900">
                              Reason of vote:
                            </span>{" "}
                            {normalizedVoteReason}
                          </div>
                        ) : null}
                        <div className="mt-3 space-y-2 text-sm text-gray-700">
                          <div>
                            <span className="font-semibold text-gray-900">
                              Approve:
                            </span>{" "}
                            {(topic.voting.approve || []).join(", ")}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              Disapprove:
                            </span>{" "}
                            {(topic.voting.disapprove || []).join(", ")}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              Obstain:
                            </span>{" "}
                            {(topic.voting.abstain || []).join(", ")}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </PreviewListItem>
              );
            })}
          </ul>
        </AgendaPage>
      ))}
    </div>
  );
};

const SortableTopicItem = ({
  topic,
  index,
  presentMembers,
  attendanceTemplates,
  submittedTopics,
  onTopicLabelChange,
  onTopicChange,
  onApplySubmittedTopic,
  onToggleTopicVoting,
  onTopicVotingReasonChange,
  onAddVoteMember,
  onRemoveVoteMember,
  onApplyVotePattern,
  onRemoveTopic,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-gray-200 bg-white p-3 ${
        isDragging ? "shadow-xl ring-2 ring-purple-200" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="cursor-grab rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-500 active:cursor-grabbing"
            aria-label={`Drag ${topic.label || `Topic ${index + 1}`}`}
            {...attributes}
            {...listeners}
          >
            Drag
          </button>
          <span className="text-sm font-medium text-gray-700">
            {topic.label || `Topic ${index + 1}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemoveTopic(index)}
          className="text-xs font-semibold text-red-600"
        >
          Remove
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Topic name
          </span>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <input
              type="text"
              value={topic.label}
              onChange={(event) =>
                onTopicLabelChange(index, event.target.value)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
            />
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  onApplySubmittedTopic(index, event.target.value);
                }
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
            >
              <option value="">
                {submittedTopics.length > 0
                  ? "Use submitted topic"
                  : "No open submitted topics"}
              </option>
              {submittedTopics.map((submittedTopic) => (
                <option key={submittedTopic.id} value={submittedTopic.id}>
                  {submittedTopic.topic || "Untitled submitted topic"}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Topic notes
          </span>
          <textarea
            value={topic.content}
            onChange={(event) => onTopicChange(index, event.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-gray-700">Voting</div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={topic.voting?.enabled === true}
                onChange={(event) =>
                  onToggleTopicVoting(index, event.target.checked)
                }
              />
              Enable
            </label>
          </div>

          {topic.voting?.enabled ? (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Reason of vote
                </span>
                <textarea
                  value={topic.voting.reason}
                  onChange={(event) =>
                    onTopicVotingReasonChange(index, event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                />
              </label>

              {[
                ["approve", "Approve"],
                ["disapprove", "Disapprove"],
                ["abstain", "Obstain"],
              ].map(([voteKey, voteLabel]) => {
                const selectedMembers = topic.voting?.[voteKey] || [];
                const availableMembers = presentMembers.filter(
                  (member) => !selectedMembers.includes(member),
                );

                return (
                  <div
                    key={`${topic.id}-${voteKey}`}
                    className="rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-800">
                        {voteLabel}
                      </div>
                      <VotePatternButton
                        templates={attendanceTemplates}
                        onApply={(templateId) =>
                          onApplyVotePattern(index, voteKey, templateId)
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map((member) => (
                        <button
                          key={`${voteKey}-${member}`}
                          type="button"
                          onClick={() =>
                            onRemoveVoteMember(index, voteKey, member)
                          }
                          className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 ring-1 ring-gray-200"
                        >
                          {member} <span className="text-red-500">×</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3">
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value) {
                            onAddVoteMember(index, voteKey, event.target.value);
                          }
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                      >
                        <option value="">
                          Add present person to {voteLabel}
                        </option>
                        {availableMembers.map((member) => (
                          <option
                            key={`${voteKey}-option-${member}`}
                            value={member}
                          >
                            {member}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const AgendaEditor = ({
  agenda,
  presentOptionGroups,
  roleOptions,
  attendanceTemplates,
  submittedTopics,
  presentDropdownOpen,
  onTogglePresentDropdown,
  onAddPresentMember,
  onRemovePresentMember,
  attendanceTemplateDraftName,
  onAttendanceTemplateDraftNameChange,
  onSaveAttendanceTemplate,
  onApplyAttendanceTemplate,
  onDeleteAttendanceTemplate,
  onFieldChange,
  onTopicLabelChange,
  onTopicChange,
  onApplySubmittedTopic,
  onTopicDragEnd,
  onToggleTopicVoting,
  onTopicVotingReasonChange,
  onAddVoteMember,
  onRemoveVoteMember,
  onApplyVotePattern,
  onAddTopic,
  onRemoveTopic,
  onDeleteAgenda,
  isSaving,
  isUpdatingAttendanceTemplates,
  sensors,
}) => (
  <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Meeting details</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Present
          </span>
          <div className="rounded-xl border border-gray-300 bg-gray-50 p-3">
            <div className="flex flex-wrap items-start gap-2">
              {agenda.presentMembers.map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => onRemovePresentMember(member)}
                  className="rounded-full bg-white px-3 py-1 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200"
                >
                  {member} <span className="text-red-500">×</span>
                </button>
              ))}

              <div className="relative">
                <button
                  type="button"
                  onClick={onTogglePresentDropdown}
                  className="rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  +
                </button>

                {presentDropdownOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                    <div className="max-h-64 overflow-y-auto">
                      {presentOptionGroups.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No participants available.
                        </div>
                      ) : (
                        presentOptionGroups.map((group) => (
                          <div key={group.label} className="py-1">
                            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                              {group.label}
                            </div>
                            {group.options.map((option) => (
                              <button
                                key={`${group.label}-${option}`}
                                type="button"
                                onClick={() => onAddPresentMember(option)}
                                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                  Additional notes
                </span>
                <textarea
                  value={agenda.additionalNotes}
                  onChange={(event) =>
                    onFieldChange("additionalNotes", event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                />
              </label>

              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                Saved patterns
              </span>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="text"
                  value={attendanceTemplateDraftName}
                  onChange={(event) =>
                    onAttendanceTemplateDraftNameChange(event.target.value)
                  }
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  placeholder="Write a name"
                />
                <button
                  type="button"
                  onClick={onSaveAttendanceTemplate}
                  className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Save Pattern
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {attendanceTemplates.length === 0 ? (
                  <span className="text-sm text-gray-500">
                    No saved attendance patterns yet.
                  </span>
                ) : (
                  attendanceTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="inline-flex items-center overflow-hidden rounded-full bg-purple-50 ring-1 ring-purple-200"
                    >
                      <button
                        type="button"
                        onClick={() => onApplyAttendanceTemplate(template.id)}
                        className="px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-100"
                      >
                        {template.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAttendanceTemplate(template.id)}
                        disabled={isUpdatingAttendanceTemplates}
                        aria-label={`Delete saved pattern ${template.name}`}
                        className="border-l border-purple-200 px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Chairman
          </span>
          <select
            value={agenda.chairman}
            onChange={(event) => onFieldChange("chairman", event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          >
            <option value="">Select chairman</option>
            {roleOptions.map((option) => (
              <option key={`chairman-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Secretary
          </span>
          <select
            value={agenda.secretary}
            onChange={(event) => onFieldChange("secretary", event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          >
            <option value="">Select secretary</option>
            {roleOptions.map((option) => (
              <option key={`secretary-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Minute checker
          </span>
          <select
            value={agenda.minuteChecker}
            onChange={(event) =>
              onFieldChange("minuteChecker", event.target.value)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          >
            <option value="">Select minute checker</option>
            {roleOptions.map((option) => (
              <option key={`minute-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Agenda structure</h3>
      <div className="mt-5 space-y-4">
        <label className="block">
          <EditableSectionTitle
            title={agenda.customLabels.meetingInitiation}
            onSave={(value) =>
              onFieldChange("customLabels", {
                ...agenda.customLabels,
                meetingInitiation: value,
              })
            }
          />
          <textarea
            value={agenda.meetingInitiation}
            onChange={(event) =>
              onFieldChange("meetingInitiation", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <EditableSectionTitle
            title={agenda.customLabels.boardMembersMeetUp}
            onSave={(value) =>
              onFieldChange("customLabels", {
                ...agenda.customLabels,
                boardMembersMeetUp: value,
              })
            }
          />
          <textarea
            value={agenda.boardMembersMeetUp}
            onChange={(event) =>
              onFieldChange("boardMembersMeetUp", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Start time
            </span>
            <input
              type="text"
              value={agenda.meetingStartTime}
              onChange={(event) =>
                onFieldChange(
                  "meetingStartTime",
                  normalizeTimeInputValue(event.target.value),
                )
              }
              onBlur={(event) =>
                onFieldChange(
                  "meetingStartTime",
                  finalizeTimeInputValue(event.target.value),
                )
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
              inputMode="numeric"
              placeholder="18:00"
              maxLength={5}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              End of meeting
            </span>
            <input
              type="text"
              value={agenda.meetingEndTime}
              onChange={(event) =>
                onFieldChange(
                  "meetingEndTime",
                  normalizeTimeInputValue(event.target.value),
                )
              }
              onBlur={(event) =>
                onFieldChange(
                  "meetingEndTime",
                  finalizeTimeInputValue(event.target.value),
                )
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
              inputMode="numeric"
              placeholder="20:30"
              maxLength={5}
            />
          </label>
          <div className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Meeting duration
            </span>
            <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-sm">
              {formatMeetingDuration(
                agenda.meetingStartTime,
                agenda.meetingEndTime,
              ) || " "}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">
              Topics
            </h4>
            <button
              type="button"
              onClick={onAddTopic}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              + Add Topic
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onTopicDragEnd}
          >
            <SortableContext
              items={agenda.topics.map((topic) => topic.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 space-y-3">
                {agenda.topics.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                    No topics yet. Use "+ Add Topic" when you want to add one.
                  </div>
                ) : null}
                {agenda.topics.map((topic, index) => (
                  <SortableTopicItem
                    key={topic.id}
                    topic={topic}
                    index={index}
                    presentMembers={agenda.presentMembers}
                    attendanceTemplates={attendanceTemplates}
                    submittedTopics={submittedTopics}
                    onTopicLabelChange={onTopicLabelChange}
                    onTopicChange={onTopicChange}
                    onApplySubmittedTopic={onApplySubmittedTopic}
                    onToggleTopicVoting={onToggleTopicVoting}
                    onTopicVotingReasonChange={onTopicVotingReasonChange}
                    onAddVoteMember={onAddVoteMember}
                    onRemoveVoteMember={onRemoveVoteMember}
                    onApplyVotePattern={onApplyVotePattern}
                    onRemoveTopic={onRemoveTopic}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <label className="block">
          <EditableSectionTitle
            title={agenda.customLabels.meetingConcludes}
            onSave={(value) =>
              onFieldChange("customLabels", {
                ...agenda.customLabels,
                meetingConcludes: value,
              })
            }
          />
          <textarea
            value={agenda.meetingConcludes}
            onChange={(event) =>
              onFieldChange("meetingConcludes", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <EditableSectionTitle
            title={agenda.customLabels.nextMeetingDate}
            onSave={(value) =>
              onFieldChange("customLabels", {
                ...agenda.customLabels,
                nextMeetingDate: value,
              })
            }
          />
          <textarea
            value={agenda.nextMeetingDate}
            onChange={(event) =>
              onFieldChange("nextMeetingDate", event.target.value)
            }
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <EditableSectionTitle
            title={agenda.customLabels.topicsForNextMeeting}
            onSave={(value) =>
              onFieldChange("customLabels", {
                ...agenda.customLabels,
                topicsForNextMeeting: value,
              })
            }
          />
          <textarea
            value={agenda.topicsForNextMeeting}
            onChange={(event) =>
              onFieldChange("topicsForNextMeeting", event.target.value)
            }
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                Alert
              </div>
              <p className="mt-1 text-sm text-red-700">
                Delete this agenda permanently. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={onDeleteAgenda}
              disabled={isSaving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Delete Agenda
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default function AgendaManagement() {
  const { user } = useUser();
  const router = useRouter();
  const isAdmin = user?.publicMetadata?.admin === true;
  const isCommitteeOnly = user?.publicMetadata?.committee === true && !isAdmin;
  const queryClient = useQueryClient();

  const [selectedAgendaId, setSelectedAgendaId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftAgenda, setDraftAgenda] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newAgendaDate, setNewAgendaDate] = useState(new Date());
  const [isPresentDropdownOpen, setIsPresentDropdownOpen] = useState(false);
  const [isViewAppliedModalOpen, setIsViewAppliedModalOpen] = useState(false);
  const [attendanceTemplateDraftName, setAttendanceTemplateDraftName] =
    useState("");
  const createAgendaButtonRef = useRef(null);
  const datePopoverRef = useRef(null);
  const presentDropdownRef = useRef(null);
  const previewPrintRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const {
    data: rawAgendas = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agendas"],
    queryFn: fetchAgendas,
  });

  const agendas = normalizeAgendas(rawAgendas);
  const userFullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim(),
    [user],
  );
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users", "agenda"],
    queryFn: fetchAdminUsers,
    enabled: isAdmin || isCommitteeOnly,
  });
  const { data: rawAttendanceTemplates = [] } = useQuery({
    queryKey: ["agenda", "attendanceTemplates"],
    queryFn: fetchAttendanceTemplates,
    enabled: isAdmin,
  });
  const attendanceTemplates = normalizeAttendanceTemplates(
    rawAttendanceTemplates,
  );

  const participantOptionGroups = useMemo(() => {
    if (!Array.isArray(users)) {
      return [];
    }

    const adminNames = new Set();
    const committeeNames = new Set();

    users.forEach((user) => {
      const fullName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (!fullName) {
        return;
      }

      if (user?.isAdmin) {
        adminNames.add(fullName);
      }

      if (user?.isCommittee) {
        committeeNames.add(fullName);
      }
    });

    return [
      {
        label: "Admin",
        options: Array.from(adminNames).sort((left, right) =>
          left.localeCompare(right),
        ),
      },
      {
        label: "Committee",
        options: Array.from(committeeNames).sort((left, right) =>
          left.localeCompare(right),
        ),
      },
    ].filter((group) => group.options.length > 0);
  }, [users]);
  const resolvedSelectedAgendaId =
    selectedAgendaId && agendas.some((agenda) => agenda.id === selectedAgendaId)
      ? selectedAgendaId
      : agendas[0]?.id || null;

  const selectedAgenda =
    agendas.find((agenda) => agenda.id === resolvedSelectedAgendaId) || null;
  const openAgendas = agendas.filter((agenda) => agenda.isCompleted !== true);
  const completedAgendas = agendas.filter(
    (agenda) => agenda.isCompleted === true,
  );
  const availableSubmittedTopics = useMemo(
    () =>
      (draftAgenda?.Topics || []).filter(
        (topic) =>
          typeof topic?.topic === "string" &&
          topic.topic.trim() &&
          topic.completed !== true,
      ),
    [draftAgenda],
  );
  const currentUserComparableName = normalizeComparableName(userFullName);
  const secretaryComparableName = normalizeComparableName(
    selectedAgenda?.secretary,
  );
  const minuteCheckerComparableName = normalizeComparableName(
    selectedAgenda?.minuteChecker,
  );
  const canCurrentUserSignAsSecretary =
    Boolean(currentUserComparableName) &&
    currentUserComparableName === secretaryComparableName;
  const canCurrentUserSignAsMinuteChecker =
    Boolean(currentUserComparableName) &&
    currentUserComparableName === minuteCheckerComparableName;
  const canCompleteSelectedAgenda =
    selectedAgenda?.signatures?.secretarySigned === true &&
    selectedAgenda?.signatures?.minuteCheckerSigned === true;

  const handleReactToPrint = useReactToPrint({
    contentRef: previewPrintRef,
    documentTitle: () => selectedAgenda?.title || "agenda",
    onPrintError: (_location, printError) => {
      setGeneralError(
        printError?.message || "Could not prepare the agenda for printing.",
      );
    },
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 10mm !important;
      }

      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .agenda-print-root {
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        .agenda-print-page {
          /* STRICT height locking. 250mm guarantees it fits on A4 regardless of browser margins */
          height: 250mm !important; 
          max-height: 250mm !important;
          overflow: hidden !important;
          width: 100% !important;
          
          display: flex !important;
          flex-direction: column !important;
          
          margin: 0 !important;
          padding: 10mm 15mm 15mm 15mm !important; 
          box-sizing: border-box !important;
          
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: white !important;
        }

        /* Force page breaks BEFORE every new page except the first */
        .agenda-print-page + .agenda-print-page {
          page-break-before: always !important;
          break-before: page !important;
          margin-top: 0 !important;
        }

        .agenda-print-content {
          display: block;
        }

        .agenda-print-footer {
          /* Flex auto-margin pushes this to the exact bottom of the 250mm container */
          margin-top: auto !important;
          margin-bottom: 0 !important;
          
          /* Protect the footer from ever being split */
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .agenda-print-page ul,
        .agenda-print-page li {
          margin: 0;
          padding: 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `,
  });

  const mutation = useMutation({
    mutationFn: updateAgendas,
    onSuccess: (updatedAgendas) => {
      const normalizedAgendas = normalizeAgendas(updatedAgendas);
      queryClient.setQueryData(["agendas"], normalizedAgendas);

      const preservedAgendaId =
        draftAgenda?.id || selectedAgendaId || normalizedAgendas[0]?.id || null;

      if (
        preservedAgendaId &&
        normalizedAgendas.some((agenda) => agenda.id === preservedAgendaId)
      ) {
        setSelectedAgendaId(preservedAgendaId);
      } else if (normalizedAgendas[0]) {
        setSelectedAgendaId(normalizedAgendas[0].id);
      }

      setIsEditing(false);
      setDraftAgenda(null);
      setGeneralError(null);
    },
    onError: (mutationError) => {
      setGeneralError(
        mutationError.message || "An error occurred while saving agendas.",
      );
    },
  });
  const attendanceTemplateMutation = useMutation({
    mutationFn: updateAttendanceTemplates,
    onSuccess: (updatedTemplates) => {
      queryClient.setQueryData(
        ["agenda", "attendanceTemplates"],
        normalizeAttendanceTemplates(updatedTemplates),
      );
      setAttendanceTemplateDraftName("");
      setGeneralError(null);
    },
    onError: (mutationError) => {
      setGeneralError(
        mutationError.message ||
          "An error occurred while saving attendance templates.",
      );
    },
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isDatePickerOpen &&
        !datePopoverRef.current?.contains(event.target) &&
        !createAgendaButtonRef.current?.contains(event.target)
      ) {
        setIsDatePickerOpen(false);
      }

      if (
        isPresentDropdownOpen &&
        !presentDropdownRef.current?.contains(event.target)
      ) {
        setIsPresentDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDatePickerOpen, isPresentDropdownOpen]);

  const handleSelectAgenda = (agendaId) => {
    if (isEditing && draftAgenda?.id !== agendaId) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes. Discard them and switch agendas?",
      );

      if (!shouldDiscard) {
        return;
      }

      setIsEditing(false);
      setDraftAgenda(null);
      setGeneralError(null);
    }

    setSelectedAgendaId(agendaId);
  };

  const handleEditAgenda = () => {
    if (!selectedAgenda) {
      return;
    }

    if (selectedAgenda.isCompleted) {
      setGeneralError("Completed agendas can no longer be edited.");
      return;
    }

    setDraftAgenda(cloneAgenda(selectedAgenda));
    setGeneralError(null);
    setIsPresentDropdownOpen(false);
    setAttendanceTemplateDraftName("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftAgenda(null);
    setGeneralError(null);
    setIsPresentDropdownOpen(false);
    setAttendanceTemplateDraftName("");
    setIsEditing(false);
  };

  const handleDraftFieldChange = (field, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      const nextAgenda = {
        ...currentAgenda,
        [field]: value,
      };

      return nextAgenda;
    });
  };

  const handleTopicLabelChange = (topicIndex, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex ? { ...topic, label: value } : topic,
        ),
      };
    });
  };

  const handleTopicChange = (topicIndex, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex ? { ...topic, content: value } : topic,
        ),
      };
    });
  };

  const handleApplySubmittedTopic = (topicIndex, submittedTopicId) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      const selectedSubmittedTopic = (currentAgenda.Topics || []).find(
        (topic) => topic.id === submittedTopicId,
      );

      if (!selectedSubmittedTopic) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex
            ? {
                ...topic,
                label: selectedSubmittedTopic.topic || topic.label,
              }
            : topic,
        ),
        Topics: (currentAgenda.Topics || []).map((topic) =>
          topic.id === submittedTopicId ? { ...topic, completed: true } : topic,
        ),
      };
    });
  };

  const handleAddTopic = () => {
    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            topics: [
              ...currentAgenda.topics,
              createEmptyTopic(currentAgenda.topics.length),
            ],
          }
        : currentAgenda,
    );
  };

  const handleTopicDragEnd = (event) => {
    const { active, over } = event;

    if (!active?.id || !over?.id || active.id === over.id) {
      return;
    }

    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      const oldIndex = currentAgenda.topics.findIndex(
        (topic) => topic.id === active.id,
      );
      const newIndex = currentAgenda.topics.findIndex(
        (topic) => topic.id === over.id,
      );

      if (oldIndex === -1 || newIndex === -1) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: arrayMove(currentAgenda.topics, oldIndex, newIndex),
      };
    });
  };

  const handleToggleTopicVoting = (topicIndex, enabled) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex
            ? {
                ...topic,
                voting: enabled
                  ? {
                      enabled: true,
                      reason: topic.voting?.reason || "",
                      approve: topic.voting?.approve || [],
                      disapprove: topic.voting?.disapprove || [],
                      abstain: topic.voting?.abstain || [],
                    }
                  : {
                      enabled: false,
                      reason: "",
                      approve: [],
                      disapprove: [],
                      abstain: [],
                    },
              }
            : topic,
        ),
      };
    });
  };

  const handleTopicVotingReasonChange = (topicIndex, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex
            ? {
                ...topic,
                voting: {
                  ...topic.voting,
                  enabled: true,
                  reason: value,
                },
              }
            : topic,
        ),
      };
    });
  };

  const handleAddVoteMember = (topicIndex, voteKey, memberName) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) => {
          if (index !== topicIndex) {
            return topic;
          }

          const nextVoting = {
            enabled: true,
            reason: topic.voting?.reason || "",
            approve: (topic.voting?.approve || []).filter(
              (member) => member !== memberName,
            ),
            disapprove: (topic.voting?.disapprove || []).filter(
              (member) => member !== memberName,
            ),
            abstain: (topic.voting?.abstain || []).filter(
              (member) => member !== memberName,
            ),
          };

          nextVoting[voteKey] = [...nextVoting[voteKey], memberName];

          return {
            ...topic,
            voting: nextVoting,
          };
        }),
      };
    });
  };

  const handleRemoveVoteMember = (topicIndex, voteKey, memberName) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex
            ? {
                ...topic,
                voting: {
                  ...topic.voting,
                  [voteKey]: (topic.voting?.[voteKey] || []).filter(
                    (member) => member !== memberName,
                  ),
                },
              }
            : topic,
        ),
      };
    });
  };

  const handleAddPresentMember = (memberName) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda || currentAgenda.presentMembers.includes(memberName)) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        presentMembers: [...currentAgenda.presentMembers, memberName],
      };
    });

    setIsPresentDropdownOpen(false);
  };

  const handleRemovePresentMember = (memberName) => {
    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            presentMembers: currentAgenda.presentMembers.filter(
              (member) => member !== memberName,
            ),
          }
        : currentAgenda,
    );
  };

  const handleSaveAttendanceTemplate = () => {
    if (!draftAgenda || draftAgenda.presentMembers.length === 0) {
      setGeneralError("Select present people before saving a pattern.");
      return;
    }

    const normalizedName = attendanceTemplateDraftName.trim();
    if (!normalizedName) {
      setGeneralError("Write a name before saving a pattern.");
      return;
    }

    if (
      attendanceTemplates.some(
        (template) =>
          template.name.toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setGeneralError(
        `A saved pattern named "${normalizedName}" already exists.`,
      );
      return;
    }

    attendanceTemplateMutation.mutate([
      ...attendanceTemplates,
      {
        id: createAttendanceTemplateId(),
        name: normalizedName,
        members: draftAgenda.presentMembers,
      },
    ]);
  };

  const handleApplyAttendanceTemplate = (templateId) => {
    const selectedTemplate = attendanceTemplates.find(
      (template) => template.id === templateId,
    );

    if (!selectedTemplate) {
      return;
    }

    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            presentMembers: selectedTemplate.members,
          }
        : currentAgenda,
    );
  };

  const handleDeleteAttendanceTemplate = (templateId) => {
    const selectedTemplate = attendanceTemplates.find(
      (template) => template.id === templateId,
    );

    if (!selectedTemplate) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete saved pattern "${selectedTemplate.name}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    attendanceTemplateMutation.mutate(
      attendanceTemplates.filter((template) => template.id !== templateId),
    );
  };

  const handleApplyVotePattern = (topicIndex, voteKey, templateId) => {
    const selectedTemplate = attendanceTemplates.find(
      (template) => template.id === templateId,
    );

    if (!selectedTemplate) {
      return;
    }

    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) => {
          if (index !== topicIndex) {
            return topic;
          }

          const presentMemberSet = new Set(currentAgenda.presentMembers);
          const templateMembers = selectedTemplate.members.filter((member) =>
            presentMemberSet.has(member),
          );

          return {
            ...topic,
            voting: {
              ...topic.voting,
              enabled: true,
              approve:
                voteKey === "approve"
                  ? templateMembers
                  : (topic.voting?.approve || []).filter(
                      (member) => !templateMembers.includes(member),
                    ),
              disapprove:
                voteKey === "disapprove"
                  ? templateMembers
                  : (topic.voting?.disapprove || []).filter(
                      (member) => !templateMembers.includes(member),
                    ),
              abstain:
                voteKey === "abstain"
                  ? templateMembers
                  : (topic.voting?.abstain || []).filter(
                      (member) => !templateMembers.includes(member),
                    ),
            },
          };
        }),
      };
    });
  };

  const handleRemoveTopic = (topicIndex) => {
    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            topics: currentAgenda.topics.filter(
              (_, index) => index !== topicIndex,
            ),
          }
        : currentAgenda,
    );
  };

  const handleSaveAgenda = () => {
    if (!draftAgenda) {
      return;
    }

    if (!draftAgenda.date) {
      setGeneralError("Agenda date is required.");
      return;
    }

    if (
      agendas.some(
        (agenda) =>
          agenda.id !== draftAgenda.id && agenda.date === draftAgenda.date,
      )
    ) {
      setGeneralError(
        `An agenda for ${formatAgendaDate(draftAgenda.date)} already exists.`,
      );
      return;
    }

    const normalizedDraft = normalizeAgenda(draftAgenda);
    const updatedAgendas = agendas.map((agenda) =>
      agenda.id === normalizedDraft.id ? normalizedDraft : agenda,
    );

    mutation.mutate(updatedAgendas);
  };

  const handleDeleteAgenda = () => {
    if (!draftAgenda) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete ${draftAgenda.title}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    const updatedAgendas = agendas.filter(
      (agenda) => agenda.id !== draftAgenda.id,
    );
    mutation.mutate(updatedAgendas);
  };

  const handleOpenCompleteModal = () => {
    if (!selectedAgenda) {
      return;
    }

    if (!selectedAgenda.secretary || !selectedAgenda.minuteChecker) {
      setGeneralError(
        "Set both Secretary and Minute Checker before completing the agenda.",
      );
      return;
    }

    setGeneralError(null);
    setIsCompleteModalOpen(true);
  };

  const handleSignAgendaRole = (roleKey) => {
    if (!selectedAgenda || selectedAgenda.isCompleted) {
      return;
    }

    const isSecretaryRole = roleKey === "secretary";
    const roleName = isSecretaryRole
      ? selectedAgenda.secretary
      : selectedAgenda.minuteChecker;
    const canSign = isSecretaryRole
      ? canCurrentUserSignAsSecretary
      : canCurrentUserSignAsMinuteChecker;

    if (!roleName) {
      setGeneralError(
        `Assign the ${isSecretaryRole ? "Secretary" : "Minute Checker"} before signing.`,
      );
      return;
    }

    if (!canSign) {
      setGeneralError(
        `Only the assigned ${isSecretaryRole ? "Secretary" : "Minute Checker"} can sign this agenda.`,
      );
      return;
    }

    const updatedAgenda = normalizeAgenda({
      ...selectedAgenda,
      signatures: {
        ...selectedAgenda.signatures,
        ...(isSecretaryRole
          ? {
              secretarySigned: true,
              secretarySignedBy: userFullName,
              secretarySignedAt: new Date().toISOString(),
            }
          : {
              minuteCheckerSigned: true,
              minuteCheckerSignedBy: userFullName,
              minuteCheckerSignedAt: new Date().toISOString(),
            }),
      },
    });
    const updatedAgendas = agendas.map((agenda) =>
      agenda.id === updatedAgenda.id ? updatedAgenda : agenda,
    );

    setGeneralError(null);
    mutation.mutate(updatedAgendas);
  };

  const handleCompleteAgenda = () => {
    if (!selectedAgenda) {
      return;
    }

    if (!canCompleteSelectedAgenda) {
      setGeneralError(
        "Both Secretary and Minute Checker must sign before the agenda can be completed.",
      );
      return;
    }

    const updatedAgenda = normalizeAgenda({
      ...selectedAgenda,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    });
    const updatedAgendas = agendas.map((agenda) =>
      agenda.id === updatedAgenda.id ? updatedAgenda : agenda,
    );

    mutation.mutate(updatedAgendas);
    setIsCompleteModalOpen(false);
  };

  const handleCreateAgenda = (selectedDate) => {
    const normalizedDate = toInputDateValue(selectedDate);

    if (!normalizedDate) {
      return;
    }

    if (agendas.some((agenda) => agenda.date === normalizedDate)) {
      setGeneralError(
        `An agenda for ${formatAgendaDate(normalizedDate)} already exists.`,
      );
      setIsDatePickerOpen(false);
      return;
    }

    const newAgenda = createAgendaFromDate(normalizedDate);
    const updatedAgendas = [newAgenda, ...agendas];

    setDraftAgenda(newAgenda);
    setSelectedAgendaId(newAgenda.id);
    setIsDatePickerOpen(false);
    setNewAgendaDate(selectedDate);
    setGeneralError(null);
    mutation.mutate(updatedAgendas);
  };

  const handlePrintAgenda = () => {
    if (!selectedAgenda || !previewPrintRef.current) {
      setGeneralError("Select an agenda before printing.");
      return;
    }

    setGeneralError(null);
    handleReactToPrint();
  };

  if (isLoading) {
    return <p className="py-4 text-center text-gray-500">Loading agendas...</p>;
  }

  if (isError) {
    return (
      <p className="py-4 text-center text-red-600">
        Error loading agendas: {error?.message || "Unknown error"}
      </p>
    );
  }

  return (
    <div className="mt-6 rounded border bg-gray-50 p-4">
      <div className="mb-6 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {selectedAgenda?.title || "Agenda"}
          </h2>
          {selectedAgenda?.isCompleted ? (
            <div className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-green-700">
              Completed
            </div>
          ) : null}
          {selectedAgenda && !isEditing && !selectedAgenda.isCompleted ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleOpenCompleteModal}
                disabled={mutation.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Complete
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedAgenda && !isEditing && (
            <>
              <button
                type="button"
                onClick={handlePrintAgenda}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Print / Download PDF
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsViewAppliedModalOpen(true)}
                  className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200"
                >
                  Applied agenda topics
                </button>
              )}

              {isAdmin && !selectedAgenda.isCompleted && (
                <button
                  type="button"
                  onClick={handleEditAgenda}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Edit Agenda
                </button>
              )}
            </>
          )}

          {isAdmin && isEditing && (
            <>
              <button
                type="button"
                onClick={handleSaveAgenda}
                disabled={mutation.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={mutation.isPending}
                className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {generalError && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {generalError}
        </p>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="relative md:w-1/4 lg:w-1/5">
          <div className="max-h-[80vh] overflow-y-auto rounded-md border bg-white p-4 shadow">
            <div className="sticky top-0 z-10 mb-4 border-b bg-white pb-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-700">
                  Sections
                </h3>
                {isAdmin && (
                  <button
                    type="button"
                    ref={createAgendaButtonRef}
                    onClick={() => setIsDatePickerOpen((current) => !current)}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                  >
                    + New Agenda
                  </button>
                )}
              </div>
            </div>

            {agendas.length === 0 ? (
              <p className="text-sm text-gray-500">
                No agendas yet.
                {isAdmin ? " Create the first one from the date picker." : ""}
              </p>
            ) : (
              <div className="space-y-5">
                {openAgendas.length > 0 ? (
                  <ul className="space-y-2">
                    {openAgendas.map((agenda) => (
                      <li key={agenda.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectAgenda(agenda.id)}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                            resolvedSelectedAgendaId === agenda.id
                              ? "bg-purple-100 font-semibold text-purple-700"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {agenda.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No open agendas.</p>
                )}

                {completedAgendas.length > 0 ? (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Completed
                    </div>
                    <ul className="space-y-2">
                      {completedAgendas.map((agenda) => (
                        <li key={agenda.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectAgenda(agenda.id)}
                            className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                              resolvedSelectedAgendaId === agenda.id
                                ? "bg-green-100 font-semibold text-green-700"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {agenda.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {isAdmin && isDatePickerOpen && (
            <div
              ref={datePopoverRef}
              className="absolute left-0 right-0 top-full z-30 mt-3 md:left-full md:right-auto md:top-0 md:ml-3 md:mt-0"
            >
              <div className="w-fit rounded-2xl border border-purple-100 bg-white p-3 shadow-2xl">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">
                  Pick a date
                </div>
                <DatePicker
                  inline
                  selected={newAgendaDate}
                  onChange={(date) => {
                    if (date) {
                      handleCreateAgenda(date);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </aside>

        <main className="min-h-[60vh] md:w-3/4 lg:w-4/5">
          {isEditing && draftAgenda && isAdmin ? (
            <div ref={presentDropdownRef}>
              <AgendaEditor
                agenda={draftAgenda}
                presentOptionGroups={participantOptionGroups
                  .map((group) => ({
                    ...group,
                    options: group.options.filter(
                      (option) => !draftAgenda.presentMembers.includes(option),
                    ),
                  }))
                  .filter((group) => group.options.length > 0)}
                roleOptions={draftAgenda.presentMembers}
                attendanceTemplates={attendanceTemplates}
                submittedTopics={availableSubmittedTopics}
                presentDropdownOpen={isPresentDropdownOpen}
                onTogglePresentDropdown={() =>
                  setIsPresentDropdownOpen((current) => !current)
                }
                onAddPresentMember={handleAddPresentMember}
                onRemovePresentMember={handleRemovePresentMember}
                attendanceTemplateDraftName={attendanceTemplateDraftName}
                onAttendanceTemplateDraftNameChange={
                  setAttendanceTemplateDraftName
                }
                onSaveAttendanceTemplate={handleSaveAttendanceTemplate}
                onApplyAttendanceTemplate={handleApplyAttendanceTemplate}
                onDeleteAttendanceTemplate={handleDeleteAttendanceTemplate}
                onFieldChange={handleDraftFieldChange}
                onTopicLabelChange={handleTopicLabelChange}
                onTopicChange={handleTopicChange}
                onApplySubmittedTopic={handleApplySubmittedTopic}
                onTopicDragEnd={handleTopicDragEnd}
                onToggleTopicVoting={handleToggleTopicVoting}
                onTopicVotingReasonChange={handleTopicVotingReasonChange}
                onAddVoteMember={handleAddVoteMember}
                onRemoveVoteMember={handleRemoveVoteMember}
                onApplyVotePattern={handleApplyVotePattern}
                onAddTopic={handleAddTopic}
                onRemoveTopic={handleRemoveTopic}
                onDeleteAgenda={handleDeleteAgenda}
                isSaving={mutation.isPending}
                isUpdatingAttendanceTemplates={
                  attendanceTemplateMutation.isPending
                }
                sensors={sensors}
              />
            </div>
          ) : (
            <>
              <AgendaPreview agenda={selectedAgenda} />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-[99999px] top-0"
              >
                <div ref={previewPrintRef}>
                  <AgendaPreview agenda={selectedAgenda} showPrintFooter />
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {isCompleteModalOpen && selectedAgenda ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Complete Agenda
              </h3>
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="pr-24">
                  <div className="text-sm font-semibold text-green-900">
                    {selectedAgenda.title}
                  </div>
                  <div className="mt-1 text-sm text-green-800">
                    Complete this agenda with the digital signature stamp.
                  </div>
                </div>
                <img
                  src="/approvedsignned.png"
                  alt="Approved and signed"
                  className="pointer-events-none absolute right-4 top-3 h-24 w-24 object-contain"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Secretary
                  </div>
                  <div className="mt-3 text-sm font-semibold text-gray-900">
                    {selectedAgenda.secretary}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {selectedAgenda.signatures?.secretarySigned
                      ? `Signed by ${selectedAgenda.signatures.secretarySignedBy || selectedAgenda.secretary}`
                      : "Waiting for signature"}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSignAgendaRole("secretary")}
                    disabled={
                      mutation.isPending ||
                      selectedAgenda.signatures?.secretarySigned === true ||
                      !canCurrentUserSignAsSecretary
                    }
                    className="mt-4 w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {selectedAgenda.signatures?.secretarySigned
                      ? "Signed"
                      : canCurrentUserSignAsSecretary
                        ? "Sign as Secretary"
                        : "Secretary sign only"}
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Minute Checker
                  </div>
                  <div className="mt-3 text-sm font-semibold text-gray-900">
                    {selectedAgenda.minuteChecker}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {selectedAgenda.signatures?.minuteCheckerSigned
                      ? `Signed by ${selectedAgenda.signatures.minuteCheckerSignedBy || selectedAgenda.minuteChecker}`
                      : "Waiting for signature"}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSignAgendaRole("minuteChecker")}
                    disabled={
                      mutation.isPending ||
                      selectedAgenda.signatures?.minuteCheckerSigned === true ||
                      !canCurrentUserSignAsMinuteChecker
                    }
                    className="mt-4 w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {selectedAgenda.signatures?.minuteCheckerSigned
                      ? "Signed"
                      : canCurrentUserSignAsMinuteChecker
                        ? "Sign as Minute Checker"
                        : "Minute Checker sign only"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteAgenda}
                disabled={mutation.isPending || !canCompleteSelectedAgenda}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {mutation.isPending ? "Completing..." : "Complete Agenda"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isViewAppliedModalOpen && selectedAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Applied Topics
              </h3>
              <button
                type="button"
                onClick={() => setIsViewAppliedModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedAgenda.Topics || selectedAgenda.Topics.length === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  No topics have been applied to this agenda yet.
                </p>
              ) : (
                <ul className="space-y-4">
                  {selectedAgenda.Topics.map((topicItem, index) => (
                    <li
                      key={topicItem.id || index}
                      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={topicItem.completed === true}
                          onChange={(event) => {
                            const isChecked = event.target.checked;
                            const updatedTopics = selectedAgenda.Topics.map(
                              (topic) =>
                                topic.id === topicItem.id
                                  ? {
                                      ...topic,
                                      completed: isChecked ? true : null,
                                    }
                                  : topic,
                            );
                            const updatedAgenda = {
                              ...selectedAgenda,
                              Topics: updatedTopics,
                            };
                            const updatedAgendas = agendas.map((agenda) =>
                              agenda.id === updatedAgenda.id
                                ? updatedAgenda
                                : agenda,
                            );
                            mutation.mutate(updatedAgendas);
                          }}
                          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">
                            Suggested by: {topicItem.userid || "Unknown Member"}
                          </div>
                          {isAdmin ? (
                            <button
                              type="button"
                              disabled={mutation.isPending}
                              onClick={() => {
                                const shouldRemove =
                                  window.confirm("Remove this topic?");

                                if (!shouldRemove) {
                                  return;
                                }

                                const updatedTopics =
                                  selectedAgenda.Topics.filter(
                                    (topic) => topic.id !== topicItem.id,
                                  );
                                const updatedAgenda = {
                                  ...selectedAgenda,
                                  Topics: updatedTopics,
                                };
                                const updatedAgendas = agendas.map((agenda) =>
                                  agenda.id === updatedAgenda.id
                                    ? updatedAgenda
                                    : agenda,
                                );
                                mutation.mutate(updatedAgendas);
                              }}
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <div
                          className={`whitespace-pre-wrap text-sm break-all ${
                            topicItem.completed
                              ? "text-gray-400 line-through"
                              : "text-gray-800"
                          }`}
                        >
                          {topicItem.topic}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="gap-3 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:justify-between">
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsViewAppliedModalOpen(false)}
                  className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 sm:w-auto"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewAppliedModalOpen(false);
                    router.push(`/admin/${selectedAgenda.id}`);
                  }}
                  className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 sm:w-auto"
                >
                  Submit a new topic
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/admin/${selectedAgenda.id}`;
                  navigator.clipboard.writeText(url);
                  alert("Application link copied to clipboard!");
                }}
                className="mt-3 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Copy Application Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
