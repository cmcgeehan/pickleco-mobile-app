# Blog Content Pipeline Design - January 17, 2025

## Project Overview
**Goal:** Semi-automated blog content creation pipeline for SEO and ChatGPT optimization
**Status:** 🟡 DESIGN PHASE
**Architecture:** 3-step process with human oversight at each stage

## Current Infrastructure Analysis

### ✅ Already Available
- **Admin Panel:** Tabbed interface (courts, users, coaches)
- **Blog Storage:** Supabase storage bucket for blog posts
- **Blog Display:** Blog pages with SEO optimization
- **Event Management:** Templates for content creation workflows
- **User Management:** Admin interface patterns

### 🟡 Need to Build
- **Keyword Research Automation**
- **Blog Post Proposal System**
- **AI Content Generation Interface**

## Step 1: Keyword Research Automation

### Components Needed
1. **Google Search Console API Integration**
   - Use existing setup guide from `implementations/google-search-console-setup.md`
   - Fetch real keyword performance data
   - Analyze search volumes and competition

2. **Keyword Analysis Algorithm**
   - Score keywords by relevance to Mexico City pickleball
   - Calculate opportunity score (volume × (1 - competition))
   - Filter for high-potential keywords

3. **Keyword Management Interface**
   - Display ranked keyword list
   - Show search volume, competition, opportunity scores
   - Allow manual filtering and selection

### Technical Implementation
```typescript
// API: /api/seo/keyword-research
interface KeywordData {
  keyword: string
  searchVolume: number
  competition: number
  opportunityScore: number
  relevance: 'high' | 'medium' | 'low'
  category: 'pickleball' | 'padel' | 'tennis' | 'general'
}

// Component: KeywordResearchTab
// - Fetch and display keyword data
// - Allow filtering and selection
// - Export selected keywords for next step
```

## Step 2: Blog Post Proposal System

### Components Needed
1. **Content Strategy Algorithm**
   - Generate blog post ideas based on selected keywords
   - Optimize for both SEO and ChatGPT visibility
   - Consider content calendar and variety

2. **Proposal Management Interface**
   - Display proposed blog post titles and topics
   - Show expected SEO performance metrics
   - Allow editing and approval workflow

3. **Content Calendar Integration**
   - Schedule posts based on keyword seasonality
   - Balance content types (how-to, news, guides)
   - Maintain posting frequency

### Technical Implementation
```typescript
// API: /api/seo/blog-proposals
interface BlogProposal {
  id: string
  title: string
  title_es: string
  targetKeywords: string[]
  seoScore: number
  chatgptScore: number
  estimatedTraffic: number
  contentType: 'how-to' | 'news' | 'guide' | 'list'
  suggestedPublishDate: string
  status: 'proposed' | 'approved' | 'rejected' | 'in-progress'
}

// Component: BlogProposalTab
// - Display proposals with scores
// - Allow editing and approval
// - Track proposal status
```

## Step 3: AI Content Generation

### Components Needed
1. **AI API Integration**
   - OpenAI/Anthropic API for content generation
   - Structured prompts for consistent quality
   - Bilingual content generation (English/Spanish)

2. **Blog Post Editor Interface**
   - Rich text editor for content editing
   - SEO metadata fields
   - Preview functionality
   - Version control

3. **Publishing Workflow**
   - Save to Supabase storage
   - Generate SEO metadata
   - Update sitemap
   - Social media preview

### Technical Implementation
```typescript
// API: /api/seo/generate-content
interface ContentGenerationRequest {
  proposalId: string
  title: string
  targetKeywords: string[]
  contentType: string
  language: 'en' | 'es' | 'both'
}

// Component: BlogPostEditor
// - AI content generation
// - Rich text editing
// - SEO metadata management
// - Publishing workflow
```

## Admin Panel Integration

### New Tab: "Content Pipeline"
Add to existing admin panel structure:
```typescript
// Updated admin-panel.tsx
<TabsList>
  <TabsTrigger value="courts">Courts</TabsTrigger>
  <TabsTrigger value="users">Users</TabsTrigger>
  <TabsTrigger value="coaches">Coaches</TabsTrigger>
  <TabsTrigger value="content">Content Pipeline</TabsTrigger>
</TabsList>

<TabsContent value="content">
  <ContentPipelineTab />
</TabsContent>
```

