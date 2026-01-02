# Translations (i18n)

This document covers how translations work across the application.

## Overview

The app supports two languages:
- **English** (`en`) - Default
- **Spanish** (`es`)

All user-facing text should use the translation system for consistency and localization.

---

## Architecture

```
messages/
├── en.json          # English translations
└── es.json          # Spanish translations

contexts/
└── language-context.tsx   # Language state provider

hooks/
└── use-translations.ts    # Translation hook

components/
└── language-selector.tsx  # Language switcher UI
```

---

## Key Files

| File | Purpose |
|------|---------|
| `messages/en.json` | English translation strings |
| `messages/es.json` | Spanish translation strings |
| `contexts/language-context.tsx` | React context for language state |
| `hooks/use-translations.ts` | `useTranslations()` hook |
| `components/language-selector.tsx` | Language dropdown in header |
| `app/providers.tsx` | Wraps app with `LanguageProvider` |

---

## Using Translations in Components

### Basic Usage

```typescript
import { useTranslations } from '@/hooks/use-translations'

function MyComponent() {
  const { t } = useTranslations()

  return (
    <div>
      <h1>{t('common', 'title')}</h1>
      <p>{t('common', 'description')}</p>
      <Button>{t('common', 'submit')}</Button>
    </div>
  )
}
```

### With Variables

Translations support variable interpolation using `{variableName}` syntax:

```typescript
// In en.json
{
  "account": {
    "welcome": "Welcome, {name}!"
  }
}

// In component
const { t } = useTranslations()
t('account', 'welcome', { name: user.first_name })
// Output: "Welcome, John!"
```

### Nested Keys

For deeply nested translations, use dot notation:

```typescript
// In en.json
{
  "account": {
    "navigation": {
      "personalInfo": "Personal Information",
      "billing": "Billing"
    }
  }
}

// In component
t('account', 'navigation.personalInfo')
// Output: "Personal Information"
```

---

## Translation Namespaces

Translations are organized by namespace (top-level keys in JSON):

| Namespace | Purpose |
|-----------|---------|
| `common` | Shared UI labels, buttons, actions |
| `auth` | Login, signup, password reset |
| `account` | User account pages |
| `membership` | Membership plans and pricing |
| `events` | Event registration |
| `lessons` | Lesson booking |
| `reservations` | Court reservations |
| `calendar` | Calendar/scheduling |
| `waiver` | Liability [waiver](./waiver.md) |
| `hero` | Landing page hero section |
| `courts` | Court management |
| `admin` | [Admin panel](../users/admin.md) |
| `blog` | Blog section |
| `shop` | [Pro shop](../pages/shop.md) |
| `footer` | Footer links |
| `privacy` | Privacy policy |
| `terms` | Terms of service |

---

## Adding New Translations

### 1. Add to Both Language Files

Always add translations to **both** `en.json` and `es.json`:

```json
// messages/en.json
{
  "myNamespace": {
    "newKey": "English text"
  }
}

// messages/es.json
{
  "myNamespace": {
    "newKey": "Spanish text"
  }
}
```

### 2. Use in Component

```typescript
const { t } = useTranslations()
const text = t('myNamespace', 'newKey')
```

### 3. Best Practices

- Keep keys descriptive: `submitButton` not `btn1`
- Group related keys in the same namespace
- Use variables for dynamic content: `{count} items` not separate keys for singular/plural
- Add translations to BOTH files at the same time

---

## Language Context

**File:** `contexts/language-context.tsx`

```typescript
type Language = 'en' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
```

### Accessing Language Directly

If you need the current language (not translations):

```typescript
import { useLanguage } from '@/contexts'

function MyComponent() {
  const { language, setLanguage } = useLanguage()

  // language is 'en' or 'es'
  // setLanguage('es') to switch
}
```

---

## useTranslations Hook

**File:** `hooks/use-translations.ts`

```typescript
export function useTranslations() {
  const { language } = useLanguage()

  const t = useCallback((
    namespace: string,
    key: string,
    variables?: Record<string, string | number>
  ) => {
    // 1. Get translation object for current language
    const translation = translations[language]
    if (!translation) return key

    // 2. Get namespace data
    const namespaceData = translation[namespace]
    if (!namespaceData) return key

    // 3. Get value (supports flat and nested keys)
    let value = namespaceData[key]
    if (!value && key.includes('.')) {
      value = getNestedValue(namespaceData, key)
    }

    // 4. Interpolate variables
    return value ? interpolateVariables(value, variables) : key
  }, [language])

  return { t }
}
```

### Fallback Behavior

If a translation is missing:
- Returns the key name as fallback
- Logs error to console for debugging
- App doesn't crash

---

## Language Selector Component

**File:** `components/language-selector.tsx`

Renders a globe icon dropdown in the header:

```typescript
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('es')}
          className={language === 'es' ? 'bg-accent' : ''}
        >
          Español
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Provider Setup

The `LanguageProvider` wraps the entire app in `app/providers.tsx`:

```typescript
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <StripeErrorBoundary>
        <Elements stripe={getStripe()}>
          <WhatsAppModalProvider>
            {children}
          </WhatsAppModalProvider>
        </Elements>
      </StripeErrorBoundary>
    </LanguageProvider>
  )
}
```

This ensures `useTranslations()` and `useLanguage()` work everywhere.

---

## Date/Time Formatting

For dates, use the language context with date-fns:

```typescript
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts'

function DateDisplay({ date }: { date: Date }) {
  const { language } = useLanguage()
  const locale = language === 'es' ? es : enUS

  return (
    <span>{format(date, 'PPP', { locale })}</span>
  )
}
```

---

## Currency Formatting

Prices are in MXN (Mexican Pesos). Format with locale:

```typescript
const formatPrice = (amount: number, language: 'en' | 'es') => {
  return new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount)
}
```

---

## Testing Translations

To verify translations:

1. Switch language using the selector in header
2. All text should update immediately
3. Check for missing translations (they'll show as the key name)
4. Verify variable interpolation works correctly

---

## Common Issues

### "Translation not found" (shows key name)

**Cause:** Key doesn't exist in translation file

**Fix:** Add the key to both `en.json` and `es.json`

### "useLanguage must be used within LanguageProvider"

**Cause:** Component is outside the provider tree

**Fix:** Ensure `LanguageProvider` wraps your component (usually in `providers.tsx`)

### Variables not interpolating

**Cause:** Wrong variable name or syntax

**Fix:** Check that `{variableName}` in JSON matches the key in the variables object

---

## Related Documentation

- [./waiver.md](./waiver.md) - Waiver uses translations for legal text
- [../pages/auth.md](../pages/auth.md) - Auth pages use auth namespace
- [../pages/membership.md](../pages/membership.md) - Uses membership namespace
- [../pages/account.md](../pages/account.md) - Uses account namespace
