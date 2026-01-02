# Web Component Specifications - Account Page Migration

## Component Architecture Overview

```
AccountPage/
├── AccountHeader.tsx
├── UserProfileSection.tsx
├── AccountGrid.tsx
│   ├── MembershipCard.tsx
│   ├── PersonalInfoPanel.tsx
│   ├── BillingDashboard.tsx
│   ├── NotificationPreferences.tsx
│   └── ContactHub.tsx
├── Modals/
│   ├── ProfileEditModal.tsx
│   ├── PaymentMethodModal.tsx
│   └── MembershipDetailsModal.tsx
└── Components/
    ├── AvatarUpload.tsx
    ├── CountryPhoneInput.tsx
    ├── PaymentMethodCard.tsx
    └── NotificationToggle.tsx
```

---

## 🏗️ Core Components

### **1. AccountHeader Component**

```tsx
interface AccountHeaderProps {
  user: {
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string
  }
  currentLanguage: 'en' | 'es'
  onLanguageChange: (lang: 'en' | 'es') => void
}

export function AccountHeader({ user, currentLanguage, onLanguageChange }: AccountHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Page Title */}
        <h1 className="text-xl font-bold text-[#2A62A2]">Account</h1>
        
        {/* Center: Logo */}
        <img 
          src="/images/logo-blue.png" 
          alt="The Pickle Co" 
          className="h-7 w-auto"
        />
        
        {/* Right: Language Switcher */}
        <LanguageSwitcher 
          current={currentLanguage}
          onChange={onLanguageChange}
        />
      </div>
    </header>
  )
}
```

**Styling Notes**:
- Fixed header with subtle shadow on scroll
- Responsive: mobile shows condensed version
- Logo scales appropriately

---

### **2. UserProfileSection Component**

```tsx
interface UserProfileSectionProps {
  user: UserProfile
  onAvatarUpdate: (file: File) => Promise<void>
  isUploading: boolean
}

export function UserProfileSection({ 
  user, 
  onAvatarUpdate, 
  isUploading 
}: UserProfileSectionProps) {
  return (
    <section className="bg-gray-50 border-b border-gray-200 px-6 py-8">
      <div className="flex items-center space-x-4">
        <AvatarUpload
          src={user.avatarUrl}
          initials={getInitials(user.firstName, user.lastName)}
          onUpload={onAvatarUpdate}
          isUploading={isUploading}
          size="large" // 80px
        />
        
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-sm text-gray-600">{user.email}</p>
          
          <button className="mt-2 text-sm font-medium text-[#2A62A2] hover:text-blue-700">
            Edit Profile →
          </button>
        </div>
      </div>
    </section>
  )
}
```

---

### **3. AccountGrid Component**

```tsx
interface AccountGridProps {
  user: UserProfile
  membership: MembershipData
  className?: string
}

export function AccountGrid({ user, membership, className }: AccountGridProps) {
  return (
    <div className={cn(
      "grid gap-6 p-6",
      "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      className
    )}>
      <MembershipCard 
        membership={membership}
        className="md:col-span-2 lg:col-span-1"
      />
      
      <PersonalInfoPanel 
        user={user}
        className="lg:col-span-2"
      />
      
      <BillingDashboard 
        userId={user.id}
        className="md:col-span-2 lg:col-span-2"
      />
      
      <NotificationPreferences 
        preferences={user.notificationPreferences}
        className="lg:col-span-1"
      />
      
      <ContactHub className="md:col-span-2 lg:col-span-3" />
    </div>
  )
}
```

---

## 🎯 Feature Components

### **4. MembershipCard Component**

```tsx
interface MembershipCardProps {
  membership: {
    type?: string
    status?: 'active' | 'expired' | 'cancelled'
    location?: string
    startDate?: string
    endDate?: string
    monthlyCost?: number
  } | null
  className?: string
}

export function MembershipCard({ membership, className }: MembershipCardProps) {
  if (!membership) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-4xl mb-4">💎</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Active Membership
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Choose a membership plan to access exclusive benefits
          </p>
          <Button className="bg-[#2A62A2] hover:bg-blue-700">
            View Memberships
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold capitalize">
            {membership.type}
          </CardTitle>
          <Badge 
            variant={membership.status === 'active' ? 'success' : 'secondary'}
            className="uppercase text-xs"
          >
            {membership.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Location:</span>
          <span className="text-sm font-medium">{membership.location}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Start Date:</span>
          <span className="text-sm font-medium">
            {formatDate(membership.startDate)}
          </span>
        </div>
        
        {membership.endDate && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">End Date:</span>
            <span className="text-sm font-medium">
              {formatDate(membership.endDate)}
            </span>
          </div>
        )}
        
        <div className="flex justify-between pt-2 border-t">
          <span className="text-sm text-gray-600">Monthly Cost:</span>
          <span className="text-sm font-semibold">
            ${membership.monthlyCost?.toLocaleString()} MXN
          </span>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button variant="outline" className="w-full">
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
```

---

