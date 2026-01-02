const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Blog posts to upload
const blogPosts = [
  'guia-completa-pickleball-principiantes-mexico.json',
  'comunidad-pickleball-cdmx-guia-completa.json',
  'mejores-canchas-pickleball-ciudad-mexico.json',
  'guia-compra-equipo-pickleball-mexico.json',
  'pickleball-familias-ciudad-mexico.json',
  'beneficios-salud-pickleball-adultos-40-plus.json',
  'team-building-corporativo-pickleball-cdmx.json'
]

async function uploadBlogPost(filename) {
  try {
    console.log(`Uploading ${filename}...`)
    
    // Read the file
    const filePath = path.join(__dirname, filename)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('blog-posts')
      .upload(filename, fileContent, {
        contentType: 'application/json',
        upsert: true // This will overwrite if exists
      })
    
    if (error) {
      console.error(`Error uploading ${filename}:`, error)
      return false
    }
    
    console.log(`✅ Successfully uploaded ${filename}`)
    return true
  } catch (error) {
    console.error(`Failed to upload ${filename}:`, error)
    return false
  }
}

async function uploadAllPosts() {
  console.log('Starting blog post uploads to Supabase...')
  
  let successCount = 0
  let totalCount = blogPosts.length
  
  for (const filename of blogPosts) {
    const success = await uploadBlogPost(filename)
    if (success) {
      successCount++
    }
    
    // Add a small delay between uploads
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`\nUpload Summary:`)
  console.log(`✅ Successful: ${successCount}/${totalCount}`)
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`)
  
  if (successCount === totalCount) {
    console.log('🎉 All blog posts uploaded successfully!')
  } else {
    console.log('⚠️  Some uploads failed. Check the errors above.')
  }
}

// Run the upload
uploadAllPosts().catch(console.error)