export type SubmissionStatus = "Pending" | "Approved" | "Rejected";
export type ResourceStatus = "Published" | "Unpublished";
export type MemberRole = "Main admin" | "Sub-admin";
export type MemberStatus = "Active" | "Inactive";
export type Permission = "Upload resources" | "Review submissions" | "Manage resources" | "Manage members";

export type Submission = {
  id: string;
  batchId: string;
  contributor: string;
  courseTitle: string;
  courseCode: string;
  level: string;
  semester: string;
  submittedAt: string;
  filename: string;
  fileType: string;
  size: number;
  category: string;
  status: SubmissionStatus;
  description: string;
};

export type Resource = {
  id: string;
  title: string;
  courseTitle: string;
  courseCode: string;
  level: string;
  category: string;
  uploader: string;
  uploadedAt: string;
  status: ResourceStatus;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  permissions: Permission[];
  status: MemberStatus;
};

export type Activity = {
  id: number;
  title: string;
  detail: string;
  time: string;
};

export const initialSubmissions: Submission[] = [
  { id: "sub-01", batchId: "batch-networks", contributor: "Casey Sample", courseTitle: "Data Communication and Networks", courseCode: "IT 321", level: "Level 300", semester: "Semester 1", submittedAt: "2026-10-27", filename: "Lecture 1 - Network Models.pdf", fileType: "PDF", size: 1843200, category: "Lecture notes", status: "Pending", description: "OSI and TCP/IP reference models." },
  { id: "sub-02", batchId: "batch-networks", contributor: "Casey Sample", courseTitle: "Data Communication and Networks", courseCode: "IT 321", level: "Level 300", semester: "Semester 1", submittedAt: "2026-10-27", filename: "Lecture 2 - Signals.pptx", fileType: "PPTX", size: 4325376, category: "Slides", status: "Pending", description: "Signal types and transmission basics." },
  { id: "sub-03", batchId: "batch-networks", contributor: "Casey Sample", courseTitle: "Data Communication and Networks", courseCode: "IT 321", level: "Level 300", semester: "Semester 1", submittedAt: "2026-10-27", filename: "Lecture 3 - Media.pdf", fileType: "PDF", size: 2318336, category: "Lecture notes", status: "Pending", description: "A guide to wired and wireless media." },
  { id: "sub-04", batchId: "batch-database", contributor: "Student Demo B", courseTitle: "Database Concepts and Design", courseCode: "IT 305", level: "Level 300", semester: "Semester 1", submittedAt: "2026-10-26", filename: "Database_2024_Past_Questions.pdf", fileType: "PDF", size: 3244032, category: "Past questions", status: "Pending", description: "End of semester revision questions." },
  { id: "sub-05", batchId: "batch-programming", contributor: "Student Demo C", courseTitle: "Programming Fundamentals", courseCode: "IT 103", level: "Level 100", semester: "Semester 2", submittedAt: "2026-10-25", filename: "Programming_Assignment_2.docx", fileType: "DOCX", size: 622592, category: "Assignments", status: "Pending", description: "Practice problems and worked examples." },
  { id: "sub-06", batchId: "batch-project", contributor: "Student Demo D", courseTitle: "Project Management", courseCode: "IT 411", level: "Level 400", semester: "Semester 1", submittedAt: "2026-10-24", filename: "Project_Planning_Guide.txt", fileType: "TXT", size: 28672, category: "Other", status: "Pending", description: "Project planning checklist for final year teams." },
  { id: "sub-07", batchId: "batch-software", contributor: "Student Demo E", courseTitle: "Software Engineering", courseCode: "IT 402", level: "Level 400", semester: "Semester 1", submittedAt: "2026-10-22", filename: "Software_Design_Notes.pdf", fileType: "PDF", size: 1677721, category: "Lecture notes", status: "Approved", description: "Design principles and modelling notes." },
  { id: "sub-08", batchId: "batch-math", contributor: "Student Demo F", courseTitle: "Discrete Mathematics", courseCode: "IT 201", level: "Level 200", semester: "Semester 2", submittedAt: "2026-10-21", filename: "Discrete_Math_Quiz_Solutions.doc", fileType: "DOC", size: 901120, category: "Assignments", status: "Rejected", description: "Practice solutions; metadata needs correction." },
];

export const initialResources: Resource[] = [
  { id: "res-01", title: "Programming Fundamentals — Lecture 1", courseTitle: "Programming Fundamentals", courseCode: "IT 103", level: "Level 100", category: "Lecture notes", uploader: "Student Demo G", uploadedAt: "2026-10-18", status: "Published" },
  { id: "res-02", title: "Database Systems Past Questions", courseTitle: "Database Concepts and Design", courseCode: "IT 305", level: "Level 300", category: "Past questions", uploader: "Student Demo H", uploadedAt: "2026-10-16", status: "Published" },
  { id: "res-03", title: "Networks — Signals and Media", courseTitle: "Data Communication and Networks", courseCode: "IT 321", level: "Level 300", category: "Slides", uploader: "Committee Demo", uploadedAt: "2026-10-14", status: "Unpublished" },
  { id: "res-04", title: "Software Engineering Project Brief", courseTitle: "Software Engineering", courseCode: "IT 402", level: "Level 400", category: "Assignments", uploader: "Student Demo I", uploadedAt: "2026-10-12", status: "Published" },
  { id: "res-05", title: "Discrete Mathematics Reference", courseTitle: "Discrete Mathematics", courseCode: "IT 201", level: "Level 200", category: "Textbooks", uploader: "Student Demo J", uploadedAt: "2026-10-10", status: "Unpublished" },
];

export const initialMembers: Member[] = [
  { id: "member-admin", name: "Academic Vault Admin Demo", email: "admin.demo@example.com", role: "Main admin", permissions: ["Upload resources", "Review submissions", "Manage resources", "Manage members"], status: "Active" },
  { id: "member-committee-a", name: "Casey Sample", email: "casey.sample@example.com", role: "Sub-admin", permissions: ["Upload resources", "Review submissions"], status: "Active" },
  { id: "member-committee-b", name: "Riley Example", email: "riley.example@example.com", role: "Sub-admin", permissions: ["Upload resources"], status: "Active" },
  { id: "member-committee-c", name: "Taylor Demo", email: "taylor.demo@example.com", role: "Sub-admin", permissions: ["Review submissions"], status: "Inactive" },
];

export const initialActivity: Activity[] = [
  { id: 4, title: "Batch received", detail: "Three network lecture files from Student Demo A", time: "Today · 10:42" },
  { id: 3, title: "Resource published", detail: "Programming Fundamentals — Lecture 1", time: "Yesterday · 15:18" },
  { id: 2, title: "Submission reviewed", detail: "Software Design Notes approved", time: "22 Oct · 11:06" },
  { id: 1, title: "Member permissions updated", detail: "Committee Demo access refreshed", time: "20 Oct · 09:30" },
];

export const demoCommitteeMemberId = "member-committee-a";

export const committeeRecentUploads = [
  { filename: "Lecture 1 - Network Models.pdf", courseCode: "IT 321", submittedAt: "2026-10-27", status: "Pending" },
  { filename: "Lecture 2 - Signals.pptx", courseCode: "IT 321", submittedAt: "2026-10-27", status: "Pending" },
  { filename: "Lecture 3 - Media.pdf", courseCode: "IT 321", submittedAt: "2026-10-27", status: "Pending" },
];
