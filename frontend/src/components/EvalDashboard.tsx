import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import * as React from "react";
import YAML from "yaml";

interface EvalDashboardProps {
  baseResumeYaml: string;
}

const PRESETS = [
  {
    name: "Optum - Senior AI/ML Engineer",
    description: "Optum is looking for a Senior AI/ML Engineer...",
    input: `Optum is looking for a Senior AI/ML Engineer. You will design, develop, and deploy AI-driven solutions to improve healthcare outcomes. Focus area: integration of machine learning models, Large Language Models (LLMs), and scalable software engineering. Key Responsibilities:
- Build agentic AI applications using frameworks like LangChain, LangGraph, and AutoGen
- Fine-tune, evaluate, and monitor LLM networks and RAG pipelines
- Build scalable APIs and microservices in Python
- Work on ethical AI, bias mitigation, and observability using OpenTelemetry
Qualifications:
- Strong Python and SQL skills
- Hands-on with Docker, Kubernetes, and Cloud Platforms (Azure/AWS)
- Experience with PyTorch, Scikit-learn, and MLflow`,
  },
  {
    name: "Stripe - Staff AI/ML Engineer",
    description: "Stripe is hiring a Staff AI/Machine Learning Engineer...",
    input: `Stripe is hiring a Staff AI/Machine Learning Engineer to drive large-scale AI initiatives across Stripe's core financial infrastructure. You will own the end-to-end architecture of complex AI/ML systems, design solutions for high-leverage challenges like low-latency model inference and real-time agent/LLM orchestration, and influence engineering best practices.
Qualifications:
- 10+ years of professional software development experience
- Deep expertise in ML frameworks (PyTorch) and distributed systems
- Familiarity with LLM orchestration, RAG, and agentic workflows`,
  },
  {
    name: "Apple - Senior Data Scientist",
    description: "Apple's AI/ML team is seeking a Senior Data Scientist...",
    input: `Apple's AI/ML team is seeking a Senior Data Scientist. You will design and develop machine learning models to analyze user behavior, create predictive models, and deliver interpretability for AI applications. Key requirements: expertise in Python, R, SQL, PyTorch/TensorFlow, and statistics. Experience with model evaluation, data visualization, and MLFlow is required.`,
  },
  {
    name: "Vercel - Senior Front-End Developer",
    description: "Vercel is looking for a Senior Front-End Developer...",
    input: `Vercel is looking for a Senior Front-End Developer to join our core UI framework team. You will build and optimize user-facing interfaces, work with Astro and Next.js, and design premium, highly interactive portfolios and user dashboards. Key requirements: expert CSS, HTML5, TypeScript, React, accessibility (WCAG), and frontend test suites (Vitest/Playwright).`,
  },
];

