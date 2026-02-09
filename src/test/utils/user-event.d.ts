// Type declaration for @testing-library/user-event
// This fixes TypeScript resolution issues while the package works correctly at runtime

declare module '@testing-library/user-event' {
  export interface UserEvent {
    click(element: Element): Promise<void>;
    dblClick(element: Element): Promise<void>;
    type(element: Element, text: string, options?: any): Promise<void>;
    clear(element: Element): Promise<void>;
    selectOptions(element: Element, values: string | string[]): Promise<void>;
    deselectOptions(element: Element, values: string | string[]): Promise<void>;
    upload(element: Element, file: File | File[]): Promise<void>;
    tab(options?: { shift?: boolean }): Promise<void>;
    hover(element: Element): Promise<void>;
    unhover(element: Element): Promise<void>;
    paste(text: string): Promise<void>;
    keyboard(text: string): Promise<void>;
    pointer(actions: any[]): Promise<void>;
  }

  export function userEvent(): {
    setup(): UserEvent;
  };

  export function setup(): UserEvent;
}
