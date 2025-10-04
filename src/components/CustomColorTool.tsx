/**
 * Custom Color Tool for EditorJS
 * A simple inline tool for changing text color
 */

export default class CustomColorTool {
  static isInline = true;
  static title = 'Color';

  private api: any;
  private button: HTMLButtonElement | null = null;
  private tag: string = 'SPAN';
  private colorCollections: string[];
  private defaultColor: string;

  constructor({ api, config }: { api: any; config?: any }) {
    this.api = api;
    this.colorCollections = config?.colorCollections || [
      '#FF0000', // Red
      '#FF7F00', // Orange
      '#FFFF00', // Yellow
      '#00FF00', // Green
      '#0000FF', // Blue
      '#4B0082', // Indigo
      '#9400D3', // Violet
      '#000000', // Black
      '#808080', // Gray
      '#FFFFFF', // White
    ];
    this.defaultColor = config?.defaultColor || '#FF0000';
  }

  /**
   * Create button for toolbar
   */
  render(): HTMLElement {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2L2 18h16L10 2z" fill="currentColor"/>
        <rect x="2" y="16" width="16" height="2" fill="${this.defaultColor}"/>
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

    const selectedText = range.extractContents();
    const span = document.createElement(this.tag);

    // Show color picker
    this.showColorPicker(span, range, selectedText);
  }

  /**
   * Show color picker popup
   */
  private showColorPicker(span: HTMLElement, range: Range, selectedText: DocumentFragment): void {
    const picker = document.createElement('div');
    picker.style.cssText = `
      position: absolute;
      z-index: 10000;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      max-width: 200px;
    `;

    // Position the picker near the selection
    const rect = range.getBoundingClientRect();
    picker.style.top = `${rect.bottom + window.scrollY + 5}px`;
    picker.style.left = `${rect.left + window.scrollX}px`;

    // Create color buttons
    this.colorCollections.forEach(color => {
      const colorButton = document.createElement('button');
      colorButton.type = 'button';
      colorButton.style.cssText = `
        width: 30px;
        height: 30px;
        border: 2px solid #ddd;
        border-radius: 4px;
        background-color: ${color};
        cursor: pointer;
        transition: transform 0.2s;
      `;

      colorButton.onmouseover = () => {
        colorButton.style.transform = 'scale(1.1)';
      };

      colorButton.onmouseout = () => {
        colorButton.style.transform = 'scale(1)';
      };

      colorButton.onclick = () => {
        span.style.color = color;
        span.appendChild(selectedText);
        range.insertNode(span);

        // Remove picker
        document.body.removeChild(picker);

        // Restore selection
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          selection.addRange(newRange);
        }
      };

      picker.appendChild(colorButton);
    });

    // Add custom color input
    const customColorContainer = document.createElement('div');
    customColorContainer.style.cssText = `
      grid-column: 1 / -1;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #eee;
    `;

    const customColorInput = document.createElement('input');
    customColorInput.type = 'color';
    customColorInput.style.cssText = `
      width: 100%;
      height: 30px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;

    customColorInput.onchange = () => {
      span.style.color = customColorInput.value;
      span.appendChild(selectedText);
      range.insertNode(span);

      // Remove picker
      document.body.removeChild(picker);

      // Restore selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
      }
    };

    customColorContainer.appendChild(customColorInput);
    picker.appendChild(customColorContainer);

    document.body.appendChild(picker);

    // Close picker when clicking outside
    const closePickerOnClickOutside = (e: MouseEvent) => {
      if (!picker.contains(e.target as Node)) {
        if (document.body.contains(picker)) {
          document.body.removeChild(picker);
        }
        document.removeEventListener('click', closePickerOnClickOutside);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closePickerOnClickOutside);
    }, 100);
  }

  /**
   * Check if the selection has colored text
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

    return element.tagName === this.tag && element.style.color !== '';
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