### **5. PersonalInfoPanel Component**

```tsx
interface PersonalInfoPanelProps {
  user: UserProfile
  className?: string
}

export function PersonalInfoPanel({ user, className }: PersonalInfoPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(user)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUserProfile(formData)
      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>👤</span>
            <span>Personal Information</span>
          </CardTitle>
          
          {!isEditing ? (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          ) : (
            <div className="space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#2A62A2]"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    firstName: e.target.value 
                  }))}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    lastName: e.target.value 
                  }))}
                />
              </div>
            </div>
            
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  email: e.target.value 
                }))}
              />
            </div>
            
            <div>
              <Label>Phone</Label>
              <CountryPhoneInput
                value={formData.phone}
                onChange={(phone) => setFormData(prev => ({ 
                  ...prev, 
                  phone 
                }))}
              />
            </div>
            
            <div>
              <Label>Playing Category</Label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  className={cn(
                    "flex-1 py-3 px-4 border-2 rounded-lg text-center font-medium",
                    formData.gender === 'mens'
                      ? "border-[#2A62A2] bg-blue-50 text-[#2A62A2]"
                      : "border-gray-200 text-gray-600"
                  )}
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    gender: 'mens' 
                  }))}
                >
                  Men's
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 py-3 px-4 border-2 rounded-lg text-center font-medium",
                    formData.gender === 'womens'
                      ? "border-[#2A62A2] bg-blue-50 text-[#2A62A2]"
                      : "border-gray-200 text-gray-600"
                  )}
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    gender: 'womens' 
                  }))}
                >
                  Women's
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-600">FIRST NAME</Label>
                <p className="font-medium">{user.firstName || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">LAST NAME</Label>
                <p className="font-medium">{user.lastName || 'Not set'}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-gray-600">EMAIL</Label>
              <p className="font-medium">{user.email}</p>
            </div>
            
            <div>
              <Label className="text-xs text-gray-600">PHONE</Label>
              <p className="font-medium">{user.phone || 'Not set'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-gray-600">PLAYING CATEGORY</Label>
              <p className="font-medium capitalize">
                {user.gender ? `${user.gender}'s` : 'Not set'}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### **6. BillingDashboard Component**

```tsx
interface BillingDashboardProps {
  userId: string
  className?: string
}

export function BillingDashboard({ userId, className }: BillingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'methods' | 'history'>('methods')
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>💳</span>
          <span>Billing</span>
        </CardTitle>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        <TabsContent value="methods">
          <PaymentMethodsSection userId={userId} />
        </TabsContent>
        
        <TabsContent value="history">
          <PaymentHistorySection userId={userId} />
        </TabsContent>
      </CardContent>
    </Card>
  )
}

function PaymentMethodsSection({ userId }: { userId: string }) {
  const { data: paymentMethods, isLoading } = usePaymentMethods(userId)
  
  if (isLoading) {
    return <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  }

  return (
    <div className="space-y-4">
      {paymentMethods?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No payment methods added yet</p>
          <Button className="bg-[#2A62A2]">
            Add Payment Method
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paymentMethods?.map(method => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onSetDefault={() => setDefaultPaymentMethod(method.id)}
                onRemove={() => removePaymentMethod(method.id)}
              />
            ))}
          </div>
          
          <Button variant="outline" className="w-full">
            + Add New Payment Method
          </Button>
        </>
      )}
    </div>
  )
}
```

---

### **7. NotificationPreferences Component**

```tsx
interface NotificationPreferencesProps {
  preferences: NotificationSettings
  className?: string
}

export function NotificationPreferences({ 
  preferences, 
  className 
}: NotificationPreferencesProps) {
  const [settings, setSettings] = useState(preferences)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    setSettings(newSettings)
    
    // Auto-save on change
    setIsSaving(true)
    try {
      await updateNotificationPreferences(newSettings)
      toast.success('Preferences updated')
    } catch (error) {
      // Revert on error
      setSettings(settings)
      toast.error('Failed to update preferences')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>🔔</span>
          <span>Notifications</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose how you'd like to receive updates
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <NotificationToggle
          icon="📧"
          title="Email Notifications"
          description="Receive updates via email"
          checked={settings.email}
          onChange={() => handleToggle('email')}
          disabled={isSaving}
        />
        
        <NotificationToggle
          icon="📱"
          title="SMS Notifications"
          description="Receive updates via SMS"
          checked={settings.sms}
          onChange={() => handleToggle('sms')}
          disabled={isSaving}
        />
        
        <NotificationToggle
          icon="💬"
          title="WhatsApp Notifications"
          description="Receive updates via WhatsApp"
          checked={settings.whatsapp}
          onChange={() => handleToggle('whatsapp')}
          disabled={isSaving}
        />
      </CardContent>
    </Card>
  )
}

interface NotificationToggleProps {
  icon: string
  title: string
  description: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}

function NotificationToggle({ 
  icon, 
  title, 
  description, 
  checked, 
  onChange, 
  disabled 
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-[#2A62A2]"
      />
    </div>
  )
}
```

