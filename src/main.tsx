import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrandProvider } from './context/BrandContext.tsx'
import { GreetingProvider } from './context/GreetingContext.tsx'
import { CatalogProvider } from './context/CatalogContext.tsx'
import { CurrencyProvider } from './context/CurrencyContext.tsx'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CurrencyProvider>
      <CatalogProvider>
        <BrandProvider>
          <GreetingProvider>
            <App />
          </GreetingProvider>
        </BrandProvider>
      </CatalogProvider>
      </CurrencyProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
