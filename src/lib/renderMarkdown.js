function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function isTableSeparator(line) {
  return /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(line);
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isHorizontalRule(line) {
  return /^-{3,}$/.test(line.trim());
}

function isHeading(line) {
  return /^(#{1,6})\s+/.test(line.trim());
}

function isUnorderedListItem(line) {
  return /^\s*-\s+/.test(line);
}

function isOrderedListItem(line) {
  return /^\s*\d+\.\s+/.test(line);
}

function isBlockquote(line) {
  return /^\s*>/.test(line);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(headers, rows) {
  const headerHtml = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const rowsHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<div class="table-scroll"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(6, heading[1].length + 1);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (isTableRow(line) && isTableSeparator(lines[index + 1] ?? "")) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      html.push(renderTable(headers, rows));
      continue;
    }

    if (isUnorderedListItem(line)) {
      const items = [];
      while (index < lines.length && isUnorderedListItem(lines[index])) {
        items.push(lines[index].replace(/^\s*-\s+/, ""));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (isOrderedListItem(line)) {
      const items = [];
      while (index < lines.length && isOrderedListItem(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (isBlockquote(line)) {
      const quote = [];
      while (index < lines.length && isBlockquote(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quote.map(renderInline).join("<br />")}</blockquote>`);
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isHorizontalRule(lines[index]) &&
      !isHeading(lines[index]) &&
      !isUnorderedListItem(lines[index]) &&
      !isBlockquote(lines[index]) &&
      !isOrderedListItem(lines[index]) &&
      !(isTableRow(lines[index]) && isTableSeparator(lines[index + 1] ?? ""))
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${paragraph.map(renderInline).join("<br />")}</p>`);
  }

  return html.join("\n");
}
