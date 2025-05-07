# OWL-Document-Reader
This project aims to create an OCR-based document processing system that leverages AWS services to eliminate manual data entry for various workflows. By automating data extraction, the system will streamline document handling, reduce errors, and increase processing efficiency across workflows such as mortgage applications, unsecured loans, and new account openings. This system will be designed with flexibility for integration into the financial institution's existing and future API-enabled systems, ensuring
longevity and adaptability.

As the site is no longer up here are some links as to 
#### Front-End Showcase: [Link](https://drive.google.com/file/d/10aKXxbypNO4AXWOCi1nL6v5lZxMc9Qjp/view?usp=sharing)
#### API Documentation: [View Doc](https://docs.google.com/document/d/1WG8NnYNvTrQOT_tedUtMAWgYSOHswKzzmZ-kzx3pCnU/edit?usp=sharing)
#### Installation: [View Doc](https://docs.google.com/document/d/1a6Rg_4_lA5yilxT-kUhEhCB7McgQE_UyLfjbY37UroA/edit?usp=sharing)



# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
