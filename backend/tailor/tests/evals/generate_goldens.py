import json
from pathlib import Path


def generate_dataset() -> None:
    # High-fidelity realistic job descriptions matching Alex's skills
    optum_jd = (
        "Optum is looking for a Senior AI/ML Engineer. You will design, "
        "develop, and deploy AI-driven solutions to improve healthcare "
        "outcomes. Focus area: integration of machine learning models, "
        "Large Language Models (LLMs), and scalable software engineering. "
        "Key Responsibilities:\n"
        "- Build agentic AI applications using frameworks like LangChain, "
        "LangGraph, and AutoGen\n"
        "- Fine-tune, evaluate, and monitor LLM networks and RAG pipelines\n"
        "- Build scalable APIs and microservices in Python\n"
        "- Work on ethical AI, bias mitigation, and observability using OpenTelemetry\n"
        "Qualifications:\n"
        "- Strong Python and SQL skills\n"
        "- Hands-on with Docker, Kubernetes, and Cloud Platforms (Azure/AWS)\n"
        "- Experience with PyTorch, Scikit-learn, and MLflow"
    )

    stripe_jd = (
        "Stripe is hiring a Staff AI/Machine Learning Engineer to drive "
        "large-scale AI initiatives across Stripe's core financial "
        "infrastructure. You will own the end-to-end architecture of complex "
        "AI/ML systems, design solutions for high-leverage challenges "
        "like low-latency model inference and real-time agent/LLM orchestration, "
        "and influence engineering best practices.\n"
        "Qualifications:\n"
        "- 10+ years of professional software development experience\n"
        "- Deep expertise in ML frameworks (PyTorch) and distributed systems\n"
        "- Familiarity with LLM orchestration, RAG, and agentic workflows"
    )

    apple_jd = (
        "Apple's AI/ML team is seeking a Senior Data Scientist. "
        "You will design and develop machine learning models to analyze user "
        "behavior, create predictive models, and deliver interpretability "
        "for AI applications. Key requirements: expertise in Python, "
        "R, SQL, PyTorch/TensorFlow, and statistics. Experience with model "
        "evaluation, data visualization, and MLFlow is required."
    )

    vercel_jd = (
        "Vercel is looking for a Senior Front-End Developer to join our core "
        "UI framework team. You will build and optimize user-facing interfaces, "
        "work with Astro and Next.js, and design premium, highly interactive "
        "portfolios and user dashboards. Key requirements: expert CSS, HTML5, "
        "TypeScript, React, accessibility (WCAG), and frontend test suites "
        "(Vitest/Playwright)."
    )

    dataset = [
        {
            "input": optum_jd,
            "actual_output": "",
            "expected_output": (
                "A tailored resume highlighting AI/ML engineering, LangGraph, "
                "observability with OpenTelemetry, and agentic voice system experience "
                "at Optum."
            ),
        },
        {
            "input": stripe_jd,
            "actual_output": "",
            "expected_output": (
                "A tailored resume focusing on staff-level technical leadership, "
                "architecting complex AI/ML systems at scale, and "
                "expertise with PyTorch."
            ),
        },
        {
            "input": apple_jd,
            "actual_output": "",
            "expected_output": (
                "A tailored resume focusing on interpretable machine learning, "
                "data science anomalies detection, Prophet, and statistical modeling."
            ),
        },
        {
            "input": vercel_jd,
            "actual_output": "",
            "expected_output": (
                "A tailored resume focusing on frontend engineering, React, Astro, "
                "premium design aesthetics, and testing with Playwright."
            ),
        },
    ]

    # Save to .dataset.json
    output_path = Path(__file__).parent / ".dataset.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)


if __name__ == "__main__":
    generate_dataset()
