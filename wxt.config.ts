import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Mamout - Prompt Manager',
    description: 'Gestisci e compila i tuoi prompt offline in locale.',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab',
      'clipboardWrite',
      'sidePanel'
    ],
    action: {
      default_title: 'Mamout Prompt'
    }
  }
});