---

### **8. ContactHub Component**

```tsx
interface ContactHubProps {
  className?: string
}

export function ContactHub({ className }: ContactHubProps) {
  const contactMethods = [
    {
      icon: '📍',
      title: 'Visit Us',
      description: 'Av Moliere 46, Granada, Miguel Hidalgo, 11529 CDMX',
      action: () => window.open('https://maps.google.com/?q=Av+Moliere+46,+Granada,+Miguel+Hidalgo,+11529+Ciudad+de+México,+CDMX'),
    },
    {
      icon: '💬',
      title: 'WhatsApp Direct',
      description: '+52 56 3423 4298',
      action: () => window.open('https://api.whatsapp.com/send/?phone=525634234298'),
    },
    {
      icon: '👥',
      title: 'Club Group',
      description: 'Join our community chat',
      action: () => window.open('https://chat.whatsapp.com/IL8Ho3Zcu9G0KdYuBp1B7K'),
    },
    {
      icon: '📸',
      title: 'Instagram',
      description: '@the_pickle_co',
      action: () => window.open('https://www.instagram.com/the_pickle_co'),
    },
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>📞</span>
          <span>Contact Us</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Get in touch with us
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contactMethods.map((contact, index) => (
            <button
              key={index}
              onClick={contact.action}
              className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-2xl">{contact.icon}</span>
              <div>
                <p className="font-medium text-gray-900">{contact.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {contact.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 🛠️ Utility Components

### **9. AvatarUpload Component**

```tsx
interface AvatarUploadProps {
  src?: string
  initials: string
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
  size: 'small' | 'medium' | 'large'
}

export function AvatarUpload({ 
  src, 
  initials, 
  onUpload, 
  isUploading, 
  size 
}: AvatarUploadProps) {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div className="relative group">
      <div className={cn(
        "relative overflow-hidden bg-[#2A62A2] rounded-full flex items-center justify-center text-white font-semibold",
        sizeClasses[size]
      )}>
        {src ? (
          <img 
            src={src} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={size === 'large' ? 'text-xl' : 'text-sm'}>
            {initials}
          </span>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        )}
      </div>
      
      <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
        <Camera className="w-3 h-3 text-gray-600" />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </label>
    </div>
  )
}
```

### **10. CountryPhoneInput Component**

```tsx
interface CountryPhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CountryPhoneInput({ 
  value, 
  onChange, 
  placeholder = "Phone number" 
}: CountryPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY)
  const [phoneNumber, setPhoneNumber] = useState('')

  useEffect(() => {
    const parsed = parsePhoneNumber(value)
    setSelectedCountry(parsed.country)
    setPhoneNumber(parsed.number)
  }, [value])

  const handlePhoneChange = (number: string) => {
    setPhoneNumber(number)
    const fullPhone = getFullPhoneNumber(selectedCountry, number)
    onChange(fullPhone)
  }

  return (
    <div className="flex">
      <Select
        value={selectedCountry.code}
        onValueChange={(code) => {
          const country = countries.find(c => c.code === code)
          if (country) {
            setSelectedCountry(country)
            const fullPhone = getFullPhoneNumber(country, phoneNumber)
            onChange(fullPhone)
          }
        }}
      >
        <SelectTrigger className="w-24">
          <SelectValue>
            {selectedCountry.flag} {selectedCountry.dialCode}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {countries.map(country => (
            <SelectItem key={country.code} value={country.code}>
              {country.flag} {country.name} {country.dialCode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        value={phoneNumber}
        onChange={(e) => handlePhoneChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-l-none border-l-0"
        type="tel"
      />
    </div>
  )
}
```

---

## 🎨 Styling & Animation Guidelines

### **Design Tokens**
```css
/* Use CSS custom properties for consistency */
:root {
  --radius: 0.75rem;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### **Animation Patterns**
- **Card Hover**: Subtle lift with shadow increase
- **Button States**: Scale and color transitions  
- **Modal Entry**: Fade in with slide up from bottom
- **Loading States**: Skeleton loaders and spinners
- **Success/Error**: Toast notifications with slide in

### **Responsive Breakpoints**
```css
/* Mobile-first approach */
.responsive-grid {
  @apply grid grid-cols-1;
  @media (min-width: 768px) { @apply grid-cols-2; }
  @media (min-width: 1024px) { @apply grid-cols-3; }
}
```

---

## 📱 Mobile Adaptations

### **Touch Interactions**
- Minimum 44px touch targets
- Swipe gestures for cards
- Pull-to-refresh on lists
- Bottom sheet modals

### **Layout Changes**
- Single column on mobile
- Full-width cards
- Sticky headers
- Collapsible sections

### **Performance**
- Lazy load heavy components
- Virtual scrolling for long lists
- Image optimization and lazy loading
- Minimize JavaScript bundle size

---

**These component specifications provide a complete blueprint for implementing the web version while maintaining the exceptional UX of your mobile app. Each component is designed to be responsive, accessible, and performant.**