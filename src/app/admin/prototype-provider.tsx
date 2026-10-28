"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  demoCommitteeMemberId,
  initialActivity,
  initialMembers,
  initialResources,
  initialSubmissions,
  type Activity,
  type Member,
  type Resource,
  type ResourceStatus,
  type Submission,
  type SubmissionStatus,
} from "./prototype-data";

type PrototypeContextValue = {
  submissions: Submission[];
  resources: Resource[];
  members: Member[];
  activity: Activity[];
  committeeMember: Member;
  decideSubmission: (id: string, status: Exclude<SubmissionStatus, "Pending">, reason?: string) => void;
  setResourceStatus: (id: string, status: ResourceStatus) => void;
  removeResource: (id: string) => void;
  saveMember: (member: Omit<Member, "id"> & { id?: string }) => void;
  toggleMember: (id: string) => void;
};

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [resources, setResources] = useState(initialResources);
  const [members, setMembers] = useState(initialMembers);
  const [activity, setActivity] = useState(initialActivity);

  const recordActivity = useCallback((title: string, detail: string) => {
    setActivity((current) => [{ id: Date.now(), title, detail, time: "Just now" }, ...current].slice(0, 8));
  }, []);

  const decideSubmission = useCallback((id: string, status: Exclude<SubmissionStatus, "Pending">, reason = "") => {
    setSubmissions((current) => current.map((item) => item.id === id ? { ...item, status, description: status === "Rejected" && reason ? `${item.description} Rejection reason: ${reason}` : item.description } : item));
    const submission = submissions.find((item) => item.id === id);
    recordActivity(status === "Approved" ? "Submission approved · prototype" : "Submission rejected · prototype", submission?.filename ?? id);
  }, [recordActivity, submissions]);

  const setResourceStatus = useCallback((id: string, status: ResourceStatus) => {
    setResources((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    const resource = resources.find((item) => item.id === id);
    recordActivity(status === "Published" ? "Resource published · prototype" : "Resource unpublished · prototype", resource?.title ?? id);
  }, [recordActivity, resources]);

  const removeResource = useCallback((id: string) => {
    const resource = resources.find((item) => item.id === id);
    setResources((current) => current.filter((item) => item.id !== id));
    recordActivity("Resource removed · prototype", resource?.title ?? id);
  }, [recordActivity, resources]);

  const saveMember = useCallback((member: Omit<Member, "id"> & { id?: string }) => {
    if (member.id) {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...member, id: member.id! } : item));
      recordActivity("Member updated · prototype", member.name);
    } else {
      const newMember = { ...member, id: `member-${Date.now()}` };
      setMembers((current) => [...current, newMember]);
      recordActivity("Demo member added · prototype", newMember.name);
    }
  }, [recordActivity]);

  const toggleMember = useCallback((id: string) => {
    const member = members.find((item) => item.id === id);
    if (!member || member.role === "Main admin") return;
    const status = member.status === "Active" ? "Inactive" : "Active";
    setMembers((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    recordActivity(`Member ${status.toLowerCase()} · prototype`, member.name);
  }, [members, recordActivity]);

  const committeeMember = members.find((member) => member.id === demoCommitteeMemberId) ?? initialMembers[1];
  const value = useMemo(() => ({ submissions, resources, members, activity, committeeMember, decideSubmission, setResourceStatus, removeResource, saveMember, toggleMember }), [submissions, resources, members, activity, committeeMember, decideSubmission, setResourceStatus, removeResource, saveMember, toggleMember]);

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("usePrototype must be used inside PrototypeProvider");
  return context;
}
