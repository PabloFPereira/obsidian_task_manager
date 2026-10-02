import { AbstractInputSuggest, App, TFile } from "obsidian";

interface ActiveWikiQuery {
  start: number;
  end: number;
  query: string;
}

export function installWikiLinkInputBehavior(app: App, inputEl: HTMLInputElement): void {
  new WikiLinkInputSuggest(app, inputEl);

  inputEl.addEventListener("keydown", (event) => {
    if (event.key !== "[") {
      return;
    }

    const start = inputEl.selectionStart ?? inputEl.value.length;
    const end = inputEl.selectionEnd ?? start;

    if (start > 0 && inputEl.value[start - 1] === "[") {
      return;
    }

    event.preventDefault();
    const selectedText = inputEl.value.slice(start, end);
    const insertion = selectedText ? `[[${selectedText}]]` : "[[";
    inputEl.setRangeText(insertion, start, end, "end");

    if (selectedText) {
      inputEl.setSelectionRange(start + insertion.length, start + insertion.length);
    }

    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

class WikiLinkInputSuggest extends AbstractInputSuggest<TFile> {
  constructor(
    app: App,
    private readonly inputEl: HTMLInputElement,
  ) {
    super(app, inputEl);
  }

  getSuggestions(inputStr: string): TFile[] {
    const active = getActiveWikiQuery(this.inputEl, inputStr);
    if (!active) {
      return [];
    }

    const query = active.query.toLowerCase();
    return this.app.vault
      .getMarkdownFiles()
      .filter((file) => {
        const target = `${file.basename} ${file.path}`.toLowerCase();
        return target.includes(query);
      })
      .slice(0, 20);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ cls: "task-manager-suggest-title", text: file.basename });
    el.createDiv({ cls: "task-manager-suggest-path", text: file.path });
  }

  selectSuggestion(file: TFile): void {
    const active = getActiveWikiQuery(this.inputEl, this.inputEl.value);
    if (!active) {
      return;
    }

    const replacement = `[[${file.basename}]]`;
    this.inputEl.setRangeText(replacement, active.start, active.end, "end");
    this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    this.close();
  }
}

function getActiveWikiQuery(inputEl: HTMLInputElement, value: string): ActiveWikiQuery | undefined {
  const cursor = inputEl.selectionStart ?? value.length;
  const beforeCursor = value.slice(0, cursor);
  const openIndex = beforeCursor.lastIndexOf("[[");

  if (openIndex < 0) {
    return undefined;
  }

  const closeIndex = beforeCursor.lastIndexOf("]]");
  if (closeIndex > openIndex) {
    return undefined;
  }

  return {
    start: openIndex,
    end: cursor,
    query: value.slice(openIndex + 2, cursor),
  };
}
