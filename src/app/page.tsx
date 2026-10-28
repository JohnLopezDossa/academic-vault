"use client";

import { useEffect, useState } from "react";

const levels = ["All Levels", "Level 100", "Level 200", "Level 300", "Level 400"];
const resourceTypes = [
  "All Types",
  "Lecture Slides",
  "Past Questions",
  "Study Notes",
  "Likely Questions",
  "Assignments",
  "Practical Materials",
];

const resources = [
  {
    title: "Introduction to Programming",
    course: "Programming Fundamentals",
    level: "Level 100",
    semester: "Semester 1",
    year: "2025/2026",
    type: "Lecture Slides",
    icon: "📘",
  },
  {
    title: "Database Management Systems",
    course: "Database Concepts and Design",
    level: "Level 300",
    semester: "Semester 1",
    year: "2025/2026",
    type: "Past Questions",
    icon: "📝",
  },
  {
    title: "Computer Networks Revision",
    course: "Data Communication and Networks",
    level: "Level 200",
    semester: "Semester 2",
    year: "2025/2026",
    type: "Study Notes",
    icon: "📗",
  },
  {
    title: "Software Engineering Practice",
    course: "Software Engineering",
    level: "Level 400",
    semester: "Semester 2",
    year: "2025/2026",
    type: "Likely Questions",
    icon: "📚",
  },
];

const defaultSupportMessage = "Hello, I found your contact on Academic Vault. I need assistance with an assignment or project.";