export const EvalDashboard = ({ baseResumeYaml }: EvalDashboardProps) => {
  const [jobDescription, setJobDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Results state
  const [score, setScore] = React.useState<number | null>(null);
  const [tailoredYaml, setTailoredYaml] = React.useState<string | null>(null);
  const [companyName, setCompanyName] = React.useState<string | null>(null);

  const handleSelectPreset = (index: number) => {
    setJobDescription(PRESETS[index].input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      setError("Please enter a job description or select a preset.");
      return;
    }

    setLoading(true);
    setError(null);
    setScore(null);
    setTailoredYaml(null);
    setCompanyName(null);

    try {
      const response = await fetch("http://localhost:8001/api/tailor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      setScore(data.score);

      // Convert JSON tailored resume to YAML string
      if (data.final_resume) {
        const yamlStr = YAML.stringify(data.final_resume);
        setTailoredYaml(yamlStr);
      }

      // Extract company name from output_dir
      if (data.output_dir) {
        const parts = data.output_dir.replace(/\\/g, "/").split("/");
        const comp = parts.pop() || "Tailored";
        setCompanyName(comp);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to tailor resume. Make sure backend is running on port 8001.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper to highlight tailored diffs
  const renderTailoredLine = (
    line: string,
    index: number,
    baseLinesSet: Set<string>,
  ) => {
    const trimmed = line.trim();

    // Ignore empty lines, YAML list markers or key declarations
    const isStructure =
      trimmed === "" ||
      trimmed.endsWith(":") ||
      trimmed === "-" ||
      trimmed.startsWith("- name:") ||
      trimmed.startsWith("name:") ||
      trimmed.startsWith("basics:") ||
      trimmed.startsWith("work:") ||
      trimmed.startsWith("education:") ||
      trimmed.startsWith("skills:") ||
      trimmed.startsWith("projects:");

    const isTailored = !isStructure && !baseLinesSet.has(trimmed);

    return (
      <div
        key={`tailored-line-${index}`}
        className={`line py-0.5 px-2 font-mono text-xs leading-5 break-all ${
          isTailored
            ? "bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500"
            : "text-slate-300"
        }`}
      >
        <span className="select-none inline-block w-8 text-slate-600 mr-2 text-right">
          {index + 1}
        </span>
        {line}
      </div>
    );
  };

  const baseLines = React.useMemo(() => baseResumeYaml.split("\n"), [baseResumeYaml]);
  const baseLinesSet = React.useMemo(() => {
    return new Set(baseLines.map((l) => l.trim()));
  }, [baseLines]);

  return (
    <div className="eval-portal max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-accent-indigo to-accent-cyan">
          <Sparkles className="h-8 w-8 text-accent-cyan" />
          Interactive Resume Tailoring Portal
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Select a job description template or paste your own to run the LangGraph
          tailoring agent. Review the score and see a live comparison.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-lg font-medium mb-4 text-white">
              1. Select Job Preset
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    const idx = PRESETS.findIndex((p) => p.name === preset.name);
                    handleSelectPreset(idx);
                  }}
                  className="text-left p-3 rounded-lg border border-slate-800 hover:border-accent-cyan bg-slate-950/40 hover:bg-slate-900/50 transition-all group"
                >
                  <div className="font-semibold text-xs text-accent-cyan group-hover:text-white flex items-center justify-between">
                    {preset.name}
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4"
          >
            <h2 className="text-lg font-medium text-white">2. Job Description Input</h2>

            <div>
              <label
                htmlFor="base-resume-select"
                className="block text-xs font-semibold text-slate-400 mb-2"
              >
                Base Resume Source
              </label>
              <select
                id="base-resume-select"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs outline-none focus:border-accent-indigo"
              >
                <option>resume.yaml (Production Default)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="job-description-input"
                className="block text-xs font-semibold text-slate-400 mb-2"
              >
                Job Description Text
              </label>
              <textarea
                id="job-description-input"
                rows={10}
                placeholder="Paste the target job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 text-xs outline-none focus:border-accent-cyan resize-y font-sans leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-accent-indigo to-accent-cyan hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer shadow-lg shadow-accent-indigo/10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agent Execution Active...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Tailor Resume Now
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-3 items-start">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* Right Dashboard / Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics & Downloads Summary */}
          {score !== null && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/40 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* ATS Score */}
              <div className="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 mb-2">
                  ATS Alignment Score
                </span>
                <div className="relative flex items-center justify-center w-24 h-24">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <title>ATS Alignment Score Progress</title>
                    <path
                      className="text-slate-800"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-accent-cyan transition-all duration-1000 ease-out"
                      strokeDasharray={`${score}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-2xl font-bold text-white">{score}%</div>
                </div>
              </div>

              {/* Status Details */}
              <div className="flex flex-col justify-center md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-white font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Agent Tailoring Completed Successfully
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    The LLM agent optimized your resume bullet points, summary section,
                    and technologies list to match the job requirements.
                  </p>
                </div>

                {companyName && (
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`http://localhost:8001/output/${companyName}/${companyName}_Resume.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-accent-cyan text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
                    >
                      <Download className="h-3.5 w-3.5 text-accent-cyan" />
                      Download PDF
                    </a>
                    <a
                      href={`http://localhost:8001/output/${companyName}/${companyName}_Resume.md`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-accent-indigo text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
                    >
                      <FileText className="h-3.5 w-3.5 text-accent-indigo" />
                      View Markdown
                    </a>
                    <a
                      href={`/for/${companyName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Live Portfolio Route
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Side-by-Side YAML Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Resume */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden flex flex-col h-[550px]">
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Base Resume (resume.yaml)
                </span>
                <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                  base source
                </span>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 p-2 select-text custom-scrollbar">
                {baseLines.map((line, idx) => {
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: lines in a text file are static and indexed by line number
                      key={`base-line-${idx}`}
                      className="line py-0.5 px-2 font-mono text-xs leading-5 text-slate-400 break-all"
                    >
                      <span className="select-none inline-block w-8 text-slate-700 mr-2 text-right">
                        {idx + 1}
                      </span>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tailored Resume */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden flex flex-col h-[550px]">
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Tailored Resume
                </span>
                <span className="text-[10px] text-emerald-500 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                  highlighted additions
                </span>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 p-2 select-text custom-scrollbar">
                {tailoredYaml ? (
                  tailoredYaml
                    .split("\n")
                    .map((line, idx) => renderTailoredLine(line, idx, baseLinesSet))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center">
                    <Sparkles className="h-8 w-8 text-slate-700 mb-2" />
                    {loading
                      ? "Agent is currently editing the resume YAML..."
                      : "Run the tailoring agent to generate output comparisons."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
