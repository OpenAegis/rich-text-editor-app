/**
 * Custom Font Size Tool for EditorJS
 * A simple inline tool for changing text font size
 */

export default class CustomFontSizeTool {
  static isInline = true;
  static title = 'Font Size';

  private api: any;
  private button: HTMLButtonElement | null = null;
  private tag: string = 'SPAN';
  private fontSizes: number[];

  constructor({ api, config }: { api: any; config?: any }) {
    this.api = api;
    this.fontSizes = config?.fontSizes || [
      12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72
    ];
  }

  /**
   * Create button for toolbar
   */
  render(): HTMLElement {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <text x="2" y="15" font-size="14" font-weight="bold" fill="currentColor">A</text>
        <text x="11" y="15" font-size="10" fill="currentColor">A</text>
      </svg>
    `;
    this.button.classList.add(this.api.styles.inlineToolButton);

    return this.button;
  }

  /**
   * Handle clicks on the Inline Toolbar icon
   */
  surround(range: Range): void {
    if (!range) {
      return;
    }

    // Save the original range for restoration if user cancels
    const originalRange = range.cloneRange();

    // Show font size picker without removing content
    this.showFontSizePicker(range, originalRange);
  }

  /**
   * Show font size picker popup
   */
  private showFontSizePicker(range: Range, originalRange: Range): void {
    const picker = document.createElement('div');
    picker.style.cssText = `
      position: absolute;
      z-index: 10000;
      background: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-height: 300px;
      overflow-y: auto;
      min-width: 120px;
    `;

    // Position the picker near the selection
    const rect = range.getBoundingClientRect();
    picker.style.top = `${rect.bottom + window.scrollY + 5}px`;
    picker.style.left = `${rect.left + window.scrollX}px`;

    // Create font size buttons
    this.fontSizes.forEach(size => {
      const sizeButton = document.createElement('button');
      sizeButton.type = 'button';
      sizeButton.textContent = `${size}px`;
      sizeButton.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        font-size: ${Math.min(size, 20)}px;
        transition: background-color 0.2s;
        border-radius: 4px;
        margin-bottom: 2px;
      `;

      sizeButton.onmouseover = () => {
        sizeButton.style.backgroundColor = '#f0f0f0';
      };

      sizeButton.onmouseout = () => {
        sizeButton.style.backgroundColor = 'transparent';
      };

      sizeButton.onclick = () => {
        this.applyFontSize(size, range, originalRange);

        // Remove picker
        if (document.body.contains(picker)) {
          document.body.removeChild(picker);
        }
      };

      picker.appendChild(sizeButton);
    });

    // Add custom font size input
    const customSizeContainer = document.createElement('div');
    customSizeContainer.style.cssText = `
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 4px;
      align-items: center;
    `;

    const customSizeInput = document.createElement('input');
    customSizeInput.type = 'number';
    customSizeInput.placeholder = '自定义';
    customSizeInput.min = '8';
    customSizeInput.max = '200';
    customSizeInput.style.cssText = `
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    `;

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.textContent = '应用';
    applyButton.style.cssText = `
      padding: 6px 12px;
      border: none;
      background: #0070f3;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    `;

    applyButton.onmouseover = () => {
      applyButton.style.backgroundColor = '#0051cc';
    };

    applyButton.onmouseout = () => {
      applyButton.style.backgroundColor = '#0070f3';
    };

    applyButton.onclick = () => {
      const customSize = parseInt(customSizeInput.value);
      if (customSize && customSize >= 8 && customSize <= 200) {
        this.applyFontSize(customSize, range, originalRange);

        // Remove picker
        if (document.body.contains(picker)) {
          document.body.removeChild(picker);
        }
      }
    };

    customSizeInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        applyButton.click();
      }
    };

    customSizeContainer.appendChild(customSizeInput);
    customSizeContainer.appendChild(applyButton);
    picker.appendChild(customSizeContainer);

    document.body.appendChild(picker);

    // Close picker when clicking outside (cancel action - restore original selection)
    const closePickerOnClickOutside = (e: MouseEvent) => {
      if (!picker.contains(e.target as Node)) {
        if (document.body.contains(picker)) {
          document.body.removeChild(picker);
        }

        // Restore original selection when user cancels
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(originalRange);
        }

        document.removeEventListener('click', closePickerOnClickOutside);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closePickerOnClickOutside);
    }, 100);
  }

  /**
   * Apply font size to selected text
   */
  private applyFontSize(size: number, range: Range, originalRange: Range): void {
    // Extract the selected content
    const selectedText = range.extractContents();

    // Create span with font size
    const span = document.createElement(this.tag);
    span.style.fontSize = `${size}px`;
    span.appendChild(selectedText);

    // Insert the span with font size
    range.insertNode(span);

    // Select the newly sized text
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    }
  }

  /**
   * Check if the selection has custom font size
   */
  checkState(selection: Selection): boolean {
    const anchorNode = selection.anchorNode;

    if (!anchorNode) {
      return false;
    }

    const element = anchorNode instanceof Element
      ? anchorNode
      : anchorNode.parentElement;

    if (!element) {
      return false;
    }

    return element.tagName === this.tag && (element as HTMLElement).style.fontSize !== '';
  }

  /**
   * Sanitizer config
   */
  static get sanitize() {
    return {
      span: {
        style: true,
      },
    };
  }
}
