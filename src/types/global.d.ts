/**
 * Global type declarations for Electron + Vite
 */

// Vite/Electron Forge injected variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Electron global types
declare const process: NodeJS.Process;

// CSS module declarations
declare module "*.css" {
  const content: string;
  export default content;
}