### Content Pipeline Tab Structure
```typescript
// Component: ContentPipelineTab
<Tabs value={activeStep} onValueChange={setActiveStep}>
  <TabsList>
    <TabsTrigger value="keywords">1. Keyword Research</TabsTrigger>
    <TabsTrigger value="proposals">2. Blog Proposals</TabsTrigger>
    <TabsTrigger value="generation">3. Content Generation</TabsTrigger>
  </TabsList>
  
  <TabsContent value="keywords">
    <KeywordResearchTab />
  </TabsContent>
  
  <TabsContent value="proposals">
    <BlogProposalTab />
  </TabsContent>
  
  <TabsContent value="generation">
    <ContentGenerationTab />
  </TabsContent>
</Tabs>
```

## Database Schema Extensions

### New Tables Needed
```sql
-- Keyword research data
CREATE TABLE seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  competition DECIMAL(3,2),
  opportunity_score DECIMAL(5,2),
  relevance TEXT CHECK (relevance IN ('high', 'medium', 'low')),
  category TEXT CHECK (category IN ('pickleball', 'padel', 'tennis', 'general')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog post proposals
CREATE TABLE blog_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_es TEXT,
  target_keywords TEXT[],
  seo_score DECIMAL(3,2),
  chatgpt_score DECIMAL(3,2),
  estimated_traffic INTEGER,
  content_type TEXT CHECK (content_type IN ('how-to', 'news', 'guide', 'list')),
  suggested_publish_date DATE,
  status TEXT CHECK (status IN ('proposed', 'approved', 'rejected', 'in-progress')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content generation tracking
CREATE TABLE content_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES blog_proposals(id),
  generation_status TEXT CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  ai_provider TEXT,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables Needed
```bash
# Google Search Console API
GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH=/path/to/service-account.json
GOOGLE_SEARCH_CONSOLE_PROPERTY=https://thepickleco.com

# AI Content Generation
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Content Pipeline Settings
CONTENT_GENERATION_PROVIDER=openai  # or anthropic
MAX_TOKENS_PER_GENERATION=4000
CONTENT_GENERATION_TEMPERATURE=0.7
```

## Implementation Phases

### Phase 1: Keyword Research (Week 1)
- [ ] Set up Google Search Console API
- [ ] Create keyword analysis algorithm
- [ ] Build keyword research interface
- [ ] Add keyword management tab

### Phase 2: Blog Proposals (Week 2)
- [ ] Create content strategy algorithm
- [ ] Build proposal management interface
- [ ] Implement proposal approval workflow
- [ ] Add proposal tracking

### Phase 3: Content Generation (Week 3)
- [ ] Set up AI API integration
- [ ] Create blog post editor
- [ ] Implement publishing workflow
- [ ] Add content version control

### Phase 4: Integration & Testing (Week 4)
- [ ] Integrate all components
- [ ] Test end-to-end workflow
- [ ] Optimize performance
- [ ] Deploy to production

## Success Metrics

### Technical Metrics
- Keyword research accuracy: 90%+
- Content generation success rate: 95%+
- Publishing workflow completion: 100%

### Business Metrics
- Blog traffic increase: 200%+ within 3 months
- SEO ranking improvements: Top 10 for target keywords
- ChatGPT visibility: Increased mentions in responses

## Risk Mitigation

### Technical Risks
- **API Rate Limits:** Implement rate limiting and fallback providers
- **Content Quality:** Human review required before publishing
- **SEO Penalties:** Follow best practices, avoid keyword stuffing

### Business Risks
- **Content Relevance:** Regular review of keyword selection
- **Competition:** Monitor competitor content strategies
- **ROI:** Track content performance and adjust strategy

## Next Steps

1. **Approve Design:** Confirm this architecture meets requirements
2. **Set up APIs:** Configure Google Search Console and AI providers
3. **Start Phase 1:** Begin keyword research implementation
4. **Iterate:** Refine based on testing and feedback

---
**Design Complete - Ready for Implementation Approval** 