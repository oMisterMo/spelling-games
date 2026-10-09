import { Container } from 'pixi.js';
import { Button } from './Button';
import { DARK } from './theme';

export const BACKSPACE = '⌫';
const FULL_ROWS = [[...'ABCDEFGHI'], [...'JKLMNOPQR'], [...'STUVWXYZ']];
const KEY_GAP = 6;

/**
 * On-screen letter keys: the full A–Z in three rows, or a single row of chosen
 * letters (a "letter bank"). Both end with a backspace key unless it's turned
 * off. Keys are positioned in the parent's coordinates, so keep this container at 0,0.
 */
export class LetterKeyboard extends Container {
  private buttons: Button[] = [];
  private rows: string[][] = [];

  /**
   * @param onKey Called with the letter, or BACKSPACE.
   * @param reserveColumns Size keys as if a row had at least this many, so a short letter bank doesn't make keys jump in size.
   * @param backspace Pass false to leave out the backspace key, for games where a letter can't be taken back.
   */
  constructor(
    private onKey: (key: string) => void,
    private reserveColumns = 0,
    private backspace = true,
  ) {
    super();
  }

  get keys(): readonly Button[] {
    return this.buttons;
  }

  /** Pass null for the full A–Z keyboard. Call `layout()` afterwards. */
  setLetters(letters: readonly string[] | null): void {
    for (const button of this.buttons) button.destroy({ children: true });
    const rows = letters ? [[...letters]] : FULL_ROWS;
    this.rows = this.backspace ? [...rows.slice(0, -1), [...rows[rows.length - 1], BACKSPACE]] : rows;
    this.buttons = this.rows.flat().map((label) => {
      const isBackspace = label === BACKSPACE;
      const button = new Button({
        label,
        width: 60,
        height: 60,
        color: isBackspace ? DARK : 0xffffff,
        textColor: isBackspace ? 0xffffff : DARK,
        fontSize: 36,
        onClick: () => this.onKey(label),
      });
      this.addChild(button);
      return button;
    });
  }

  /** Key size, and the total height the keys need, to fit width `w` and height `h`. */
  measure(w: number, h: number): { keyW: number; keyH: number; height: number } {
    const cols = Math.max(this.reserveColumns, ...this.rows.map((row) => row.length));
    const keyW = Math.min(72, (w - KEY_GAP * (cols - 1)) / cols);
    const n = this.rows.length;
    const keyH = Math.min(keyW * 1.15, 72, (h - KEY_GAP * (n - 1)) / n);
    return { keyW, keyH, height: n * keyH + (n - 1) * KEY_GAP };
  }

  /** Lays the keys out centered horizontally in the box, starting at its top. */
  layout(x: number, y: number, w: number, h: number): void {
    const { keyW, keyH } = this.measure(w, h);
    let i = 0;
    this.rows.forEach((row, r) => {
      const rowW = row.length * keyW + (row.length - 1) * KEY_GAP;
      const left = x + (w - rowW) / 2;
      row.forEach((_, c) => {
        const button = this.buttons[i++];
        button.setSize(keyW, keyH);
        button.position.set(left + c * (keyW + KEY_GAP) + keyW / 2, y + r * (keyH + KEY_GAP) + keyH / 2);
      });
    });
  }
}
