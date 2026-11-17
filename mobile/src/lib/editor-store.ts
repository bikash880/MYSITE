/**
 * Hands rich-text content between a form and the full-screen editor route.
 * (Route params are unsuitable for large HTML strings and callbacks.)
 */
type Session = { html: string; folder: string; title: string; onSave: (html: string) => void };

let session: Session | null = null;

export const editorStore = {
  open(s: Session) {
    session = s;
  },
  get() {
    return session;
  },
  close() {
    session = null;
  },
};
