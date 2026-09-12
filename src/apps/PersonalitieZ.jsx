import { useState, useEffect } from 'react';
import { api } from '../api';

const MBTI_COLORS = {
  "ISTJ": "#4A5568", "ISFJ": "#5A6C7D", "INFJ": "#667B8F", "INTJ": "#718AA1",
  "ISTP": "#6B7D91", "ISFP": "#7D8FA3", "INFP": "#8FA1B5", "INTP": "#A1B3C7",
  "ESTP": "#FF9500", "ESFP": "#FFB000", "ENFP": "#FFC700", "ENTP": "#FFD700",
  "ESTJ": "#DC2626", "ESFJ": "#EF4444", "ENFJ": "#F87171", "ENTJ": "#FCA5A5",
};

export default function PersonalitieZ() {
  const [tab, setTab] = useState("discover");
  const [basicTest, setBasicTest] = useState(null);
  const [detailedTest, setDetailedTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [basicAnswers, setBasicAnswers] = useState([]);
  const [detailedAnswers, setDetailedAnswers] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    loadTests();
    loadResults();
  }, []);

  const loadTests = async () => {
    try {
      const [basic, detailed] = await Promise.all([
        api("economy/personalitiez/basic/", "GET"),
        api("economy/personalitiez/detailed/", "GET"),
      ]);
      setBasicTest(basic);
      setDetailedTest(detailed);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadResults = async () => {
    try {
      const data = await api("economy/personalitiez/results/", "GET");
      setResults(data.results || []);
      if (data.results?.length > 0) {
        setLastResult(data.results[0]);
      }
    } catch (err) {
      console.error("Failed to load results:", err);
    }
  };

  const submitBasicTest = async () => {
    if (basicAnswers.length !== 4) {
      setError("Please answer all 4 questions");
      return;
    }

    setLoading(true);
    try {
      const result = await api("economy/personalitiez/basic/", "POST", {
        answers: basicAnswers,
      });
      setLastResult(result);
      setBasicAnswers([]);
      setTab("result");
      await loadResults();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitDetailedTest = async () => {
    if (detailedAnswers.length !== 8) {
      setError("Please answer all 8 questions");
      return;
    }

    setLoading(true);
    try {
      const result = await api("economy/personalitiez/detailed/", "POST", {
        answers: detailedAnswers,
      });
      setLastResult(result);
      setDetailedAnswers([]);
      setTab("result");
      await loadResults();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBasicAnswer = (index, type) => {
    const answers = [...basicAnswers];
    answers[index] = { text: "", type };
    setBasicAnswers(answers);
  };

  const updateDetailedAnswer = (index, score) => {
    const answers = [...detailedAnswers];
    answers[index] = {
      ...detailedTest?.questions?.[index],
      score,
    };
    setDetailedAnswers(answers);
  };

  return (
    <div className="personalitiez tab-app">
      <div className="chip-wrap">
        <div
          className={`chip ${tab === "discover" ? "active" : ""}`}
          onClick={() => setTab("discover")}
        >
          🔎 Discover
        </div>
        <div
          className={`chip ${tab === "basic" ? "active" : ""}`}
          onClick={() => setTab("basic")}
        >
          ⚡ Basic Test
        </div>
        <div
          className={`chip ${tab === "detailed" ? "active" : ""}`}
          onClick={() => setTab("detailed")}
        >
          🏷️ Detailed Test
        </div>
        <div
          className={`chip ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          📊 History
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ margin: "12px" }}>
          {error}
          <button onClick={() => setError("")} style={{ marginLeft: "8px" }}>
            ✕
          </button>
        </div>
      )}

      {tab === "discover" && <DiscoverTab />}

      {tab === "basic" && basicTest && (
        <BasicTestTab
          test={basicTest}
          answers={basicAnswers}
          onAnswerChange={updateBasicAnswer}
          onSubmit={submitBasicTest}
          loading={loading}
        />
      )}

      {tab === "detailed" && detailedTest && (
        <DetailedTestTab
          test={detailedTest}
          answers={detailedAnswers}
          onAnswerChange={updateDetailedAnswer}
          onSubmit={submitDetailedTest}
          loading={loading}
        />
      )}

      {tab === "result" && lastResult && (
        <ResultTab result={lastResult} />
      )}

      {tab === "history" && (
        <HistoryTab results={results} />
      )}
    </div>
  );
}

function DiscoverTab() {
  return (
    <div className="scroll-panel">
      <div style={{ padding: "12px 16px" }}>
        <h2 style={{ marginTop: 0 }}>PersonalitieZ 😶</h2>
        <p>
          Discover your MBTI personality type through quick and detailed assessments.
        </p>
        <p>
          Choose your test:
        </p>
        <ul>
          <li>
            <strong>Basic Test (−1 ⚡)</strong> — Quick 4-question assessment to get your MBTI type instantly
          </li>
          <li>
            <strong>Detailed Test (−2 🏷️)</strong> — Comprehensive 8-question assessment with scores for each dimension
          </li>
        </ul>
        <p style={{ fontSize: "12px", color: "#666" }}>
          Your personality profile helps match you with collaborators and personalize your experience.
        </p>
      </div>
    </div>
  );
}

function BasicTestTab({ test, answers, onAnswerChange, onSubmit, loading }) {
  return (
    <div className="scroll-panel">
      <div style={{ padding: "12px 16px" }}>
        <h3>Basic MBTI Test</h3>
        <p style={{ fontSize: "12px", color: "#666" }}>
          Cost: −1 ⚡ | Quick 4-question assessment
        </p>

        {test.questions?.map((q, i) => (
          <div key={i} style={{ marginBottom: "16px" }}>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>
              {i + 1}. {q.question}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {q.answers.map((a, j) => (
                <label key={j} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i]?.type === a.type}
                    onChange={() => onAnswerChange(i, a.type)}
                  />
                  <span>{a.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={onSubmit}
          disabled={loading || answers.length !== 4}
          style={{
            padding: "10px 16px",
            backgroundColor: loading ? "#ccc" : "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
            marginTop: "12px",
          }}
        >
          {loading ? "Calculating..." : "Get My Type"}
        </button>
      </div>
    </div>
  );
}

function DetailedTestTab({ test, answers, onAnswerChange, onSubmit, loading }) {
  return (
    <div className="scroll-panel">
      <div style={{ padding: "12px 16px" }}>
        <h3>Detailed MBTI Assessment</h3>
        <p style={{ fontSize: "12px", color: "#666" }}>
          Cost: −2 🏷️ | Comprehensive assessment with AI analysis
        </p>

        {test.questions?.map((q, i) => (
          <div key={i} style={{ marginBottom: "20px" }}>
            <p style={{ fontWeight: 500, marginBottom: "12px" }}>
              {i + 1}. {q.question}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {q.answers.map((a, j) => (
                <label key={j} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i]?.score === a.score}
                    onChange={() => onAnswerChange(i, a.score)}
                  />
                  <span>{a.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={onSubmit}
          disabled={loading || answers.length !== 8}
          style={{
            padding: "10px 16px",
            backgroundColor: loading ? "#ccc" : "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
            marginTop: "12px",
          }}
        >
          {loading ? "Analyzing..." : "Get My Profile"}
        </button>
      </div>
    </div>
  );
}

function ResultTab({ result }) {
  const typeInfo = result.type_info;
  const bgColor = MBTI_COLORS[result.mbti_type] || "#666";

  return (
    <div className="scroll-panel">
      <div style={{ padding: "12px 16px" }}>
        <div
          style={{
            backgroundColor: bgColor,
            color: "white",
            padding: "20px 16px",
            borderRadius: "8px",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>
            {typeInfo?.emoji}
          </div>
          <h2 style={{ margin: 0, marginBottom: "4px" }}>
            {result.mbti_type}
          </h2>
          <p style={{ margin: 0, opacity: 0.9 }}>
            {typeInfo?.name}
          </p>
        </div>

        {result.dimension_scores && (
          <div style={{ marginBottom: "16px" }}>
            <h4>Your Dimensions</h4>
            <DimensionChart scores={result.dimension_scores} />
          </div>
        )}

        <p style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
          Completed: {new Date(result.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function DimensionChart({ scores }) {
  const dimensions = [
    { label: "Extraversion ↔ Introversion", key: "E", left: "I", right: "E" },
    { label: "Sensing ↔ Intuition", key: "N", left: "S", right: "N" },
    { label: "Thinking ↔ Feeling", key: "T", left: "T", right: "F" },
    { label: "Judging ↔ Perceiving", key: "J", left: "J", right: "P" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {dimensions.map((dim) => {
        const score = scores[dim.key] || 0;
        const percent = Math.max(0, Math.min(100, 50 + score * 5));
        return (
          <div key={dim.key}>
            <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "4px" }}>
              {dim.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11px",
              }}
            >
              <span>{dim.left}</span>
              <div
                style={{
                  flex: 1,
                  height: "8px",
                  backgroundColor: "#eee",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    backgroundColor: "#0066cc",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span>{dim.right}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ results }) {
  if (!results || results.length === 0) {
    return (
      <div className="scroll-panel">
        <div style={{ padding: "12px 16px", textAlign: "center", color: "#666" }}>
          <p>No personality assessments yet.</p>
          <p style={{ fontSize: "12px" }}>Take a test to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-panel">
      <div style={{ padding: "12px 16px" }}>
        <h3>Your History</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {results.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "24px" }}>
                  {r.type_info?.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {r.mbti_type} — {r.type_info?.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {r.test_type === "basic" ? "Basic Test" : "Detailed Assessment"} •{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