export default function Home() {
  const heroImages = [
    "/images/campus.png",
    "/images/computer-lab.png",
    "/images/tech-fair.png",
    "/images/executives.png",
  ];

  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImage((current) => (current + 1) % heroImages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [heroImages.length]);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");
  const [selectedType, setSelectedType] = useState("All Types");
  const [supportMessage, setSupportMessage] = useState(defaultSupportMessage);


  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(search.toLowerCase()) ||
      resource.course.toLowerCase().includes(search.toLowerCase());

    const matchesLevel =
  selectedLevel === "All Levels" || resource.level === selectedLevel;

const matchesType =
  selectedType === "All Types" || resource.type === selectedType;

return matchesSearch && matchesLevel && matchesType;
  });

  return (
    <main className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-blue-100/80 bg-white/95 shadow-[0_8px_30px_-24px_rgba(15,23,42,.5)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3">

<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white shadow-sm">
  <img
    src="/images/its-logo.png"
    alt="Information Technology Society logo"
    className="h-full w-full object-contain"
  />
</div>
<div>
              <h1 className="text-xl font-extrabold tracking-tight text-blue-950">
                Academic Vault
              </h1>
              <p className="text-xs text-slate-500">
                Information Technology · UENR
              </p>
            </div>
          </a>


<nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
  <a
    href="#resources"
    className="text-blue-700 transition-colors hover:text-blue-900"
  >
    Study Materials
  </a>

  <a
    href="#resources"
    className="text-slate-600 transition-colors hover:text-blue-700"
  >
    Past Questions
  </a>

  <a
    href="#about"
    className="text-slate-600 transition-colors hover:text-blue-700"
  >
    About
  </a>
  <a
    href="/upload"
    className="text-slate-600 transition-colors hover:text-blue-700"
  >
    Upload Resource
  </a>
</nav>


          <a
            href="#resources"
            className="hidden rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:inline-flex"
          >
            Explore Resources
          </a>
          <a
            href="/upload"
            className="rounded-full bg-blue-800 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:hidden"
          >
            Upload Resource
          </a>
        </div>
      </header>



      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#071b52] via-[#0b3a91] to-[#176be0] text-white">
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

        <div className="relative z-10 mx-auto grid min-h-[610px] max-w-7xl grid-cols-1 items-center gap-8 px-5 py-14 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:gap-4 md:py-20 lg:min-h-[680px]">
          {/* Hero text */}
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,.9)]" /> UENR · Department of Information Technology
            </p>

            <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.04] tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
              Your knowledge.
              <br />
              Your resources.
              <br />
              <span className="text-sky-200">Your academic vault.</span>
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-blue-50 sm:text-lg sm:leading-8">
              Access lecture slides, past examination questions, revision notes
              and study materials — organized for Levels 100 through 400.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#resources"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 font-bold text-blue-950 shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30"
              >
                Explore Study Materials <span className="ml-2">→</span>
              </a>

              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                About the Vault
              </a>
            </div>

            {/* Academic statistics */}
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/25 pt-6 sm:gap-8">
              <div>
                <p className="text-2xl font-extrabold sm:text-3xl">4</p>
                <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                  Academic Levels
                </p>
              </div>

              <div>
                <p className="text-2xl font-extrabold sm:text-3xl">24/7</p>
                <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                  Resource Access
                </p>
              </div>

              <div>
                <p className="text-2xl font-extrabold sm:text-3xl">Free</p>
                <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                  Student Access
                </p>
              </div>
            </div>

            {/* Slideshow indicators */}
            <div
              className="mt-5 flex items-center gap-2"
              aria-label={`Hero photo ${activeImage + 1} of ${heroImages.length}`}
            >
              {heroImages.map((image, index) => (
                <button key={image} type="button" onClick={() => setActiveImage(index)} aria-label={`Show campus photo ${index + 1}`} aria-current={activeImage === index} className={`h-2 rounded-full transition-all duration-300 ${activeImage === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />
              ))}
            </div>
          </div>

          {/* Mobile photograph */}
          <div className="relative mx-auto h-64 w-full max-w-lg overflow-hidden rounded-3xl border border-white/25 shadow-2xl md:hidden">
            <img key={heroImages[activeImage]} src={heroImages[activeImage]} alt="" className="absolute inset-0 h-full w-full animate-photo-in object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/45 to-transparent" />
          </div>
        </div>
      </section>

      <section id="resources" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">
            Your learning library
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">
            Find your study materials
          </h2>
          <p className="mt-3 text-slate-600">
            Search by course or filter resources by your academic level.
          </p>
        </div>

        <div className="mb-8 grid gap-3 rounded-3xl border border-blue-100 bg-white p-3 shadow-[0_18px_50px_-38px_rgba(30,64,175,.55)] md:grid-cols-[1.5fr_1fr_1fr]">
          <input
            type="search"
            placeholder="Search courses and resources..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={selectedLevel}
            onChange={(event) => setSelectedLevel(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <select
  value={selectedType}
  onChange={(event) => setSelectedType(event.target.value)}
  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
>
  {resourceTypes.map((type) => (
  <option key={type} value={type}>
    {type === "All Types" ? "All Resource Types" : type}
  </option>
))}
</select>
        </div>
<p className="mb-4 text-sm text-slate-600">
  Showing{" "}
  <span className="font-semibold text-blue-700">
    {filteredResources.length}
  </span>{" "}
  {filteredResources.length === 1 ? "resource" : "resources"}
</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {filteredResources.length > 0 ? (
  filteredResources.map((resource) => (
    <div
      key={resource.title}
      className="group rounded-3xl border border-blue-100/80 bg-white p-6 shadow-[0_10px_30px_-24px_rgba(30,64,175,.5)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_50px_-28px_rgba(30,64,175,.38)]"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl ring-1 ring-blue-100 transition group-hover:bg-blue-100">{resource.icon}</div>

      <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        {resource.type}
      </span>

      <h3 className="mt-2 text-lg font-bold text-slate-900">
        {resource.title}
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        {resource.course}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {resource.level}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {resource.semester}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {resource.year}
        </span>
      </div>

      <button
        type="button"
        disabled
      className="mt-6 w-full cursor-not-allowed rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
      >
        Download PDF — Coming Soon
      </button>
    </div>
  ))
) : (
  <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <div className="text-4xl">🔎</div>

    <h3 className="mt-4 text-lg font-bold text-slate-900">
      No resources found
    </h3>

    <p className="mt-2 text-sm text-slate-600">
      Try another keyword or change your filters.
    </p>
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

      <section aria-labelledby="support-title" className="bg-[#f5f8ff] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#091d50] via-[#0b3a91] to-[#176be0] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-9 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-sky-200">Student support</p>
            <h2 id="support-title" className="mt-2 max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl">Need Help With an Assignment or Project?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Get one-to-one assignment support and project guidance from our student support contacts. Edit the message before opening WhatsApp.</p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-5">
            <label htmlFor="whatsapp-message" className="text-sm font-semibold text-white">Your message</label>
            <textarea id="whatsapp-message" value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-2xl border border-white/30 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-sky-200" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <a href={`https://wa.me/233535542438?text=${encodeURIComponent(supportMessage.trim() || defaultSupportMessage)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-blue-950 transition hover:-translate-y-0.5 hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-white/30">WhatsApp · 053 554 2438</a>
              <a href={`https://wa.me/233509869865?text=${encodeURIComponent(supportMessage.trim() || defaultSupportMessage)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30">WhatsApp · 050 986 6985</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
