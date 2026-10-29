"use client";

import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/client";

const levels = ["All Levels", "Level 100", "Level 200", "Level 300", "Level 400"];
const heroImages = [
  "/images/campus.png",
  "/images/computer-lab.png",
  "/images/tech-fair.png",
  "/images/executives.png",
];
const categoryLabels: Record<string, string> = {
  lecture_notes: "Lecture notes",
  past_questions: "Past questions",
  assignments: "Assignments",
  slides: "Slides",
  textbooks: "Textbooks",
  other: "Other",
};
const resourceTypes = ["All Types", ...Object.keys(categoryLabels)];

type PublicResource = {
  id: string;
  title: string;
  category: string;
  file_name: string;
  file_extension: string;
  file_size_bytes: number;
  created_at: string;
  courses: {
    course_code: string;
    title: string;
    academic_level: string;
    semester: string;
  };
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const defaultSupportMessage = "Hello, I found your contact on Academic Vault. I need assistance with an assignment or project.";

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let heroVisible = true;
    const updateTimer = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
      if (reducedMotion.matches || document.hidden || !heroVisible) return;
      timer = window.setInterval(() => {
        setActiveImage((current) => (current + 1) % heroImages.length);
      }, 4000);
    };
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          heroVisible = Boolean(entry?.isIntersecting);
          updateTimer();
        }, { threshold: 0.1 });

    if (heroRef.current) observer?.observe(heroRef.current);
    document.addEventListener("visibilitychange", updateTimer);
    reducedMotion.addEventListener("change", updateTimer);
    updateTimer();
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", updateTimer);
      reducedMotion.removeEventListener("change", updateTimer);
    };
  }, []);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [supportMessage, setSupportMessage] = useState(defaultSupportMessage);

  useEffect(() => {
    let cancelled = false;
    async function loadResources() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("resources")
          .select("id, title, category, file_name, file_extension, file_size_bytes, created_at, courses!inner(course_code, title, academic_level, semester)")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setResources((data ?? []) as unknown as PublicResource[]);
      } catch {
        if (!cancelled) setResourcesError("The public library is temporarily unavailable. Please try again later.");
      } finally {
        if (!cancelled) setResourcesLoading(false);
      }
    }
    void loadResources();
    return () => { cancelled = true; };
  }, []);

  const filteredResources = resources.filter((resource) => {
    const searchable = `${resource.title} ${resource.file_name} ${resource.courses.title} ${resource.courses.course_code}`.toLowerCase();
    const matchesSearch = searchable.includes(search.toLowerCase());
    const matchesLevel = selectedLevel === "All Levels" || label(resource.courses.academic_level) === selectedLevel;
    const matchesType = selectedType === "All Types" || resource.category === selectedType;
    const matchesSemester = selectedSemester === "All Semesters" || label(resource.courses.semester) === selectedSemester;
    return matchesSearch && matchesLevel && matchesType && matchesSemester;
  });

  return (
    <main className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <SiteHeader />

      <section ref={heroRef} className="relative isolate overflow-hidden bg-gradient-to-br from-[#071b52] via-[#0b3a91] to-[#176be0] text-white">
        {/* Rotating photographs on the right */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[70%] md:block"
          aria-hidden="true"
        >
          <img
            key={heroImages[activeImage]}
            src={heroImages[activeImage]}
            alt=""
            className="absolute inset-0 h-full w-full animate-photo-in object-cover object-center"
          />
        </div>

        {/* Blue blending overlays */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#071b52] via-[#092c70]/90 to-[#0b3a91]/30"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#071b52]/70 via-transparent to-[#071b52]/15"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-7 px-4 py-10 sm:gap-8 sm:px-6 sm:py-14 md:min-h-[570px] md:grid-cols-[1.05fr_.95fr] md:gap-4 md:py-16 lg:min-h-[640px] lg:px-8">
          {/* Hero text */}
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-[11px] font-semibold leading-5 tracking-wide text-white shadow-sm backdrop-blur-md sm:mb-6 sm:px-4 sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,.9)]" /> UENR · Department of Information Technology
            </p>

            <h2 className="max-w-2xl text-[clamp(2.15rem,8.5vw,3.75rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
              Your knowledge.
              <br />
              Your resources.
              <br />
              <span className="text-sky-200">Your academic vault.</span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-50 sm:mt-6 sm:text-lg sm:leading-8">
              Access lecture slides, past examination questions, revision notes
              and study materials — organized for Levels 100 through 400.
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <a
                href="#resources"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-blue-950 shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:px-6 sm:py-3.5 sm:text-base"
              >
                Explore Study Materials <span className="ml-2">→</span>
              </a>

              <a
                href="#about"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-5 py-3 text-center text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:px-6 sm:py-3.5 sm:text-base"
              >
                About the Vault
              </a>
            </div>

            {/* Academic statistics */}
            <div className="mt-7 grid max-w-xl grid-cols-3 gap-2 border-t border-white/25 pt-5 sm:mt-10 sm:gap-8 sm:pt-6">
              <div>
                <p className="text-2xl font-extrabold sm:text-3xl">4</p>
                <p className="mt-1 text-[11px] leading-4 text-blue-100 sm:text-sm">
                  Academic Levels
                </p>
              </div>

              <div>
                <p className="text-2xl font-extrabold sm:text-3xl">24/7</p>
                <p className="mt-1 text-[11px] leading-4 text-blue-100 sm:text-sm">
                  Resource Access
                </p>
              </div>

              <div>
                <p className="text-2xl font-extrabold sm:text-3xl">Free</p>
                <p className="mt-1 text-[11px] leading-4 text-blue-100 sm:text-sm">
                  Student Access
                </p>
              </div>
            </div>

            {/* Slideshow indicators */}
            <div
              role="group"
              className="mt-2 flex min-h-11 items-center gap-1"
              aria-label={`Hero photo ${activeImage + 1} of ${heroImages.length}`}
            >
              {heroImages.map((image, index) => (
                <button key={image} type="button" onClick={() => setActiveImage(index)} aria-label={`Show campus photo ${index + 1}`} aria-pressed={activeImage === index} className="inline-flex h-11 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
                  <span aria-hidden="true" className={`h-2 rounded-full transition-[width,background-color] duration-300 ${activeImage === index ? "w-7 bg-white" : "w-2 bg-white/55 hover:bg-white/90"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Mobile photograph */}
          <div className="relative mx-auto h-[clamp(12rem,52vw,20rem)] w-full overflow-hidden rounded-[1.5rem] border border-white/25 shadow-2xl md:hidden">
            <img key={heroImages[activeImage]} src={heroImages[activeImage]} alt="" className="absolute inset-0 h-full w-full animate-photo-in object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/45 to-transparent" />
          </div>
        </div>
      </section>

      <section id="resources"className="mx-auto max-w-7xl scroll-mt-24 px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">
            Your learning library
          </p>
          <h2 className="mt-2 text-[clamp(1.8rem,5vw,2.5rem)] font-extrabold leading-tight tracking-tight text-blue-950">
            Find your study materials
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Search by course or filter resources by your academic level.
          </p>
        </div>

        <div className="mb-6 grid min-w-0 gap-2.5 rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_18px_50px_-38px_rgba(30,64,175,.55)] sm:gap-3 sm:p-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr] sm:mb-8">
          <input
            aria-label="Search approved resources"
            type="search"
            placeholder="Search courses and resources..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

          <select
            aria-label="Filter by academic level"
            value={selectedLevel}
            onChange={(event) => setSelectedLevel(event.target.value)}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by resource category"
  value={selectedType}
  onChange={(event) => setSelectedType(event.target.value)}
  className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
>
  {resourceTypes.map((type) => (
  <option key={type} value={type}>
    {type === "All Types" ? "All Resource Types" : categoryLabels[type]}
  </option>
))}
</select>
          <select
            aria-label="Filter by semester"
            value={selectedSemester}
            onChange={(event) => setSelectedSemester(event.target.value)}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            {["All Semesters", "Semester 1", "Semester 2"].map((semester) => <option key={semester}>{semester}</option>)}
          </select>
        </div>
        <p aria-live="polite" className="mb-4 text-sm text-slate-600">
          {resourcesLoading ? "Loading approved resources…" : resourcesError ? "Library unavailable" : "Showing"}{" "}
          <span className="font-semibold text-blue-700">{resourcesLoading || resourcesError ? "—" : filteredResources.length}</span>{" "}
          {!resourcesLoading && !resourcesError && (filteredResources.length === 1 ? "resource" : "resources")}
        </p>
<div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">          {resourcesLoading ? (
            <div role="status" className="col-span-full rounded-2xl border border-blue-100 bg-white px-6 py-12 text-center text-sm font-medium text-blue-900">Loading approved resources…</div>
          ) : resourcesError ? (
          <div role="alert" className="col-span-full rounded-2xl border border-red-200 bg-white px-5 py-10 text-center text-sm leading-6 text-red-800 sm:px-6 sm:py-12">{resourcesError}</div>
          ) : filteredResources.length > 0 ? (
  filteredResources.map((resource) => (
    
<div
  key={resource.id}
  className="group min-w-0 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-4"
>
  <div className="flex min-w-0 items-start gap-3">
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[10px] font-extrabold uppercase text-blue-800 ring-1 ring-blue-100"
      aria-hidden="true"
    >
      {resource.file_extension}
    </div>

    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
        {categoryLabels[resource.category] ?? "Resource"}
      </div>

      <h3 className="mt-1 break-words text-base font-bold leading-snug text-slate-900">
        {resource.title}
      </h3>

      <p className="mt-1 break-words text-xs leading-5 text-slate-600">
        {resource.courses.course_code} · {resource.courses.title}
      </p>
    </div>
  </div>

  <div className="mt-3 flex flex-wrap gap-1.5">
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
      {label(resource.courses.academic_level)}
    </span>

    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
      {label(resource.courses.semester)}
    </span>

    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
      Approved
    </span>
  </div>

  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
    <span className="min-w-0 text-[11px] text-slate-500">
      {fileSize(resource.file_size_bytes)} ·{" "}
      {new Date(resource.created_at).toLocaleDateString()}
    </span>

    <span className="shrink-0 text-[11px] font-medium uppercase text-slate-400">
      {resource.file_extension}
    </span>
  </div>

  <a
    href={`/api/resources/${resource.id}/file?mode=${resource.file_extension === "pdf" ? "preview" : "download"}`}
    target={resource.file_extension === "pdf" ? "_blank" : undefined}
    rel={resource.file_extension === "pdf" ? "noopener noreferrer" : undefined}
    className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-blue-800 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
  >
    {resource.file_extension === "pdf" ? "Preview PDF" : "Download resource"}
  </a>
</div>

  ))
) : (
  <div className="col-span-full rounded-2xl border border-dashed border-blue-200 bg-white px-5 py-10 text-center sm:px-6 sm:py-12">
    <div aria-hidden="true" className="text-4xl">{resources.length ? "🔎" : "📚"}</div>

    <h3 className="mt-4 text-lg font-bold text-slate-900">
      {resources.length ? "No resources match those filters" : "No approved resources yet"}
    </h3>

    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
      {resources.length ? "Try another keyword or change your filters to see more approved study materials." : "Approved course materials will appear here after they are reviewed. There are no public resources to display right now."}
    </p>
    {resources.length > 0 && <button type="button" onClick={() => { setSearch(""); setSelectedLevel("All Levels"); setSelectedType("All Types"); setSelectedSemester("All Semesters"); }} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-blue-200 px-5 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Clear filters</button>}
  </div>
)}
        </div>

      </section>

      <section id="about" className="border-t border-blue-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-blue-950">
              Academic Vault
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Supporting learning in the UENR Department of Information
              Technology.
            </p>
          </div>
          <p className="mt-5 text-sm text-slate-400 md:mt-0">
            Built for students · Levels 100–400
          </p>
        </div>
      </section>

      <section aria-labelledby="support-title" className="bg-[#f5f8ff] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#091d50] via-[#0b3a91] to-[#176be0] p-5 text-white shadow-xl shadow-blue-950/10 sm:gap-8 sm:rounded-[2rem] sm:p-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-sky-200">Student support</p>
            <h2 id="support-title" className="mt-2 max-w-xl text-[clamp(1.45rem,5vw,1.9rem)] font-extrabold leading-tight tracking-tight">Need Help With an Assignment or Project?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Get one-to-one assignment support and project guidance from our student support contacts.</p>
          </div>
          <div className="min-w-0 rounded-3xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md sm:p-5">
            <label htmlFor="whatsapp-message" className="text-sm font-semibold text-white">Your message</label>
            <textarea id="whatsapp-message" value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} rows={3} className="mt-2 min-h-24 w-full min-w-0 resize-y rounded-2xl border border-white/30 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-sky-200" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <a href={`https://wa.me/233535542438?text=${encodeURIComponent(supportMessage.trim() || defaultSupportMessage)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-blue-950 transition hover:-translate-y-0.5 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">WhatsApp · 053 554 2438</a>
<a

  href={`https://wa.me/233509866985?text=${encodeURIComponent(supportMessage.trim() || defaultSupportMessage)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
>
  WhatsApp · 050 986 6985
</a>            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
