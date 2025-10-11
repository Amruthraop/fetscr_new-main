// src/components/Results.js
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Results.css";

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const s = location.state;
    if (s?.results) {
      setResults(s.results);
      setQuery(s.query || "");
      sessionStorage.setItem(
        "fetscr_results",
        JSON.stringify({ results: s.results, query: s.query })
      );
    } else {
      const stored = sessionStorage.getItem("fetscr_results");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setResults(parsed.results || []);
          setQuery(parsed.query || "");
        } catch {
          setResults([]);
        }
      }
    }
  }, [location.state]);

  // ------------------ CSV DOWNLOAD ------------------
  const downloadCSV = () => {
    const header = ["Name", "Title", "Link", "Snippet", "Image"];
    const rows = (results || []).map((r) => [
      r.name || "",
      r.title || "",
      r.link || "",
      (r.snippet || "").replace(/[\r\n]+/g, " "),
      r.image || "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `${String(cell).replace(/"/g, '""')}`).join(",")
      )
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fetscr_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ------------------ PDF DOWNLOAD ------------------
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);

    const tableColumn = ["#", "Name", "Link"];
    const tableRows = [];

    results.forEach((r, index) => {
      tableRows.push([index + 1, r.name || "", r.link || ""]);
    });

    doc.text(`FetScr Results ${query ? `for: "${query}"` : ""}`, 14, 15);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 10, cellWidth: "wrap" },
      columnStyles: {
        1: { cellWidth: 80 },
        2: { cellWidth: 80 },
      },
      headStyles: { fillColor: [22, 160, 133] },
      didDrawCell: (data) => {
        if (data.column.index === 2 && data.cell.raw) {
          doc.setTextColor(0, 0, 255);
          doc.textWithLink("", data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2, {
            url: data.cell.raw,
          });
        }
      },
    });

    doc.save("fetscr_results.pdf");
  };

  // ------------------ RENDER ------------------
  if (!results || results.length === 0) {
    return (
      <div className="results-page">
        <p>No results to show. Try a new search.</p>
        <button onClick={() => navigate("/")}>Back to search</button>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <h2>Results {query ? `for: "${query}" ` : ""}</h2>
        <div className="results-actions-row">
          <button className="results-btn" onClick={downloadCSV}>Download CSV</button>
          <button className="results-btn recommended" onClick={downloadPDF}>
            Download PDF <span className="pdf-recommended-label">(Recommended)</span>
          </button>
          <button className="results-btn" onClick={() => navigate("/home")}>New Search</button>
        </div>
      </div>

      <div ref={tableRef} className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Snippet</th>
              <th>Link</th>
              <th>Image</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{r.name}</td>
                <td className="snippet">{r.snippet}</td>
                <td>
                  {r.link ? (
                    <a href={r.link} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {r.image ? (
                    <img src={r.image} alt="" style={{ width: 60 }} />
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}